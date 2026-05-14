"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import * as Sentry from "@sentry/nextjs";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoUser } from "@/lib/demo-guard";

const inviteSchema = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  full_name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(72),
});

export async function inviteParent(_prev: unknown, formData: FormData) {
  const admin = await requireRole("admin");
  const t = await getTranslations("admin.parents");
  const tt = await getTranslations("admin.teachers");
  const tc = await getTranslations("common");
  if (isDemoUser(admin)) return { error: tc("demoReadOnly") };

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: tt("validation") };

  const supabase = createAdminClient();

  const { data: created, error: authErr } = await supabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (authErr) {
    return { error: tt("createUserError", { message: authErr.message }) };
  }

  const { error: profileErr } = await supabase.from("users").insert({
    id: created.user!.id,
    email: parsed.data.email,
    full_name: parsed.data.full_name,
    role: "parent",
    center_id: admin.center_id,
  });
  if (profileErr) {
    const { error: rollbackErr } = await supabase.auth.admin.deleteUser(
      created.user!.id,
    );
    // Surface the original profile error; the rollback is best-effort.
    // If it fails we've leaked an orphan auth.users row — log it so we can
    // clean up manually, but don't override the admin's error message.
    if (rollbackErr) Sentry.captureException(rollbackErr);
    return { error: t("saveProfileError", { message: profileErr.message }) };
  }

  revalidatePath("/admin/parents");
  revalidatePath("/admin/students");
  return { success: t("addedHint", { name: parsed.data.full_name }) };
}

export async function removeParent(formData: FormData) {
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
    target.role !== "parent"
  ) {
    return;
  }

  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) throw new Error(`removeParent failed: ${error.message}`);
  revalidatePath("/admin/parents");
  revalidatePath("/admin/students");
}
