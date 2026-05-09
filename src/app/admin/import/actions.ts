"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { csvToRecords } from "@/lib/csv";

const parentRowSchema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72).optional(),
});

const studentRowSchema = z.object({
  full_name: z.string().min(1).max(120),
  age: z.string().optional(),
  class_name: z.string().optional(),
  parent_email: z.string().email().optional(),
});

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

export async function importParentsCsv(
  _prev: unknown,
  formData: FormData,
): Promise<{ result?: ImportResult; error?: string }> {
  const admin = await requireRole("admin");
  const t = await getTranslations("import");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { error: t("noFile") };
  if (file.size > 1 * 1024 * 1024) return { error: t("tooLarge") };

  const text = await file.text();
  const { rows } = csvToRecords(text);
  if (rows.length === 0) return { error: t("emptyCsv") };

  const supabase = createAdminClient();
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +1 for 0-index, +1 for header line
    const parsed = parentRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      result.errors.push({ row: rowNum, message: t("rowInvalid") });
      continue;
    }

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", parsed.data.email)
      .maybeSingle();
    if (existing) {
      result.skipped++;
      continue;
    }

    const password =
      parsed.data.password ??
      Math.random().toString(36).slice(-10) + "Aa1!";

    const { data: created, error: authErr } =
      await supabase.auth.admin.createUser({
        email: parsed.data.email,
        password,
        email_confirm: true,
      });
    if (authErr || !created.user) {
      result.errors.push({
        row: rowNum,
        message: authErr?.message ?? "auth error",
      });
      continue;
    }

    const { error: profileErr } = await supabase.from("users").insert({
      id: created.user.id,
      email: parsed.data.email,
      full_name: parsed.data.full_name,
      role: "parent",
      center_id: admin.center_id,
    });
    if (profileErr) {
      await supabase.auth.admin.deleteUser(created.user.id);
      result.errors.push({ row: rowNum, message: profileErr.message });
      continue;
    }

    result.imported++;
  }

  revalidatePath("/admin/parents");
  revalidatePath("/admin/students");
  revalidatePath("/admin");
  return { result };
}

export async function importStudentsCsv(
  _prev: unknown,
  formData: FormData,
): Promise<{ result?: ImportResult; error?: string }> {
  const admin = await requireRole("admin");
  const t = await getTranslations("import");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { error: t("noFile") };
  if (file.size > 1 * 1024 * 1024) return { error: t("tooLarge") };

  const text = await file.text();
  const { rows } = csvToRecords(text);
  if (rows.length === 0) return { error: t("emptyCsv") };

  const supabase = createAdminClient();

  // Fetch all classes + parents in this center once for the lookup map.
  const [{ data: classes }, { data: parents }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name")
      .eq("center_id", admin.center_id),
    supabase
      .from("users")
      .select("id, email")
      .eq("center_id", admin.center_id)
      .eq("role", "parent"),
  ]);

  const classByName = new Map(
    (classes ?? []).map((c) => [c.name.toLowerCase(), c.id]),
  );
  const parentByEmail = new Map(
    (parents ?? []).map((p) => [p.email.toLowerCase(), p.id]),
  );

  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const parsed = studentRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      result.errors.push({ row: rowNum, message: t("rowInvalid") });
      continue;
    }

    const ageNum =
      parsed.data.age && /^\d+$/.test(parsed.data.age)
        ? Number(parsed.data.age)
        : null;
    const classId = parsed.data.class_name
      ? classByName.get(parsed.data.class_name.toLowerCase())
      : null;
    if (parsed.data.class_name && !classId) {
      result.errors.push({
        row: rowNum,
        message: t("classNotFound", { name: parsed.data.class_name }),
      });
      continue;
    }
    const parentId = parsed.data.parent_email
      ? parentByEmail.get(parsed.data.parent_email.toLowerCase())
      : null;
    if (parsed.data.parent_email && !parentId) {
      result.errors.push({
        row: rowNum,
        message: t("parentNotFound", { email: parsed.data.parent_email }),
      });
      continue;
    }

    const { error } = await supabase.from("students").insert({
      center_id: admin.center_id,
      full_name: parsed.data.full_name,
      age: ageNum,
      class_id: classId ?? null,
      parent_user_id: parentId ?? null,
    });
    if (error) {
      result.errors.push({ row: rowNum, message: error.message });
      continue;
    }
    result.imported++;
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin");
  return { result };
}
