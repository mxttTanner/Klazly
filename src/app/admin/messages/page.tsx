import { getLocale, getTranslations } from "next-intl/server";
import { MessageSquareText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InboxList } from "./inbox-list";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const admin = await requireRole("admin");
  const supabase = await createClient();
  const t = await getTranslations("messages");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  // Pull recent messages across the center. Group by student in JS to make
  // an "inbox" list sorted by latest activity. Limited to 1000 most recent
  // messages — fine for the kind of volume a small center will have.
  type MsgRow = {
    id: string;
    student_id: string;
    sender_user_id: string;
    body: string;
    created_at: string;
    read_at: string | null;
  };
  const msgRes = await supabase
    .from("parent_teacher_messages")
    .select("id, student_id, sender_user_id, body, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (msgRes.error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("inboxTitle")}</h1>
          <p className="text-muted-foreground text-sm">{t("inboxSubtitle")}</p>
        </div>
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-12 text-center text-sm">
          <MessageSquareText className="size-8 opacity-50" />
          <p>{t("fetchFailedHint")}</p>
        </div>
      </div>
    );
  }

  const rows = (msgRes.data ?? []) as MsgRow[];

  type Thread = {
    student_id: string;
    last: MsgRow;
    unread: number;
    total: number;
  };
  const byStudent = new Map<string, Thread>();
  for (const r of rows) {
    const existing = byStudent.get(r.student_id);
    if (!existing) {
      byStudent.set(r.student_id, {
        student_id: r.student_id,
        last: r,
        unread: r.read_at === null && r.sender_user_id !== admin.id ? 1 : 0,
        total: 1,
      });
    } else {
      existing.total++;
      if (r.read_at === null && r.sender_user_id !== admin.id) existing.unread++;
      // rows are ordered desc, so the first one wins for `last`
    }
  }

  // Hydrate student names + class info for each thread.
  const studentIds = Array.from(byStudent.keys());
  let students: Array<{
    id: string;
    full_name: string;
    class: { name: string; teacher: { full_name: string } | { full_name: string }[] | null } | null;
  }> = [];
  if (studentIds.length > 0) {
    const { data: sData } = await supabase
      .from("students")
      .select(
        "id, full_name, class:classes(name, teacher:users!classes_teacher_id_fkey(full_name))",
      )
      .in("id", studentIds);
    type StudentRow = {
      id: string;
      full_name: string;
      class:
        | {
            name: string;
            teacher:
              | { full_name: string }
              | { full_name: string }[]
              | null;
          }
        | {
            name: string;
            teacher:
              | { full_name: string }
              | { full_name: string }[]
              | null;
          }[]
        | null;
    };
    students = ((sData ?? []) as StudentRow[]).map((s) => ({
      id: s.id,
      full_name: s.full_name,
      class: Array.isArray(s.class) ? s.class[0] ?? null : s.class,
    }));
  }
  const studentMap = new Map(students.map((s) => [s.id, s]));

  // Sort threads by last activity desc.
  const threads = Array.from(byStudent.values()).sort(
    (a, b) =>
      new Date(b.last.created_at).getTime() -
      new Date(a.last.created_at).getTime(),
  );

  const totalUnread = threads.reduce((sum, t) => sum + t.unread, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("inboxTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {totalUnread > 0
            ? t("inboxSubtitleWithUnread", { n: totalUnread })
            : t("inboxSubtitle")}
        </p>
      </div>

      <InboxList
        threads={threads.map((thread) => {
          const s = studentMap.get(thread.student_id);
          const teacher = s?.class?.teacher
            ? Array.isArray(s.class.teacher)
              ? s.class.teacher[0]
              : s.class.teacher
            : null;
          return {
            studentId: thread.student_id,
            studentName: s?.full_name ?? t("unknownStudent"),
            className: s?.class?.name ?? null,
            teacherName: teacher?.full_name ?? null,
            lastBody: thread.last.body,
            lastAtIso: thread.last.created_at,
            lastWhen: new Date(thread.last.created_at).toLocaleString(
              dateLocale,
              {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              },
            ),
            unread: thread.unread,
            total: thread.total,
            ownLast: thread.last.sender_user_id === admin.id,
          };
        })}
        totalUnread={totalUnread}
        youPrefix={t("youPrefix")}
        emptyLabel={t("inboxEmpty")}
        filterAllLabel={t("inboxFilterAll")}
        filterUnreadLabel={t("inboxFilterUnread")}
        filterEmptyLabel={t("inboxFilterUnreadEmpty")}
      />
    </div>
  );
}
