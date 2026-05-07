"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  teacher_id: z.string().uuid().nullable(),
  schedule_text: z.string().max(200).optional().nullable(),
});

export async function createClass(_prev: unknown, formData: FormData) {
  const admin = await requireRole("admin");
  const t = await getTranslations("admin.classes");

  const teacherIdRaw = String(formData.get("teacher_id") ?? "");
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    teacher_id: teacherIdRaw && teacherIdRaw !== "none" ? teacherIdRaw : null,
    schedule_text: formData.get("schedule_text") || null,
  });
  if (!parsed.success) return { error: t("validation") };

  const supabase = createAdminClient();

  if (parsed.data.teacher_id) {
    const { data: teacher } = await supabase
      .from("users")
      .select("id, role, center_id")
      .eq("id", parsed.data.teacher_id)
      .single();
    if (
      !teacher ||
      teacher.role !== "teacher" ||
      teacher.center_id !== admin.center_id
    ) {
      return { error: t("invalidTeacher") };
    }
  }

  const { error } = await supabase.from("classes").insert({
    center_id: admin.center_id,
    name: parsed.data.name,
    teacher_id: parsed.data.teacher_id,
    schedule_text: parsed.data.schedule_text,
  });
  if (error) return { error: t("createError", { message: error.message }) };

  revalidatePath("/admin/classes");
  revalidatePath("/admin");
  return { success: t("createdHint", { name: parsed.data.name }) };
}

export async function updateClassTeacher(formData: FormData) {
  const admin = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const teacherIdRaw = String(formData.get("teacher_id") ?? "");
  const teacher_id =
    teacherIdRaw && teacherIdRaw !== "none" ? teacherIdRaw : null;
  if (!id) return;

  const supabase = createAdminClient();

  const { data: cls } = await supabase
    .from("classes")
    .select("id, center_id")
    .eq("id", id)
    .single();
  if (!cls || cls.center_id !== admin.center_id) return;

  if (teacher_id) {
    const { data: tr } = await supabase
      .from("users")
      .select("id, role, center_id")
      .eq("id", teacher_id)
      .single();
    if (!tr || tr.role !== "teacher" || tr.center_id !== admin.center_id)
      return;
  }

  await supabase.from("classes").update({ teacher_id }).eq("id", id);
  revalidatePath("/admin/classes");
}

export async function deleteClass(formData: FormData) {
  const admin = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createAdminClient();

  const { data: cls } = await supabase
    .from("classes")
    .select("id, center_id")
    .eq("id", id)
    .single();
  if (!cls || cls.center_id !== admin.center_id) return;

  await supabase.from("classes").delete().eq("id", id);
  revalidatePath("/admin/classes");
  revalidatePath("/admin");
}
