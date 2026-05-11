import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MessageThread } from "@/components/message-thread";
import { markThreadRead } from "@/app/messages-actions";

export const dynamic = "force-dynamic";

export default async function TeacherStudentMessagesPage({
  params,
}: {
  params: { id: string; studentId: string };
}) {
  const user = await requireRole(["teacher", "admin"]);
  const supabase = createClient();
  const t = await getTranslations("messages");
  const tClass = await getTranslations("teacher.class");

  // Verify the class belongs to this teacher's center, and the student is
  // in that class.
  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, teacher_id, center_id")
    .eq("id", params.id)
    .single();
  if (!cls) notFound();
  if (cls.center_id !== user.center_id) notFound();
  if (user.role === "teacher" && cls.teacher_id !== user.id) notFound();

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, class_id, center_id")
    .eq("id", params.studentId)
    .single();
  if (
    !student ||
    student.class_id !== cls.id ||
    student.center_id !== user.center_id
  ) {
    notFound();
  }

  // Find the parent linked to this student (for showing context).
  const { data: studentRow } = await supabase
    .from("students")
    .select(
      "parent_user_id, parent:users!students_parent_user_id_fkey(full_name)",
    )
    .eq("id", params.studentId)
    .single();
  const parentRow = studentRow?.parent
    ? Array.isArray(studentRow.parent)
      ? studentRow.parent[0]
      : studentRow.parent
    : null;

  // Mark any unread (parent-sent) messages as read on view.
  const markFd = new FormData();
  markFd.append("student_id", params.studentId);
  await markThreadRead(markFd);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/teacher/classes/${cls.id}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" />
          {cls.name}
        </Link>
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <MessageSquareText className="text-primary size-5" />
          {t("threadTitle", { name: student.full_name })}
        </h1>
        {parentRow ? (
          <p className="text-muted-foreground text-sm">
            {t("threadParent", { name: parentRow.full_name })}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm italic">
            {t("threadNoParent")}
          </p>
        )}
      </div>

      <MessageThread
        studentId={student.id}
        currentUserId={user.id}
        emptyHint={t("teacherEmptyHint")}
      />
      {/* TODO: a "back to class" button could go here for mobile UX */}
      <p className="sr-only">{tClass("back")}</p>
    </div>
  );
}
