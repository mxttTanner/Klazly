"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import * as Sentry from "@sentry/nextjs";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoUser } from "@/lib/demo-guard";
import { sendNewMessageEmail } from "@/lib/email";

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

  const supabase = await createClient();

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

  // Guard against a rapid double-submit / retry inserting the same message
  // twice (and firing a duplicate email): if an identical message from this
  // sender for this student landed in the last ~10s, treat it as already
  // sent and skip the insert.
  const tenSecondsAgo = new Date(Date.now() - 10_000).toISOString();
  const { data: recentDup } = await supabase
    .from("parent_teacher_messages")
    .select("id")
    .eq("student_id", parsed.data.student_id)
    .eq("sender_user_id", user.id)
    .eq("body", parsed.data.body)
    .gte("created_at", tenSecondsAgo)
    .limit(1)
    .maybeSingle();
  if (recentDup) return { success: true };

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

  // Fire an email notification to the recipient. Best-effort — if it
  // fails, the message is already in the DB and we still revalidate.
  // Uses the admin client because the parent/teacher RLS scope won't
  // let a sender read the recipient's email column.
  await notifyRecipientByEmail({
    senderRole: user.role,
    senderName: user.full_name,
    centerId: student.center_id,
    studentId: parsed.data.student_id,
    parentUserId: student.parent_user_id,
    classId: student.class_id,
    body: parsed.data.body,
  });

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

async function notifyRecipientByEmail(opts: {
  senderRole: "parent" | "teacher" | "admin";
  senderName: string;
  centerId: string;
  studentId: string;
  parentUserId: string | null;
  classId: string | null;
  body: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    // Need the student name for the subject line; one cheap fetch.
    const { data: student } = await admin
      .from("students")
      .select("full_name")
      .eq("id", opts.studentId)
      .single();
    const studentName = student?.full_name ?? "—";

    if (opts.senderRole === "parent") {
      // Notify the class teacher.
      if (!opts.classId) return;
      const { data: cls } = await admin
        .from("classes")
        .select("teacher_id")
        .eq("id", opts.classId)
        .single();
      if (!cls?.teacher_id) return;
      const { data: teacher } = await admin
        .from("users")
        .select("email, full_name")
        .eq("id", cls.teacher_id)
        .single();
      if (!teacher?.email) return;
      await sendNewMessageEmail({
        toEmail: teacher.email,
        toName: teacher.full_name,
        fromName: opts.senderName,
        fromRoleLabel: "Phụ huynh / Parent",
        studentName,
        body: opts.body,
        threadPath: `/teacher/classes/${opts.classId}/messages/${opts.studentId}`,
      });
    } else {
      // Teacher or admin → notify the parent.
      if (!opts.parentUserId) return;
      const { data: parent } = await admin
        .from("users")
        .select("email, full_name")
        .eq("id", opts.parentUserId)
        .single();
      if (!parent?.email) return;
      await sendNewMessageEmail({
        toEmail: parent.email,
        toName: parent.full_name,
        fromName: opts.senderName,
        fromRoleLabel:
          opts.senderRole === "admin" ? "Quản trị / Admin" : "Giáo viên / Teacher",
        studentName,
        body: opts.body,
        threadPath: `/parent/students/${opts.studentId}`,
      });
    }
  } catch (err) {
    console.error("[messages] email notify failed:", err);
  }
}

/**
 * Mark all visible messages in a student's thread as read FOR THE CURRENT
 * USER (per-user rows in message_reads; the legacy shared read_at column
 * is still stamped for backward compatibility but no longer read).
 */
export async function markThreadRead(
  formData: FormData,
  opts: { revalidate?: boolean } = {},
) {
  const user = await requireRole(["parent", "teacher", "admin"]);
  const studentId = String(formData.get("student_id") ?? "");
  if (!studentId) return;
  if (isDemoUser(user)) return; // don't pollute demo read-state either

  const supabase = await createClient();
  // Best-effort: this runs every time someone opens a thread. A transient
  // failure shouldn't error-boundary the user. Capture for ops visibility
  // and let the next thread visit retry.
  //
  // Marking goes through the mark_messages_read SECURITY DEFINER function
  // (db/2026-07-02-audit-fixes.sql): the old direct UPDATE lost its RLS
  // policy and would now silently no-op. The RPC only sets read_at on
  // messages the caller may see and did NOT send. Runs on the RLS-scoped
  // server client so auth.uid()/role resolve to the current user.
  const { error } = await supabase.rpc("mark_messages_read", {
    p_student_id: studentId,
  });
  if (error) Sentry.captureException(error);

  // Callers that invoke this during an RSC render pass { revalidate: false }
  // — revalidatePath throws mid-render. read_at is already committed by the
  // RPC; the force-dynamic thread pages recompute unread state on next load.
  if (opts.revalidate === false) return;

  revalidatePath(`/parent/students/${studentId}`);
  revalidatePath("/teacher/classes/[id]/messages/[studentId]", "page");
  revalidatePath("/teacher/classes", "layout");
  revalidatePath("/admin/messages", "layout");
}
