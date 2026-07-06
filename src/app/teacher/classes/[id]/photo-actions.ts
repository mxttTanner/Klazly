"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoUser } from "@/lib/demo-guard";
import { invalidStudentIds, ymdDateSchema } from "@/lib/action-validation";
import { validatePhotoBytes } from "@/lib/image-validation";
import { vnTodayYMD } from "@/lib/vn-time";

const photoSchema = z.object({
  class_id: z.string().uuid(),
  caption: z.string().max(200).optional().nullable(),
  taken_at: ymdDateSchema,
  student_ids: z.array(z.string().uuid()).min(1),
});

export async function uploadStudentPhoto(_prev: unknown, formData: FormData) {
  const user = await requireRole(["teacher", "admin"]);
  const t = await getTranslations("photos");
  const tc = await getTranslations("common");
  if (isDemoUser(user)) return { error: tc("demoReadOnly") };

  const supabase = await createClient();

  const parsed = photoSchema.safeParse({
    class_id: String(formData.get("class_id") ?? ""),
    caption: String(formData.get("caption") ?? "").trim() || null,
    taken_at: String(formData.get("taken_at") ?? "") || vnTodayYMD(),
    student_ids: formData.getAll("student_ids").map(String),
  });
  if (!parsed.success) return { error: t("validation") };

  // Same ownership gate as createLesson (class in caller's center, teacher
  // must teach it) + roster validation for the tags — both reads are
  // independent, so they run in one round trip.
  const [clsRes, badIds] = await Promise.all([
    supabase
      .from("classes")
      .select("id, teacher_id, center_id")
      .eq("id", parsed.data.class_id)
      .single(),
    invalidStudentIds(supabase, parsed.data.class_id, parsed.data.student_ids),
  ]);
  const cls = clsRes.data;
  if (!cls || cls.center_id !== user.center_id) {
    return { error: t("noPermission") };
  }
  if (user.role === "teacher" && cls.teacher_id !== user.id) {
    return { error: t("noPermission") };
  }
  if (badIds.length > 0) {
    return { error: t("validation") };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: t("noFile") };
  }
  // Never trust the declared MIME type — sniff the actual leading bytes so a
  // renamed file can't slip through (see src/lib/image-validation.ts). Only
  // the first 12 bytes are needed; the full 5MB is never buffered here.
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const verdict = validatePhotoBytes(head, file.size);
  if (!verdict.ok) return { error: t(verdict.error) };

  const admin = createAdminClient();
  const photoId = crypto.randomUUID();
  // {center_id}/{photo_id}.{ext} — see db/student-photos.sql.
  const storagePath = `${user.center_id}/${photoId}.${verdict.ext}`;

  const { error: uploadErr } = await admin.storage
    .from("student-photos")
    .upload(storagePath, file, {
      upsert: false,
      contentType: verdict.type,
      cacheControl: "3600",
    });
  if (uploadErr) {
    return { error: t("uploadError", { message: uploadErr.message }) };
  }

  const { error: insertErr } = await admin.from("student_photos").insert({
    id: photoId,
    center_id: user.center_id,
    uploaded_by: user.id,
    storage_path: storagePath,
    caption: parsed.data.caption,
    taken_at: parsed.data.taken_at,
  });
  if (insertErr) {
    await admin.storage.from("student-photos").remove([storagePath]);
    return { error: t("uploadError", { message: insertErr.message }) };
  }

  const { error: tagErr } = await admin.from("student_photo_tags").insert(
    parsed.data.student_ids.map((student_id) => ({
      photo_id: photoId,
      student_id,
    })),
  );
  if (tagErr) {
    // Full rollback — an untagged photo would be invisible to parents and
    // unmanageable from the class view.
    await admin.from("student_photos").delete().eq("id", photoId);
    await admin.storage.from("student-photos").remove([storagePath]);
    return { error: t("uploadError", { message: tagErr.message }) };
  }

  revalidatePath(`/teacher/classes/${cls.id}`);
  return { success: t("uploadSuccess") };
}

export async function deleteStudentPhoto(formData: FormData) {
  const user = await requireRole(["teacher", "admin"]);
  const id = String(formData.get("id") ?? "");
  const classId = String(formData.get("class_id") ?? "");
  if (!id) return;
  if (isDemoUser(user)) return;

  const admin = createAdminClient();

  const { data: photo } = await admin
    .from("student_photos")
    .select("center_id, storage_path, uploaded_by")
    .eq("id", id)
    .single();
  if (!photo || photo.center_id !== user.center_id) return;

  // Teachers can only delete photos THEY uploaded; admins any in their
  // center (mirrors deleteWorksheet).
  if (user.role === "teacher" && photo.uploaded_by !== user.id) return;

  // Row first (cascades tags); the file is unreachable once the row is gone.
  const { error: delErr } = await admin
    .from("student_photos")
    .delete()
    .eq("id", id);
  if (delErr) throw new Error(`deleteStudentPhoto failed: ${delErr.message}`);

  // Storage cleanup is best-effort — an orphan blob is wasted bytes, not
  // something to error-boundary the teacher over.
  const { error: storageErr } = await admin.storage
    .from("student-photos")
    .remove([photo.storage_path]);
  if (storageErr) Sentry.captureException(storageErr);

  if (classId) revalidatePath(`/teacher/classes/${classId}`);
}
