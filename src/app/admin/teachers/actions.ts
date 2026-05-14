"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import * as Sentry from "@sentry/nextjs";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoUser } from "@/lib/demo-guard";
import { normalizeVnPhone, syntheticEmailForPhone } from "@/lib/phone";

const inviteSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  full_name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(72),
});

export async function inviteTeacher(_prev: unknown, formData: FormData) {
  const admin = await requireRole("admin");
  const t = await getTranslations("admin.teachers");
  const tc = await getTranslations("common");
  const tco = await getTranslations("contact");
  if (isDemoUser(admin)) return { error: tc("demoReadOnly") };

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    phone: formData.get("phone"),
    full_name: formData.get("full_name"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: t("validation") };

  const rawEmail = (parsed.data.email ?? "").trim().toLowerCase();
  const rawPhone = (parsed.data.phone ?? "").trim();

  if (!rawEmail && !rawPhone) return { error: tco("required") };

  let email: string | null = null;
  if (rawEmail) {
    if (!z.string().email().safeParse(rawEmail).success) {
      return { error: tco("invalidEmail") };
    }
    email = rawEmail;
  }

  let phone: string | null = null;
  if (rawPhone) {
    phone = normalizeVnPhone(rawPhone);
    if (!phone) return { error: tco("invalidPhone") };
  }

  const supabase = createAdminClient();

  // Per-center uniqueness pre-checks for a friendly error message.
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

  const authEmail = email ?? syntheticEmailForPhone(phone!);

  const { data: created, error: authErr } = await supabase.auth.admin.createUser({
    email: authEmail,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (authErr) {
    return { error: t("createUserError", { message: authErr.message }) };
  }

  const { error: profileErr } = await supabase.from("users").insert({
    id: created.user!.id,
    email,
    phone,
    full_name: parsed.data.full_name,
    role: "teacher",
    center_id: admin.center_id,
  });
  if (profileErr) {
    const { error: rollbackErr } = await supabase.auth.admin.deleteUser(
      created.user!.id,
    );
    if (rollbackErr) Sentry.captureException(rollbackErr);
    return {
      error: t("saveProfileError", { message: profileErr.message }),
    };
  }

  revalidatePath("/admin/teachers");
  revalidatePath("/admin");
  return { success: t("addedHint", { name: parsed.data.full_name }) };
}

export async function removeTeacher(formData: FormData) {
  const admin = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  if (isDemoUser(admin)) return;

  const supabase = createAdminClient();

  const { data: target } = await supabase
    .from("users")
    .select("id, center_id, role")
    .eq("id", id)
    .single();

  if (
    !target ||
    target.center_id !== admin.center_id ||
    target.role !== "teacher"
  ) {
    return;
  }

  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) throw new Error(`removeTeacher failed: ${error.message}`);
  revalidatePath("/admin/teachers");
  revalidatePath("/admin");
}
