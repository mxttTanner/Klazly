import { getLocale, getTranslations } from "next-intl/server";
import { MessageSquareText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MessageComposer } from "@/components/message-composer";

/**
 * Server-rendered message thread between a parent and the class teacher for
 * a given student. Reads from `parent_teacher_messages`; RLS guarantees
 * the caller only sees their own conversation. Falls back gracefully if
 * the migration hasn't been run.
 */
export async function MessageThread({
  studentId,
  currentUserId,
  emptyHint,
}: {
  studentId: string;
  currentUserId: string;
  emptyHint: string;
}) {
  const supabase = createClient();
  const t = await getTranslations("messages");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  type MessageRow = {
    id: string;
    sender_user_id: string;
    body: string;
    created_at: string;
    sender: { full_name: string; role: string } | { full_name: string; role: string }[] | null;
  };

  const res = await supabase
    .from("parent_teacher_messages")
    .select(
      "id, sender_user_id, body, created_at, sender:users!parent_teacher_messages_sender_user_id_fkey(full_name, role)",
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (res.error) {
    // Migration not run, or RLS issue — show the composer anyway so the
    // user can try (and see a friendlier error from the action if it fails).
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">{emptyHint}</p>
        <MessageComposer
          studentId={studentId}
          placeholder={t("composerPlaceholder")}
          sendLabel={t("send")}
          sendingLabel={t("sending")}
        />
      </div>
    );
  }

  const messages = (res.data ?? []) as MessageRow[];

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm">
          <MessageSquareText className="size-6 opacity-50" />
          <p>{emptyHint}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => {
            const sender = Array.isArray(m.sender) ? m.sender[0] : m.sender;
            const mine = m.sender_user_id === currentUserId;
            const when = new Date(m.created_at).toLocaleString(dateLocale, {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <li
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {!mine ? (
                    <p className="mb-0.5 text-xs font-medium opacity-80">
                      {sender?.full_name ?? ""}
                      {sender?.role === "teacher"
                        ? ` · ${t("teacherTag")}`
                        : sender?.role === "admin"
                          ? ` · ${t("adminTag")}`
                          : ""}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={`mt-1 text-right text-[10px] ${
                      mine ? "opacity-80" : "opacity-60"
                    }`}
                  >
                    {when}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <MessageComposer
        studentId={studentId}
        placeholder={t("composerPlaceholder")}
        sendLabel={t("send")}
        sendingLabel={t("sending")}
      />
    </div>
  );
}

export async function unreadCountForUser({
  studentId,
  currentUserId,
}: {
  studentId: string;
  currentUserId: string;
}): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("parent_teacher_messages")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .neq("sender_user_id", currentUserId)
    .is("read_at", null);
  return count ?? 0;
}
