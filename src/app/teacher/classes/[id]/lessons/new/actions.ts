"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
): Promise<{ id: string | null; error?: string }> {
  const file = formData.get("worksheet_file");
  if (!(file instanceof File) || file.size === 0) return { id: null };

  if (file.size > MAX_WORKSHEET_BYTES) {
    return { id: null, error: "Worksheet too large (max 5MB)." };
  }
  if (!ALLOWED_WORKSHEET_TYPES.includes(file.type)) {
    return { id: null, error: "Worksheet must be PDF, PNG, JPG, or WebP." };
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

  const { data: urlData } = supabase.storage
    .from("worksheets")
    .getPublicUrl(storagePath);

  const { data: inserted, error: insertErr } = await supabase
    .from("worksheets")
    .insert({
      center_id: centerId,
      uploaded_by: uploaderId,
      name: file.name,
      storage_path: storagePath,
      public_url: urlData.publicUrl,
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
  const teacher = await requireRole("teacher");
  const t = await getTranslations("teacher.templates");

  const parsed = templateSchema.safeParse({
    name: formData.get("template_name"),
    vocabulary: nullableString(formData.get("vocabulary")),
    grammar_point: nullableString(formData.get("grammar_point")),
    speaking_activity: nullableString(formData.get("speaking_activity")),
    homework: nullableString(formData.get("homework")),
    general_note: nullableString(formData.get("general_note")),
  });
  if (!parsed.success) return { error: t("validation") };

  const supabase = createClient();
  const { error } = await supabase.from("lesson_templates").insert({
    center_id: teacher.center_id,
    created_by: teacher.id,
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
});

const lessonSchema = z.object({
  class_id: z.string().uuid(),
  lesson_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vocabulary: z.string().max(1000).optional().nullable(),
  grammar_point: z.string().max(1000).optional().nullable(),
  speaking_activity: z.string().max(1000).optional().nullable(),
  homework: z.string().max(1000).optional().nullable(),
  general_note: z.string().max(2000).optional().nullable(),
  updates: z.array(studentUpdateSchema).min(1),
});

function nullable(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

export async function createLesson(_prev: unknown, formData: FormData) {
  const teacher = await requireRole("teacher");
  const t = await getTranslations("teacher.lessonForm");

  const class_id = String(formData.get("class_id") ?? "");
  const studentIds = formData.getAll("student_id").map(String);

  const updates = studentIds.map((sid) => {
    const ratingRaw = String(formData.get(`behavior_${sid}`) ?? "");
    const noteRaw = formData.get(`note_${sid}`);
    const hwDone = formData.get(`homework_${sid}`) === "on";
    return {
      student_id: sid,
      behavior_rating:
        ratingRaw && ratingRaw !== "none"
          ? (ratingRaw as "great" | "good" | "okay" | "needs_attention")
          : null,
      individual_note: nullable(noteRaw),
      homework_completed: hwDone,
    };
  });

  const parsed = lessonSchema.safeParse({
    class_id,
    lesson_date: formData.get("lesson_date"),
    vocabulary: nullable(formData.get("vocabulary")),
    grammar_point: nullable(formData.get("grammar_point")),
    speaking_activity: nullable(formData.get("speaking_activity")),
    homework: nullable(formData.get("homework")),
    general_note: nullable(formData.get("general_note")),
    updates,
  });

  if (!parsed.success) return { error: t("validation") };

  const supabase = createClient();

  const { data: cls } = await supabase
    .from("classes")
    .select("id, teacher_id, center_id")
    .eq("id", parsed.data.class_id)
    .single();
  if (!cls || cls.teacher_id !== teacher.id) {
    return { error: t("noPermission") };
  }

  // Worksheet attachment: either an existing library entry, or upload + add to library.
  let worksheetId: string | null = null;
  const pickedRaw = String(formData.get("worksheet_id") ?? "");
  if (pickedRaw && pickedRaw !== "none") {
    worksheetId = pickedRaw;
  } else {
    const uploaded = await maybeUploadInlineWorksheet(
      formData,
      teacher.center_id,
      teacher.id,
    );
    if (uploaded.error) {
      return {
        error: t("saveLessonError", { message: uploaded.error }),
      };
    }
    worksheetId = uploaded.id;
  }

  const { data: lesson, error: lErr } = await supabase
    .from("lessons")
    .insert({
      class_id: parsed.data.class_id,
      teacher_id: teacher.id,
      lesson_date: parsed.data.lesson_date,
      vocabulary: parsed.data.vocabulary,
      grammar_point: parsed.data.grammar_point,
      speaking_activity: parsed.data.speaking_activity,
      homework: parsed.data.homework,
      general_note: parsed.data.general_note,
      worksheet_id: worksheetId,
    })
    .select()
    .single();
  if (lErr || !lesson) {
    return {
      error: t("saveLessonError", { message: lErr?.message ?? "" }),
    };
  }

  const updateRows = parsed.data.updates.map((u) => ({
    lesson_id: lesson.id,
    student_id: u.student_id,
    behavior_rating: u.behavior_rating,
    individual_note: u.individual_note,
    homework_completed: u.homework_completed,
  }));

  const { error: uErr } = await supabase
    .from("student_lesson_updates")
    .insert(updateRows);
  if (uErr) {
    await supabase.from("lessons").delete().eq("id", lesson.id);
    return { error: t("saveUpdatesError", { message: uErr.message }) };
  }

  revalidatePath(`/teacher/classes/${parsed.data.class_id}`);
  redirect(`/teacher/classes/${parsed.data.class_id}`);
}
