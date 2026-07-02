import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { MessageThreadView } from "@/components/message-thread-view";

/**
 * Server-rendered message thread wrapper. Pulls messages via the user's
 * RLS-scoped supabase client, then hands them to a client view that does
 * auto-scroll, sticky composer, date dividers, and read receipts. Falls
 * back gracefully if the `parent_teacher_messages` table doesn't exist
 * yet (migration not run).
 */
export async function MessageThread({
  studentId,
  currentUserId,
  emptyHint,
  composeTo = "teacher",
}: {
  studentId: string;
  currentUserId: string;
  emptyHint: string;
  // Whose perspective is the composer being filled from? Drives the
  // placeholder text — a parent writes "to the teacher", a teacher/admin
  // writes "to the parent".
  composeTo?: "teacher" | "parent";
}) {
  const supabase = await createClient();
  const t = await getTranslations("messages");
  const locale = await getLocale();

  type MessageRow = {
    id: string;
    sender_user_id: string;
    body: string;
    created_at: string;
    read_at: string | null;
    sender:
      | { full_name: string; role: string }
      | { full_name: string; role: string }[]
      | null;
  };

  const res = await supabase
    .from("parent_teacher_messages")
    .select(
      "id, sender_user_id, body, created_at, read_at, sender:users!parent_teacher_messages_sender_user_id_fkey(full_name, role)",
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: true })
    .limit(200);

  const fetchFailed = !!res.error;
  const rows = (res.data ?? []) as MessageRow[];
  const messages = rows.map((m) => {
    const sender = Array.isArray(m.sender) ? m.sender[0] : m.sender;
    return {
      id: m.id,
      sender_user_id: m.sender_user_id,
      body: m.body,
      created_at: m.created_at,
      read_at: m.read_at,
      senderName: sender?.full_name ?? "",
      senderRole: sender?.role ?? "",
    };
  });

  return (
    <MessageThreadView
      studentId={studentId}
      currentUserId={currentUserId}
      messages={messages}
      locale={locale}
      fetchFailed={fetchFailed}
      labels={{
        empty: emptyHint,
        send: t("send"),
        sending: t("sending"),
        composerPlaceholder:
          composeTo === "parent"
            ? t("composerPlaceholderToParent")
            : t("composerPlaceholder"),
        teacherTag: t("teacherTag"),
        adminTag: t("adminTag"),
        readReceiptRead: t("readReceiptRead"),
        readReceiptSent: t("readReceiptSent"),
        dayToday: t("dayToday"),
        dayYesterday: t("dayYesterday"),
        fetchFailedHint: t("fetchFailedHint"),
        enterHint: t("enterHint"),
      }}
    />
  );
}

export async function unreadCountForUser({
  studentId,
  currentUserId,
}: {
  studentId: string;
  currentUserId: string;
}): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("parent_teacher_messages")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .neq("sender_user_id", currentUserId)
    .is("read_at", null);
  return count ?? 0;
}
