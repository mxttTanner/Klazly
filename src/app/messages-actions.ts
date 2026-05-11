"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isDemoUser } from "@/lib/demo-guard";

const sendSchema = z.object({
  student_id: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

/**
 * Send a message about a student. Parent or teacher (or admin) can call;
 * RLS does the actual permission check. We do a server-side sanity check
 * too so we can return a friendlier error.
 */
export async function sendParentTeacherMessage(
  _prev: unknown,
  formData: FormData,
) {
  const user = await requireRole(["parent", "teacher", "admin"]);
  const t = await getTranslations("messages");
  const tc = await getTranslations("common");
  if (isDemoUser(user)) return { error: tc("demoReadOnly") };

  const parsed = sendSchema.safeParse({
    student_id: formData.get("student_id"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: t("validationBody") };

  const supabase = createClient();

  // Look up the student to discover center_id (required for the insert).
  const { data: student } = await supabase
    .from("students")
    .select("id, center_id, parent_user_id, class_id")
    .eq("id", parsed.data.student_id)
    .single();
  if (!student) return { error: t("notAllowed") };

  // Quick role-side check (RLS is the safety net, but a clear error helps
  // when a parent picks the wrong student id, or a teacher edits a class
  // they no longer own).
  if (user.role === "parent" && student.parent_user_id !== user.id) {
    return { error: t("notAllowed") };
  }
  if (user.role === "teacher") {
    if (!student.class_id) return { error: t("notAllowed") };
    const { data: cls } = await supabase
      .from("classes")
      .select("teacher_id")
      .eq("id", student.class_id)
      .single();
    if (!cls || cls.teacher_id !== user.id) return { error: t("notAllowed") };
  }
  if (user.center_id !== student.center_id) {
    return { error: t("notAllowed") };
  }

  const { error: insertErr } = await supabase
    .from("parent_teacher_messages")
    .insert({
      center_id: student.center_id,
      student_id: parsed.data.student_id,
      sender_user_id: user.id,
      body: parsed.data.body,
    });
  if (insertErr) {
    return { error: t("sendError", { message: insertErr.message }) };
  }

  // Both views revalidate on the next render — RLS makes sure each side only
  // sees their own thread.
  revalidatePath(`/parent/students/${parsed.data.student_id}`);
  // revalidatePath understands the file route pattern. Use the literal
  // "[id]" placeholder so Next.js invalidates every classId variant of the
  // teacher messages route.
  revalidatePath("/teacher/classes/[id]/messages/[studentId]", "page");
  revalidatePath("/teacher/classes", "layout");
  revalidatePath("/admin/messages", "layout");
  return { success: true };
}

/**
 * Mark all visible messages in a student's thread as read (sets read_at on
 * messages that are not from the current user and are not already read).
 */
export async function markThreadRead(formData: FormData) {
  const user = await requireRole(["parent", "teacher", "admin"]);
  const studentId = String(formData.get("student_id") ?? "");
  if (!studentId) return;
  if (isDemoUser(user)) return; // don't pollute demo read-state either

  const supabase = createClient();
  await supabase
    .from("parent_teacher_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("student_id", studentId)
    .neq("sender_user_id", user.id)
    .is("read_at", null);

  revalidatePath(`/parent/students/${studentId}`);
  revalidatePath("/teacher/classes/[id]/messages/[studentId]", "page");
  revalidatePath("/teacher/classes", "layout");
  revalidatePath("/admin/messages", "layout");
}
