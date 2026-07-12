import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Per-user message read state (db/message-reads.sql). The legacy shared
 * read_at column corrupted read state across the three thread participants
 * (an admin opening a thread marked messages "read" for the parent). These
 * helpers query the message_reads table instead, and fall back to the
 * legacy read_at semantics when the migration hasn't been applied yet so
 * a code-first deploy degrades instead of breaking.
 */

/**
 * Effective "read" timestamp per message for READ-RECEIPT display:
 * a staff-sent message counts as read when the parent read it; a
 * parent-sent message counts as read when a staff member read it.
 * (RLS only exposes read rows to the message sender and the reader
 * themselves, which is exactly who needs them.)
 */
export async function effectiveReadMap(
  supabase: SupabaseClient,
  messages: Array<{ id: string; senderRole: string; legacyReadAt: string | null }>,
): Promise<Map<string, string | null>> {
  if (messages.length === 0) return new Map();

  const res = await supabase
    .from("message_reads")
    .select("message_id, reader_role, read_at")
    .in(
      "message_id",
      messages.map((m) => m.id),
    );

  if (res.error) {
    // Migration not applied yet — legacy shared-flag behavior.
    return new Map(messages.map((m) => [m.id, m.legacyReadAt]));
  }

  type ReadRow = { message_id: string; reader_role: string; read_at: string };
  const byMessage = new Map<string, ReadRow[]>();
  for (const row of (res.data ?? []) as ReadRow[]) {
    const arr = byMessage.get(row.message_id) ?? [];
    arr.push(row);
    byMessage.set(row.message_id, arr);
  }

  return new Map(
    messages.map((m) => {
      const reads = byMessage.get(m.id) ?? [];
      const hit =
        m.senderRole === "parent"
          ? reads.find((r) => r.reader_role !== "parent")
          : reads.find((r) => r.reader_role === "parent");
      return [m.id, hit?.read_at ?? null];
    }),
  );
}

/**
 * Unread message count per student for the CURRENT user, via the
 * unread_message_counts RPC (counts messages with no read row for the
 * caller). Students with zero unread are absent from the map.
 */
export async function unreadCountsByStudent(
  supabase: SupabaseClient,
  studentIds: string[],
  currentUserId: string,
): Promise<Map<string, number>> {
  if (studentIds.length === 0) return new Map();

  const rpc = await supabase.rpc("unread_message_counts", {
    p_student_ids: studentIds,
  });
  if (!rpc.error && rpc.data) {
    return new Map(
      (rpc.data as Array<{ student_id: string; unread: number }>).map((r) => [
        r.student_id,
        Number(r.unread),
      ]),
    );
  }

  // Migration not applied yet — legacy shared-flag count.
  const legacy = await supabase
    .from("parent_teacher_messages")
    .select("student_id")
    .in("student_id", studentIds)
    .neq("sender_user_id", currentUserId)
    .is("read_at", null);
  const map = new Map<string, number>();
  if (!legacy.error && legacy.data) {
    for (const row of legacy.data as Array<{ student_id: string }>) {
      map.set(row.student_id, (map.get(row.student_id) ?? 0) + 1);
    }
  }
  return map;
}
