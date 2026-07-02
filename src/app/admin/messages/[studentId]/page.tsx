import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MessageThread } from "@/components/message-thread";
import { markThreadRead } from "@/app/messages-actions";

export const dynamic = "force-dynamic";

export default async function AdminThreadPage(
  props: {
    params: Promise<{ studentId: string }>;
  }
) {
  const params = await props.params;
  const admin = await requireRole("admin");
  const supabase = await createClient();
  const t = await getTranslations("messages");
  const tc = await getTranslations("common");

  // Verify student is in this center.
  const { data: student } = await supabase
    .from("students")
    .select(
      "id, full_name, center_id, class:classes(name, teacher:users!classes_teacher_id_fkey(full_name)), parent:users!students_parent_user_id_fkey(full_name)",
    )
    .eq("id", params.studentId)
    .single();
  if (!student || student.center_id !== admin.center_id) notFound();

  const cls = Array.isArray(student.class) ? student.class[0] : student.class;
  const teacher = cls?.teacher
    ? Array.isArray(cls.teacher)
      ? cls.teacher[0]
      : cls.teacher
    : null;
  const parent = Array.isArray(student.parent)
    ? student.parent[0]
    : student.parent;

  // Mark unread (non-admin sender) messages as read on view.
  {
    const fd = new FormData();
    fd.append("student_id", params.studentId);
    await markThreadRead(fd).catch(() => {});
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/admin/messages"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" />
          {t("inboxTitle")}
        </Link>
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <MessageSquareText className="text-primary size-5" />
          {t("threadTitle", { name: student.full_name })}
        </h1>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {cls ? (
            <span>
              {tc("name") /* generic label fallback */ ? "" : ""}
              {cls.name}
              {teacher ? ` · ${t("threadTeacher", { name: teacher.full_name })}` : ""}
            </span>
          ) : null}
          {parent ? (
            <span>{t("threadParent", { name: parent.full_name })}</span>
          ) : (
            <span className="italic">{t("threadNoParent")}</span>
          )}
        </div>
      </div>

      <MessageThread
        studentId={student.id}
        currentUserId={admin.id}
        emptyHint={t("adminEmptyHint")}
        composeTo="parent"
      />
    </div>
  );
}
