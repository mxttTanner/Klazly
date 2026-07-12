"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import * as Sentry from "@sentry/nextjs";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoUser } from "@/lib/demo-guard";
import { invalidStudentIds, ymdDateSchema } from "@/lib/action-validation";

const ALLOWED_WORKSHEET_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];
const MAX_WORKSHEET_BYTES = 5 * 1024 * 1024;

async function maybeUploadInlineWorksheet(
  formData: FormData,
  centerId: string,
  uploaderId: string,
  errors: { tooLarge: string; badType: string },
): Promise<{ id: string | null; error?: string }> {
  const file = formData.get("worksheet_file");
  if (!(file instanceof File) || file.size === 0) return { id: null };

  if (file.size > MAX_WORKSHEET_BYTES) {
    return { id: null, error: errors.tooLarge };
  }
  if (!ALLOWED_WORKSHEET_TYPES.includes(file.type)) {
    return { id: null, error: errors.badType };
  }

  const supabase = createAdminClient();
  const ext =
    file.type === "application/pdf"
      ? "pdf"
      : file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/png"
          ? "png"
          : "webp";
  const fileId = crypto.randomUUID();
  const storagePath = `${centerId}/${fileId}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("worksheets")
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600",
    });
  if (uploadErr) return { id: null, error: uploadErr.message };

  // Bucket is private; files are served via signed URLs (see lib/worksheets.ts).
  const { data: inserted, error: insertErr } = await supabase
    .from("worksheets")
    .insert({
      center_id: centerId,
      uploaded_by: uploaderId,
      name: file.name,
      storage_path: storagePath,
      file_type: file.type,
      size_bytes: file.size,
    })
    .select("id")
    .single();
  if (insertErr || !inserted) {
    await supabase.storage.from("worksheets").remove([storagePath]);
    return { id: null, error: insertErr?.message ?? "insert failed" };
  }
  return { id: inserted.id };
}

const templateSchema = z.object({
  name: z.string().min(1).max(120),
  vocabulary: z.string().max(1000).optional().nullable(),
  grammar_point: z.string().max(1000).optional().nullable(),
  speaking_activity: z.string().max(1000).optional().nullable(),
  homework: z.string().max(1000).optional().nullable(),
  general_note: z.string().max(2000).optional().nullable(),
});

function nullableString(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

export async function saveLessonTemplate(_prev: unknown, formData: FormData) {
  const user = await requireRole(["teacher", "admin"]);
  const t = await getTranslations("teacher.templates");
  const tc = await getTranslations("common");
  if (isDemoUser(user)) return { error: tc("demoReadOnly") };

  const parsed = templateSchema.safeParse({
    name: formData.get("template_name"),
    vocabulary: nullableString(formData.get("vocabulary")),
    grammar_point: nullableString(formData.get("grammar_point")),
    speaking_activity: nullableString(formData.get("speaking_activity")),
    homework: nullableString(formData.get("homework")),
    general_note: nullableString(formData.get("general_note")),
  });
  if (!parsed.success) return { error: t("validation") };

  const supabase = await createClient();
  const { error } = await supabase.from("lesson_templates").insert({
    center_id: user.center_id,
    created_by: user.id,
    name: parsed.data.name,
    vocabulary: parsed.data.vocabulary,
    grammar_point: parsed.data.grammar_point,
    speaking_activity: parsed.data.speaking_activity,
    homework: parsed.data.homework,
    general_note: parsed.data.general_note,
  });
  if (error) return { error: t("saveError", { message: error.message }) };

  revalidatePath(`/teacher/classes`, "layout");
  return { success: t("saveSuccess", { name: parsed.data.name }) };
}

const studentUpdateSchema = z.object({
  student_id: z.string().uuid(),
  behavior_rating: z
    .enum(["great", "good", "okay", "needs_attention"])
    .optional()
    .nullable(),
  individual_note: z.string().max(500).optional().nullable(),
  homework_completed: z.boolean(),
  attendance: z.enum(["present", "absent", "late"]).optional().nullable(),
});

const lessonSchema = z.object({
  class_id: z.string().uuid(),
  lesson_date: ymdDateSchema,
  unit: z.string().max(80).optional().nullable(),
  lesson_number: z.string().max(80).optional().nullable(),
  topic: z.string().max(120).optional().nullable(),
  vocabulary: z.string().max(1000).optional().nullable(),
  grammar_point: z.string().max(1000).optional().nullable(),
  speaking_activity: z.string().max(1000).optional().nullable(),
  homework: z.string().max(1000).optional().nullable(),
  general_note: z.string().max(2000).optional().nullable(),
  updates: z.array(studentUpdateSchema).min(1),
});

// A picked worksheet_id must be a real UUID that belongs to the caller's
// center — never trust the raw form value (it could point at another
// center's worksheet). Returns the validated id, or an error marker.
async function verifyPickedWorksheet(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rawId: string,
  centerId: string,
): Promise<{ id: string } | { error: "invalid" }> {
  if (!z.string().uuid().safeParse(rawId).success) return { error: "invalid" };
  const { data } = await supabase
    .from("worksheets")
    .select("id")
    .eq("id", rawId)
    .eq("center_id", centerId)
    .maybeSingle();
  if (!data) return { error: "invalid" };
  return { id: data.id };
}

function buildUpdates(formData: FormData) {
  const studentIds = formData.getAll("student_id").map(String);
  return studentIds.map((sid) => {
    const ratingRaw = String(formData.get(`behavior_${sid}`) ?? "");
    const noteRaw = formData.get(`note_${sid}`);
    const hwDone = formData.get(`homework_${sid}`) === "on";
    const attendanceRaw = String(formData.get(`attendance_${sid}`) ?? "");
    return {
      student_id: sid,
      behavior_rating:
        ratingRaw && ratingRaw !== "none"
          ? (ratingRaw as "great" | "good" | "okay" | "needs_attention")
          : null,
      individual_note: nullableString(noteRaw),
      homework_completed: hwDone,
      attendance:
        attendanceRaw && attendanceRaw !== "none"
          ? (attendanceRaw as "present" | "absent" | "late")
          : null,
    };
  });
}

export async function createLesson(_prev: unknown, formData: FormData) {
  const user = await requireRole(["teacher", "admin"]);
  const t = await getTranslations("teacher.lessonForm");
  const tc = await getTranslations("common");
  if (isDemoUser(user)) return { error: tc("demoReadOnly") };

  const class_id = String(formData.get("class_id") ?? "");
  const updates = buildUpdates(formData);

  const parsed = lessonSchema.safeParse({
    class_id,
    lesson_date: formData.get("lesson_date"),
    unit: nullableString(formData.get("unit")),
    lesson_number: nullableString(formData.get("lesson_number")),
    topic: nullableString(formData.get("topic")),
    vocabulary: nullableString(formData.get("vocabulary")),
    grammar_point: nullableString(formData.get("grammar_point")),
    speaking_activity: nullableString(formData.get("speaking_activity")),
    homework: nullableString(formData.get("homework")),
    general_note: nullableString(formData.get("general_note")),
    updates,
  });

  if (!parsed.success) return { error: t("validation") };

  const supabase = await createClient();

  const { data: cls } = await supabase
    .from("classes")
    .select("id, teacher_id, center_id")
    .eq("id", parsed.data.class_id)
    .single();
  if (!cls || cls.center_id !== user.center_id) {
    return { error: t("noPermission") };
  }
  if (user.role === "teacher" && cls.teacher_id !== user.id) {
    return { error: t("noPermission") };
  }

  // Reject any per-student row whose student isn't on this class's roster.
  const bad = await invalidStudentIds(
    supabase,
    parsed.data.class_id,
    parsed.data.updates.map((u) => u.student_id),
  );
  if (bad.length > 0) return { error: t("validation") };

  let worksheetId: string | null = null;
  const pickedRaw = String(formData.get("worksheet_id") ?? "");
  if (pickedRaw && pickedRaw !== "none") {
    const verified = await verifyPickedWorksheet(
      supabase,
      pickedRaw,
      user.center_id,
    );
    if ("error" in verified) return { error: t("validation") };
    worksheetId = verified.id;
  } else {
    const tw = await getTranslations("worksheets");
    const uploaded = await maybeUploadInlineWorksheet(
      formData,
      user.center_id,
      user.id,
      { tooLarge: tw("tooLarge"), badType: tw("badType") },
    );
    if (uploaded.error) {
      return { error: t("saveLessonError", { message: uploaded.error }) };
    }
    worksheetId = uploaded.id;
  }

  // When admin records the lesson on behalf of a teacher, attribute it to
  // the class's assigned teacher; fall back to the admin's own id only if
  // the class has no teacher yet.
  const lessonTeacherId =
    user.role === "admin" ? cls.teacher_id ?? user.id : user.id;

  // Try insert with topic; if the column doesn't exist (migration not run),
  // retry without topic so the rest of the lesson still saves.
  const baseInsert = {
    class_id: parsed.data.class_id,
    teacher_id: lessonTeacherId,
    lesson_date: parsed.data.lesson_date,
    unit: parsed.data.unit,
    lesson_number: parsed.data.lesson_number,
    vocabulary: parsed.data.vocabulary,
    grammar_point: parsed.data.grammar_point,
    speaking_activity: parsed.data.speaking_activity,
    homework: parsed.data.homework,
    general_note: parsed.data.general_note,
    worksheet_id: worksheetId,
  };
  let { data: lesson, error: lErr } = await supabase
    .from("lessons")
    .insert({ ...baseInsert, topic: parsed.data.topic })
    .select()
    .single();
  if (lErr && /topic/i.test(lErr.message)) {
    const retry = await supabase
      .from("lessons")
      .insert(baseInsert)
      .select()
      .single();
    lesson = retry.data;
    lErr = retry.error;
  }
  if (lErr || !lesson) {
    // The unique (class_id, lesson_date) index is the double-submit
    // backstop; surface it as a friendly "edit the existing lesson"
    // hint instead of a raw Postgres constraint error.
    if (lErr && /lessons_class_date_uniq/i.test(lErr.message)) {
      return { error: t("duplicateDate") };
    }
    return { error: t("saveLessonError", { message: lErr?.message ?? "" }) };
  }

  const updateRows = parsed.data.updates.map((u) => ({
    lesson_id: lesson.id,
    student_id: u.student_id,
    behavior_rating: u.behavior_rating,
    individual_note: u.individual_note,
    homework_completed: u.homework_completed,
    attendance: u.attendance,
  }));

  let { error: uErr } = await supabase
    .from("student_lesson_updates")
    .insert(updateRows);
  if (uErr && /attendance/i.test(uErr.message)) {
    // Attendance migration hasn't been run; drop it and retry.
    const retry = await supabase
      .from("student_lesson_updates")
      .insert(
        updateRows.map((row) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { attendance, ...rest } = row;
          return rest;
        }),
      );
    uErr = retry.error;
  }
  if (uErr) {
    // Roll back the lesson so we don't leave an empty shell. If the
    // rollback itself fails the lesson is orphaned with no updates —
    // capture it for manual cleanup but still report the original error
    // so the teacher knows what to retry.
    const { error: rollbackErr } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lesson.id);
    if (rollbackErr) Sentry.captureException(rollbackErr);
    return { error: t("saveUpdatesError", { message: uErr.message }) };
  }

  revalidatePath(`/teacher/classes/${parsed.data.class_id}`);
  redirect(`/teacher/classes/${parsed.data.class_id}`);
}

export async function updateLesson(_prev: unknown, formData: FormData) {
  const user = await requireRole(["teacher", "admin"]);
  const t = await getTranslations("teacher.lessonForm");
  const tc = await getTranslations("common");
  if (isDemoUser(user)) return { error: tc("demoReadOnly") };

  const lessonId = String(formData.get("lesson_id") ?? "");
  const class_id = String(formData.get("class_id") ?? "");
  if (!lessonId) return { error: t("validation") };

  const updates = buildUpdates(formData);
  const parsed = lessonSchema.safeParse({
    class_id,
    lesson_date: formData.get("lesson_date"),
    unit: nullableString(formData.get("unit")),
    lesson_number: nullableString(formData.get("lesson_number")),
    topic: nullableString(formData.get("topic")),
    vocabulary: nullableString(formData.get("vocabulary")),
    grammar_point: nullableString(formData.get("grammar_point")),
    speaking_activity: nullableString(formData.get("speaking_activity")),
    homework: nullableString(formData.get("homework")),
    general_note: nullableString(formData.get("general_note")),
    updates,
  });
  if (!parsed.success) return { error: t("validation") };

  const supabase = await createClient();

  // Verify the lesson belongs to a class in the user's center, and that a
  // teacher caller teaches that class. Admin can edit anyone in their center.
  const { data: existing } = await supabase
    .from("lessons")
    .select("id, class_id, worksheet_id, class:classes!inner(teacher_id, center_id)")
    .eq("id", lessonId)
    .single();
  type ClassRow = { teacher_id: string; center_id: string };
  const cls = existing
    ? (Array.isArray(existing.class) ? existing.class[0] : existing.class) as
        | ClassRow
        | undefined
    : undefined;
  if (!existing || !cls || cls.center_id !== user.center_id) {
    return { error: t("noPermission") };
  }
  if (user.role === "teacher" && cls.teacher_id !== user.id) {
    return { error: t("noPermission") };
  }

  // Everything below scopes to the lesson's REAL class. The form's class_id
  // is never trusted for validation — a teacher of two classes could
  // otherwise submit class B's id (and roster) against class A's lesson.
  const classId = existing.class_id as string;

  // Edit-mode roster drift: a student who joined the class AFTER this
  // lesson appears in the form defaulting to "present / homework not
  // done". Saving an unrelated edit must not backfill that row — only
  // students the teacher actually touched, or who already have a row,
  // get written. (The form marks touched students via touched_{id}.)
  const { data: existingSluRows } = await supabase
    .from("student_lesson_updates")
    .select("student_id")
    .eq("lesson_id", lessonId);
  const hasExistingRow = new Set(
    ((existingSluRows ?? []) as { student_id: string }[]).map(
      (r) => r.student_id,
    ),
  );
  const effectiveUpdates = parsed.data.updates.filter(
    (u) =>
      hasExistingRow.has(u.student_id) ||
      String(formData.get(`touched_${u.student_id}`) ?? "") === "1",
  );

  // Reject any per-student row whose student isn't on this class's roster.
  const bad = await invalidStudentIds(
    supabase,
    classId,
    effectiveUpdates.map((u) => u.student_id),
  );
  if (bad.length > 0) return { error: t("validation") };

  let worksheetId: string | null = null;
  const pickedRaw = String(formData.get("worksheet_id") ?? "");
  if (pickedRaw === "none") {
    worksheetId = null;
  } else if (pickedRaw) {
    const verified = await verifyPickedWorksheet(
      supabase,
      pickedRaw,
      user.center_id,
    );
    if ("error" in verified) return { error: t("validation") };
    worksheetId = verified.id;
  } else {
    const tw = await getTranslations("worksheets");
    const uploaded = await maybeUploadInlineWorksheet(
      formData,
      user.center_id,
      user.id,
      { tooLarge: tw("tooLarge"), badType: tw("badType") },
    );
    if (uploaded.error) {
      return { error: t("saveLessonError", { message: uploaded.error }) };
    }
    // An empty select + no new file means "no change", NOT "detach": the
    // select submits nothing when the attached worksheet is missing from
    // the options (deleted from the library, or the options query failed),
    // and an unrelated edit must not silently strip the attachment.
    // Detaching is only ever the explicit "none" choice above.
    worksheetId =
      uploaded.id ?? ((existing.worksheet_id as string | null) ?? null);
  }

  // Same topic-column resilience as createLesson.
  const baseUpdate = {
    lesson_date: parsed.data.lesson_date,
    unit: parsed.data.unit,
    lesson_number: parsed.data.lesson_number,
    vocabulary: parsed.data.vocabulary,
    grammar_point: parsed.data.grammar_point,
    speaking_activity: parsed.data.speaking_activity,
    homework: parsed.data.homework,
    general_note: parsed.data.general_note,
    worksheet_id: worksheetId,
  };
  let { error: lErr } = await supabase
    .from("lessons")
    .update({ ...baseUpdate, topic: parsed.data.topic })
    .eq("id", lessonId);
  if (lErr && /topic/i.test(lErr.message)) {
    const retry = await supabase
      .from("lessons")
      .update(baseUpdate)
      .eq("id", lessonId);
    lErr = retry.error;
  }
  if (lErr) {
    if (/lessons_class_date_uniq/i.test(lErr.message)) {
      return { error: t("duplicateDate") };
    }
    return { error: t("saveLessonError", { message: lErr.message }) };
  }

  // Replace per-student rows via upsert on (lesson_id, student_id).
  // The previous delete-then-insert was racy: two concurrent edits of
  // the same lesson could clobber each other and drop student rows.
  // Upsert with the unique constraint serialises both callers; last
  // writer wins per row, no rows lost.
  //
  // Note: if a student was removed from the class between create and
  // edit, their row from the original lesson stays — that's a feature,
  // not a bug. Their attendance/behavior for that day shouldn't vanish
  // just because they later left the class.
  const updateRows = effectiveUpdates.map((u) => ({
    lesson_id: lessonId,
    student_id: u.student_id,
    behavior_rating: u.behavior_rating,
    individual_note: u.individual_note,
    homework_completed: u.homework_completed,
    attendance: u.attendance,
  }));
  if (updateRows.length === 0) {
    // Nothing per-student to write (e.g. body-only edit on a lesson whose
    // roster has entirely turned over) — the lesson update above is done.
    revalidatePath(`/teacher/classes/${classId}`);
    redirect(`/teacher/classes/${classId}`);
  }
  let { error: uErr } = await supabase
    .from("student_lesson_updates")
    .upsert(updateRows, { onConflict: "lesson_id,student_id" });
  if (uErr && /attendance/i.test(uErr.message)) {
    const retry = await supabase
      .from("student_lesson_updates")
      .upsert(
        updateRows.map((row) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { attendance, ...rest } = row;
          return rest;
        }),
        { onConflict: "lesson_id,student_id" },
      );
    uErr = retry.error;
  }
  // If the unique constraint hasn't been added yet (migration not run),
  // fall back to the legacy delete-then-insert so the action still works.
  if (uErr && /(student_lesson_updates_lesson_student_unique|on conflict|no unique)/i.test(uErr.message)) {
    const { error: delErr } = await supabase
      .from("student_lesson_updates")
      .delete()
      .eq("lesson_id", lessonId);
    if (delErr) {
      return { error: t("saveUpdatesError", { message: delErr.message }) };
    }
    const fallback = await supabase
      .from("student_lesson_updates")
      .insert(updateRows);
    uErr = fallback.error;
  }
  if (uErr) {
    return { error: t("saveUpdatesError", { message: uErr.message }) };
  }

  revalidatePath(`/teacher/classes/${classId}`);
  redirect(`/teacher/classes/${classId}`);
}

export async function deleteLesson(
  formData: FormData,
): Promise<{ error?: string } | void> {
  const user = await requireRole(["teacher", "admin"]);
  const tc = await getTranslations("common");
  const lessonId = String(formData.get("lesson_id") ?? "");
  const classId = String(formData.get("class_id") ?? "");
  if (!lessonId) return { error: tc("notAllowed") };
  if (isDemoUser(user)) return { error: tc("demoReadOnly") };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("lessons")
    .select("id, class_id, class:classes!inner(teacher_id, center_id)")
    .eq("id", lessonId)
    .single();
  type ClassRow = { teacher_id: string; center_id: string };
  const cls = existing
    ? (Array.isArray(existing.class) ? existing.class[0] : existing.class) as
        | ClassRow
        | undefined
    : undefined;
  if (!existing || !cls || cls.center_id !== user.center_id) {
    return { error: tc("notAllowed") };
  }
  if (user.role === "teacher" && cls.teacher_id !== user.id) {
    return { error: tc("notAllowed") };
  }

  const { error } = await supabase
    .from("lessons")
    .delete()
    .eq("id", lessonId);
  if (error) return { error: tc("deleteFailed", { message: error.message }) };
  if (classId) revalidatePath(`/teacher/classes/${classId}`);
}
