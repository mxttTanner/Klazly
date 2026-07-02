"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import * as Sentry from "@sentry/nextjs";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoUser } from "@/lib/demo-guard";
import { csvToRecords } from "@/lib/csv";
import { normalizeVnPhone, syntheticEmailForPhone } from "@/lib/phone";

// Generates a 14-char one-time password using crypto.randomBytes.
// Uses url-safe base64 (A-Z a-z 0-9 - _) so the entropy is ~83 bits,
// then suffixes "Aa1!" to satisfy any auth policy that demands an
// upper / lower / digit / symbol mix. The parent is expected to
// reset it on first login.
function generateTempPassword(): string {
  return randomBytes(12).toString("base64url").slice(0, 14) + "Aa1!";
}

// Parent rows now accept email and/or phone — at least one required.
// CSV cells come in as "" not undefined when blank so .optional() alone
// doesn't bypass .email() validation; preprocess empties to undefined.
const parentRowSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .email()
      .transform((s) => s.trim().toLowerCase())
      .optional(),
  ),
  phone: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().optional(),
  ),
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

// Cap the data rows processed per import. Each parent row runs a sequential
// auth.admin.createUser + profile insert, so a few hundred rows can blow past
// Vercel's function timeout mid-loop — stranding half-created parents whose
// one-time passwords are returned to nobody, and which a re-upload then skips
// as "existing". Reject oversized files up front (before creating anything)
// rather than time out partway through. Same cap applies to student imports.
const MAX_IMPORT_ROWS = 200;

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
  /** Auto-generated passwords for parents that left the password column blank.
      Admin must capture these before navigating away — they're not recoverable.
      `email` carries whichever contact method exists (real email or phone). */
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
  // Reject before creating any users so an oversized file can't time out
  // mid-loop and strand parents (see MAX_IMPORT_ROWS).
  if (rows.length > MAX_IMPORT_ROWS)
    return { error: t("tooManyRows", { max: MAX_IMPORT_ROWS }) };

  const supabase = createAdminClient();
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  // Track contact identifiers (email + phone) already seen in THIS file
  // so a duplicated row doesn't slip through as a generic auth error.
  // Map identifier → row number for a clearer message.
  const seenIdentifierRow = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +1 for 0-index, +1 for header line
    const parsed = parentRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      result.errors.push({ row: rowNum, message: t("rowInvalid") });
      continue;
    }

    const rawEmail = parsed.data.email ?? null;
    const rawPhone = parsed.data.phone ?? null;

    // Phone is required per row (primary login identifier). Email
    // is optional. Previous policy was "at least one of email/phone"
    // which let email-only rows through; that ages badly in VN where
    // the email column is mostly empty in practice.
    if (!rawPhone) {
      result.errors.push({ row: rowNum, message: t("rowMissingPhone") });
      continue;
    }

    // Normalize phone (canonical +84…) and reject malformed VN mobile
    // numbers with a clear per-row error rather than a generic auth fail.
    const phone = normalizeVnPhone(rawPhone);
    if (!phone) {
      result.errors.push({ row: rowNum, message: t("rowInvalidPhone") });
      continue;
    }

    // Check for in-file duplicates on either email or phone.
    if (rawEmail) {
      const dup = seenIdentifierRow.get(`email:${rawEmail}`);
      if (dup !== undefined) {
        result.errors.push({
          row: rowNum,
          message: t("duplicateInFile", { row: dup }),
        });
        continue;
      }
    }
    if (phone) {
      const dup = seenIdentifierRow.get(`phone:${phone}`);
      if (dup !== undefined) {
        result.errors.push({
          row: rowNum,
          message: t("duplicateInFile", { row: dup }),
        });
        continue;
      }
    }

    // Skip if a user with this email or phone already exists in this
    // center.
    let existingHit = false;
    if (rawEmail) {
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("center_id", admin.center_id)
        .ilike("email", rawEmail)
        .maybeSingle();
      if (existing) existingHit = true;
    }
    if (!existingHit && phone) {
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("center_id", admin.center_id)
        .eq("phone", phone)
        .maybeSingle();
      if (existing) existingHit = true;
    }
    if (existingHit) {
      result.skipped++;
      continue;
    }

    if (rawEmail) seenIdentifierRow.set(`email:${rawEmail}`, rowNum);
    if (phone) seenIdentifierRow.set(`phone:${phone}`, rowNum);

    const passwordWasGenerated = !parsed.data.password;
    const password = parsed.data.password ?? generateTempPassword();

    // Auth email is the real one if provided; otherwise the deterministic
    // synthetic email tied to phone. See db/users-phone.sql.
    // Phone is guaranteed non-null above (phone-required policy).
    const authEmail = rawEmail ?? syntheticEmailForPhone(phone);

    const { data: created, error: authErr } =
      await supabase.auth.admin.createUser({
        email: authEmail,
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

    const profileBase = {
      id: created.user.id,
      email: rawEmail,
      phone,
      full_name: parsed.data.full_name,
      role: "parent",
      center_id: admin.center_id,
    };
    // Force a password change on first login when WE generated the temp
    // password (it may have travelled over Zalo/paper). Fall back if the
    // must_change_password column hasn't been migrated yet.
    let { error: profileErr } = await supabase.from("users").insert({
      ...profileBase,
      must_change_password: passwordWasGenerated,
    });
    if (profileErr && /must_change_password/i.test(profileErr.message)) {
      const retry = await supabase.from("users").insert(profileBase);
      profileErr = retry.error;
    }
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
        // Show the phone — the primary identifier under the new
        // phone-first policy. Field name stays 'email' so the
        // existing renderer doesn't churn; rename is a future cleanup.
        email: phone,
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
  // Same up-front cap as the parent importer (see MAX_IMPORT_ROWS).
  if (rows.length > MAX_IMPORT_ROWS)
    return { error: t("tooManyRows", { max: MAX_IMPORT_ROWS }) };

  const supabase = createAdminClient();

  // Fetch all classes + parents + existing students in this center once for
  // the lookup maps. Students are fetched here so the import is idempotent —
  // a re-uploaded roster skips rows already in the DB instead of duplicating.
  const [{ data: classes }, { data: parents }, { data: students }] =
    await Promise.all([
      supabase
        .from("classes")
        .select("id, name")
        .eq("center_id", admin.center_id),
      supabase
        .from("users")
        .select("id, email, phone")
        .eq("center_id", admin.center_id)
        .eq("role", "parent"),
      supabase
        .from("students")
        .select("full_name, class_id")
        .eq("center_id", admin.center_id),
    ]);

  const classByName = new Map(
    (classes ?? []).map((c) => [c.name.toLowerCase(), c.id]),
  );
  // Parent lookup accepts either email or phone in the CSV's
  // parent_email column. Skip parents with neither (shouldn't happen
  // given the users_email_or_phone_required CHECK, but defensive).
  const parentByContact = new Map<string, string>();
  type ParentRow = { id: string; email: string | null; phone: string | null };
  for (const p of (parents ?? []) as ParentRow[]) {
    if (p.email) parentByContact.set(p.email.toLowerCase(), p.id);
    if (p.phone) parentByContact.set(p.phone, p.id);
  }

  // De-dupe students by (center_id, full_name, class_id). center_id is fixed
  // for this import, so the composite key is just full_name + class_id.
  // Names are lower-cased/trimmed so case-only variants still match.
  const studentKey = (fullName: string, classId: string | null) =>
    `${fullName.trim().toLowerCase()}::${classId ?? ""}`;
  type StudentRow = { full_name: string; class_id: string | null };
  const existingStudentKeys = new Set(
    ((students ?? []) as StudentRow[]).map((s) =>
      studentKey(s.full_name, s.class_id),
    ),
  );
  // Track keys already seen in THIS file so a duplicated row doesn't insert
  // twice. Map key → row number for a clearer message (mirrors parents).
  const seenStudentRow = new Map<string, number>();

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
    // parent_email column accepts email or phone (normalized) so the
    // admin can reference parents however they were created.
    let parentId: string | null = null;
    if (parsed.data.parent_email) {
      const raw = parsed.data.parent_email.trim();
      if (raw.includes("@")) {
        parentId = parentByContact.get(raw.toLowerCase()) ?? null;
      } else {
        const normalized = normalizeVnPhone(raw);
        if (normalized) parentId = parentByContact.get(normalized) ?? null;
      }
    }
    if (parsed.data.parent_email && !parentId) {
      result.errors.push({
        row: rowNum,
        message: t("parentNotFound", { email: parsed.data.parent_email }),
      });
      continue;
    }

    // Idempotency: skip in-file repeats (reported as a row error) and rows
    // that already exist in the DB (counted as skipped), mirroring parents.
    const dedupeKey = studentKey(parsed.data.full_name, classId ?? null);
    const dupRow = seenStudentRow.get(dedupeKey);
    if (dupRow !== undefined) {
      result.errors.push({
        row: rowNum,
        message: t("duplicateStudentInFile", { row: dupRow }),
      });
      continue;
    }
    if (existingStudentKeys.has(dedupeKey)) {
      result.skipped++;
      continue;
    }
    seenStudentRow.set(dedupeKey, rowNum);

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
