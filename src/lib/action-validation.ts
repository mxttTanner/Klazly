import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";

/**
 * "YYYY-MM-DD" that is also a REAL calendar date (no 2026-13-01 / 2026-02-30
 * rollover). Shared by the lesson and photo server actions — parseDateOnly in
 * utils.ts parses but does not reject rollover dates, so this is the one
 * schema to change if date rules ever tighten.
 */
export const ymdDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) => {
      const [y, m, d] = s.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return (
        dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
      );
    },
    { message: "invalid date" },
  );

/**
 * Guard against a crafted/stale POST writing rows for students who aren't in
 * this class (and possibly in another center entirely). We read the roster
 * via the RLS-scoped client, so a teacher only ever "sees" students in
 * classes they teach and an admin only their own center — any submitted
 * student_id not visible here is rejected. Returns the ids that are NOT
 * valid. Shared by the lesson save and photo upload actions so roster
 * semantics can never drift between them.
 */
export async function invalidStudentIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classId: string,
  studentIds: string[],
): Promise<string[]> {
  const { data } = await supabase
    .from("students")
    .select("id")
    .eq("class_id", classId);
  const roster = new Set((data ?? []).map((r: { id: string }) => r.id));
  return studentIds.filter((id) => !roster.has(id));
}
