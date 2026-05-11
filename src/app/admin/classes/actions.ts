"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoUser } from "@/lib/demo-guard";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  teacher_id: z.string().uuid().nullable(),
  schedule_text: z.string().max(200).optional().nullable(),
  book: z.string().max(120).optional().nullable(),
  program: z.string().max(80).nullable(),
});

function nullableTrim(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

export async function createClass(_prev: unknown, formData: FormData) {
  const admin = await requireRole("admin");
  const t = await getTranslations("admin.classes");
  const tc = await getTranslations("common");
  if (isDemoUser(admin)) return { error: tc("demoReadOnly") };

  const teacherIdRaw = String(formData.get("teacher_id") ?? "");
  const programRaw = String(formData.get("program") ?? "");
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    teacher_id: teacherIdRaw && teacherIdRaw !== "none" ? teacherIdRaw : null,
    schedule_text: nullableTrim(formData.get("schedule_text")),
    book: nullableTrim(formData.get("book")),
    // Program is now a free-form label (validated against the center's catalog
    // at the UI layer; the DB just stores text).
    program:
      programRaw && programRaw !== "none" ? programRaw.trim() || null : null,
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

  // Insert. Optional columns (book, program) come from later migrations —
  // fall back gracefully if they don't exist yet.
  const baseInsert = {
    center_id: admin.center_id,
    name: parsed.data.name,
    teacher_id: parsed.data.teacher_id,
    schedule_text: parsed.data.schedule_text,
  };
  const optional: Record<string, string | null> = {};
  if (parsed.data.book !== undefined && parsed.data.book !== null) {
    optional.book = parsed.data.book;
  }
  if (parsed.data.program) {
    optional.program = parsed.data.program;
  }

  let { error } = await supabase
    .from("classes")
    .insert({ ...baseInsert, ...optional });
  if (error && /book|program/i.test(error.message)) {
    // Strip whichever column the DB rejected and retry with the rest.
    const retryInsert = { ...baseInsert };
    if (!/program/i.test(error.message) && parsed.data.program) {
      Object.assign(retryInsert, { program: parsed.data.program });
    }
    if (
      !/book/i.test(error.message) &&
      parsed.data.book !== undefined &&
      parsed.data.book !== null
    ) {
      Object.assign(retryInsert, { book: parsed.data.book });
    }
    const retry = await supabase.from("classes").insert(retryInsert);
    error = retry.error;
    if (error && /book|program/i.test(error.message)) {
      // Still failing on the other optional column — strip both and retry.
      const final = await supabase.from("classes").insert(baseInsert);
      error = final.error;
    }
  }
  if (error) return { error: t("createError", { message: error.message }) };

  revalidatePath("/admin/classes");
  revalidatePath("/admin");
  return { success: t("createdHint", { name: parsed.data.name }) };
}

export async function updateClassBook(formData: FormData) {
  const admin = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const book = nullableTrim(formData.get("book"));
  if (!id) return;
  if (isDemoUser(admin)) return;

  const supabase = createAdminClient();

  const { data: cls } = await supabase
    .from("classes")
    .select("id, center_id")
    .eq("id", id)
    .single();
  if (!cls || cls.center_id !== admin.center_id) return;

  await supabase.from("classes").update({ book }).eq("id", id);
  revalidatePath("/admin/classes");
  revalidatePath("/admin");
}

export async function updateClassProgram(formData: FormData) {
  const admin = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const programRaw = String(formData.get("program") ?? "");
  const program =
    programRaw && programRaw !== "none" ? programRaw.trim() || null : null;
  if (!id) return;
  if (isDemoUser(admin)) return;

  const supabase = createAdminClient();

  const { data: cls } = await supabase
    .from("classes")
    .select("id, center_id")
    .eq("id", id)
    .single();
  if (!cls || cls.center_id !== admin.center_id) return;

  await supabase.from("classes").update({ program }).eq("id", id);
  revalidatePath("/admin/classes");
  revalidatePath("/admin");
}

export async function updateClassTeacher(formData: FormData) {
  const admin = await requireRole("admin");
  if (isDemoUser(admin)) return;
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
  revalidatePath("/admin");
  // Teacher's home + class detail need to refresh since the assignment
  // affects what classes they see and which they own.
  revalidatePath("/teacher", "layout");
}

export async function deleteClass(formData: FormData) {
  const admin = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  if (isDemoUser(admin)) return;

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
