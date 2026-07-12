"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import * as Sentry from "@sentry/nextjs";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoUser } from "@/lib/demo-guard";
import { normalizeVnPhone, syntheticEmailForPhone } from "@/lib/phone";
import { generateTempPassword } from "@/lib/temp-password";

// Phone is now the primary identifier (Vietnam — Zalo is phone-keyed,
// most parents don't have / don't share email). Email is truly optional
// and only validated for shape when the field has a value. Zod's
// combined validation can get clunky for i18n'd errors, so we keep both
// fields optional at the schema layer and enforce phone-required +
// email-format-if-present in code below.
const inviteSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  full_name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(72),
});

export async function inviteParent(_prev: unknown, formData: FormData) {
  const admin = await requireRole("admin");
  const t = await getTranslations("admin.parents");
  const tt = await getTranslations("admin.teachers");
  const tc = await getTranslations("common");
  const tco = await getTranslations("contact");
  if (isDemoUser(admin)) return { error: tc("demoReadOnly") };

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    phone: formData.get("phone"),
    full_name: formData.get("full_name"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: tt("validation") };

  const rawEmail = (parsed.data.email ?? "").trim().toLowerCase();
  const rawPhone = (parsed.data.phone ?? "").trim();

  // Phone is required — it's the primary login identifier.
  if (!rawPhone) {
    return { error: tco("phoneRequiredError") };
  }

  // Normalize + validate phone.
  const phone = normalizeVnPhone(rawPhone);
  if (!phone) return { error: tco("invalidPhone") };

  // Email: validate shape only if provided.
  let email: string | null = null;
  if (rawEmail) {
    if (!z.string().email().safeParse(rawEmail).success) {
      return { error: tco("invalidEmail") };
    }
    email = rawEmail;
  }

  const supabase = createAdminClient();

  // Per-center uniqueness pre-check. The DB enforces this too via
  // partial unique indexes, but we precheck so the admin sees a
  // friendly "this email/phone is already used" message rather than a
  // Supabase auth error or DB constraint code.
  if (email) {
    const dup = await supabase
      .from("users")
      .select("id")
      .eq("center_id", admin.center_id)
      .ilike("email", email)
      .maybeSingle();
    if (dup.data) return { error: tco("emailAlreadyUsed") };
  }
  if (phone) {
    const dup = await supabase
      .from("users")
      .select("id")
      .eq("center_id", admin.center_id)
      .eq("phone", phone)
      .maybeSingle();
    if (dup.data) return { error: tco("phoneAlreadyUsed") };
  }

  // Determine Supabase Auth email: the real one if provided, else a
  // synthetic one tied to the phone so auth.admin.createUser succeeds
  // without an SMS provider. See db/users-phone.sql for the why.
  // Phone is guaranteed non-null above.
  const authEmail = email ?? syntheticEmailForPhone(phone);

  const { data: created, error: authErr } = await supabase.auth.admin.createUser({
    email: authEmail,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (authErr) {
    // Special case: phone-only account whose synthetic email collides
    // with one already in auth.users (the same phone has a phone-only
    // account at another center). Surface a clearer error so the admin
    // understands the conflict isn't about THIS center's records.
    if (
      !email &&
      /already.*registered|already.*used|duplicate/i.test(authErr.message)
    ) {
      return { error: tco("phoneTakenAnotherCenter") };
    }
    return { error: tt("createUserError", { message: authErr.message }) };
  }

  const { error: profileErr } = await supabase.from("users").insert({
    id: created.user!.id,
    email,
    phone,
    full_name: parsed.data.full_name,
    role: "parent",
    center_id: admin.center_id,
  });
  if (profileErr) {
    const { error: rollbackErr } = await supabase.auth.admin.deleteUser(
      created.user!.id,
    );
    if (rollbackErr) Sentry.captureException(rollbackErr);
    return { error: t("saveProfileError", { message: profileErr.message }) };
  }

  revalidatePath("/admin/parents");
  revalidatePath("/admin/students");
  return { success: t("addedHint", { name: parsed.data.full_name }) };
}

export async function removeParent(
  formData: FormData,
): Promise<{ error?: string } | void> {
  const admin = await requireRole("admin");
  const tc = await getTranslations("common");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: tc("notAllowed") };
  if (isDemoUser(admin)) return { error: tc("demoReadOnly") };

  const supabase = createAdminClient();

  const { data: target } = await supabase
    .from("users")
    .select("id, center_id, role")
    .eq("id", id)
    .single();

  if (
    !target ||
    target.center_id !== admin.center_id ||
    target.role !== "parent"
  ) {
    return { error: tc("notAllowed") };
  }

  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return { error: tc("deleteFailed", { message: error.message }) };
  revalidatePath("/admin/parents");
  revalidatePath("/admin/students");
}

/**
 * Admin-initiated password reset for a parent. Most parents are phone-only
 * (no email), so they can't use the email reset link. This sets a fresh
 * temporary password and returns it ONCE for the admin to relay (e.g. over
 * Zalo); the parent can change it later from their profile.
 */
export async function resetParentPassword(_prev: unknown, formData: FormData) {
  const admin = await requireRole("admin");
  const t = await getTranslations("admin.parents");
  const tc = await getTranslations("common");
  if (isDemoUser(admin)) return { error: tc("demoReadOnly") };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: t("resetError", { message: "missing id" }) };

  const supabase = createAdminClient();

  // Verify the target is a parent in THIS admin's center before touching auth.
  const { data: target } = await supabase
    .from("users")
    .select("id, center_id, role, full_name")
    .eq("id", id)
    .single();
  if (
    !target ||
    target.center_id !== admin.center_id ||
    target.role !== "parent"
  ) {
    return { error: t("resetError", { message: "not found" }) };
  }

  const tempPassword = generateTempPassword();
  const { error } = await supabase.auth.admin.updateUserById(id, {
    password: tempPassword,
  });
  if (error) return { error: t("resetError", { message: error.message }) };

  return { tempPassword, name: target.full_name };
}
