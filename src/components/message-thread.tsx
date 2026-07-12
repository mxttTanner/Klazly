import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { effectiveReadMap, unreadCountsByStudent } from "@/lib/message-reads";
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

  // Newest 200, then reverse into chronological order for display. With
  // ascending order + limit the cap kept the OLDEST 200 rows, so once a
  // thread passed 200 messages every new message was silently invisible.
  const res = await supabase
    .from("parent_teacher_messages")
    .select(
      "id, sender_user_id, body, created_at, read_at, sender:users!parent_teacher_messages_sender_user_id_fkey(full_name, role)",
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(200);

  const fetchFailed = !!res.error;
  const rows = ((res.data ?? []) as MessageRow[]).slice().reverse();
  const withSender = rows.map((m) => {
    const sender = Array.isArray(m.sender) ? m.sender[0] : m.sender;
    return {
      id: m.id,
      sender_user_id: m.sender_user_id,
      body: m.body,
      created_at: m.created_at,
      legacyReadAt: m.read_at,
      senderName: sender?.full_name ?? "",
      senderRole: sender?.role ?? "",
    };
  });

  // Read receipts come from per-user read rows (message_reads), not the
  // legacy shared read_at flag — see src/lib/message-reads.ts.
  const readMap = await effectiveReadMap(supabase, withSender);
  const messages = withSender.map(({ legacyReadAt: _legacy, ...m }) => ({
    ...m,
    read_at: readMap.get(m.id) ?? null,
  }));

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
  const counts = await unreadCountsByStudent(
    supabase,
    [studentId],
    currentUserId,
  );
  return counts.get(studentId) ?? 0;
}
