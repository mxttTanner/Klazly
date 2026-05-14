"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import * as Sentry from "@sentry/nextjs";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoUser } from "@/lib/demo-guard";
import { csvToRecords } from "@/lib/csv";

const parentRowSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  password: z.string().min(8).max(72).optional(),
});

const studentRowSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  age: z.string().optional(),
  class_name: z.string().trim().optional(),
  // CSV cells come in as "" not undefined when blank, so .optional() alone
  // won't bypass .email(). Preprocess empty/whitespace to undefined.
  parent_email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .email()
      .transform((s) => s.trim().toLowerCase())
      .optional(),
  ),
});

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
  /** Auto-generated passwords for parents that left the password column blank.
      Admin must capture these before navigating away — they're not recoverable. */
  generated?: { email: string; full_name: string; password: string }[];
};

export async function importParentsCsv(
  _prev: unknown,
  formData: FormData,
): Promise<{ result?: ImportResult; error?: string }> {
  const admin = await requireRole("admin");
  const t = await getTranslations("import");
  const tc = await getTranslations("common");
  if (isDemoUser(admin)) return { error: tc("demoReadOnly") };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { error: t("noFile") };
  if (file.size > 1 * 1024 * 1024) return { error: t("tooLarge") };

  const text = await file.text();
  const { rows } = csvToRecords(text);
  if (rows.length === 0) return { error: t("emptyCsv") };

  const supabase = createAdminClient();
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  // Track emails we've already seen in THIS file so a duplicated row
  // doesn't slip through as a generic Supabase auth error ("User already
  // registered") — that error reads like "the parent already exists in
  // the system" when in fact the admin just listed them twice in the
  // CSV. Map email → row number for a clearer message.
  const seenEmailRow = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +1 for 0-index, +1 for header line
    const parsed = parentRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      result.errors.push({ row: rowNum, message: t("rowInvalid") });
      continue;
    }

    const dupRow = seenEmailRow.get(parsed.data.email);
    if (dupRow !== undefined) {
      result.errors.push({
        row: rowNum,
        message: t("duplicateInFile", { row: dupRow }),
      });
      continue;
    }
    seenEmailRow.set(parsed.data.email, rowNum);

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", parsed.data.email)
      .maybeSingle();
    if (existing) {
      result.skipped++;
      continue;
    }

    const passwordWasGenerated = !parsed.data.password;
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
      const { error: rollbackErr } = await supabase.auth.admin.deleteUser(
        created.user.id,
      );
      if (rollbackErr) Sentry.captureException(rollbackErr);
      result.errors.push({ row: rowNum, message: profileErr.message });
      continue;
    }

    if (passwordWasGenerated) {
      (result.generated ??= []).push({
        email: parsed.data.email,
        full_name: parsed.data.full_name,
        password,
      });
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
  const tc = await getTranslations("common");
  if (isDemoUser(admin)) return { error: tc("demoReadOnly") };

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
