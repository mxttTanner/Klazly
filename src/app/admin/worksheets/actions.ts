"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function uploadWorksheet(_prev: unknown, formData: FormData) {
  const admin = await requireRole(["admin", "teacher"]);
  const t = await getTranslations("worksheets");

  const file = formData.get("file");
  const nameRaw = String(formData.get("name") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return { error: t("noFile") };
  }
  if (file.size > MAX_BYTES) return { error: t("tooLarge") };
  if (!ALLOWED_TYPES.includes(file.type)) return { error: t("badType") };

  const name = nameRaw.length > 0 ? nameRaw : file.name;
  const supabase = createAdminClient();

  // Pick a unique storage path so re-uploading the same filename doesn't
  // collide (and so the public URL changes for cache busting).
  const ext =
    file.type === "application/pdf"
      ? "pdf"
      : file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/png"
          ? "png"
          : "webp";
  const id = crypto.randomUUID();
  const storagePath = `${admin.center_id}/${id}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("worksheets")
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600",
    });
  if (uploadErr) {
    return { error: t("uploadError", { message: uploadErr.message }) };
  }

  const { data: urlData } = supabase.storage
    .from("worksheets")
    .getPublicUrl(storagePath);

  const { error: insertErr } = await supabase.from("worksheets").insert({
    center_id: admin.center_id,
    uploaded_by: admin.id,
    name,
    storage_path: storagePath,
    public_url: urlData.publicUrl,
    file_type: file.type,
    size_bytes: file.size,
  });
  if (insertErr) {
    await supabase.storage.from("worksheets").remove([storagePath]);
    return { error: t("uploadError", { message: insertErr.message }) };
  }

  revalidatePath("/admin/worksheets");
  revalidatePath("/teacher/classes", "layout");
  return { success: t("uploadSuccess", { name }) };
}

export async function deleteWorksheet(formData: FormData) {
  const admin = await requireRole(["admin", "teacher"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createAdminClient();

  const { data: ws } = await supabase
    .from("worksheets")
    .select("center_id, storage_path")
    .eq("id", id)
    .single();
  if (!ws || ws.center_id !== admin.center_id) return;

  await supabase.from("worksheets").delete().eq("id", id);
  await supabase.storage.from("worksheets").remove([ws.storage_path]);

  revalidatePath("/admin/worksheets");
  revalidatePath("/teacher/classes", "layout");
}
