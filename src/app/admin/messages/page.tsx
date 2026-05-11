import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { MessageSquareText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const admin = await requireRole("admin");
  const supabase = createClient();
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

      {threads.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-12 text-center text-sm">
          <MessageSquareText className="size-8 opacity-50" />
          <p>{t("inboxEmpty")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {threads.map((thread) => {
            const s = studentMap.get(thread.student_id);
            const teacher = s?.class?.teacher
              ? Array.isArray(s.class.teacher)
                ? s.class.teacher[0]
                : s.class.teacher
              : null;
            const lastWhen = new Date(thread.last.created_at).toLocaleString(
              dateLocale,
              {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              },
            );
            const ownMsg = thread.last.sender_user_id === admin.id;
            return (
              <li key={thread.student_id}>
                <Link
                  href={`/admin/messages/${thread.student_id}`}
                  className="bg-card hover:bg-muted/40 flex items-start justify-between gap-3 rounded-lg border p-3 transition"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {s?.full_name ?? t("unknownStudent")}
                      </p>
                      {thread.unread > 0 ? (
                        <span className="bg-rose-500 text-white inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                          {thread.unread}
                        </span>
                      ) : null}
                      {s?.class ? (
                        <span className="text-muted-foreground text-xs">
                          {s.class.name}
                          {teacher ? ` · ${teacher.full_name}` : ""}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground truncate text-sm">
                      {ownMsg ? `${t("youPrefix")} ` : ""}
                      {thread.last.body}
                    </p>
                  </div>
                  <span className="text-muted-foreground whitespace-nowrap text-xs">
                    {lastWhen}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
