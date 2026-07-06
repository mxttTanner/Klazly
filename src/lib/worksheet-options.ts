import "server-only";

import type { createClient } from "@/lib/supabase/server";

export type WorksheetOption = {
  id: string;
  name: string;
  file_type: string;
  category: string | null;
};

/**
 * Worksheet options for the lesson form's picker, newest first. Retries
 * without the `category` column ONLY when the error is about that column
 * (db/worksheet-categories.sql not applied) — a transient failure must not
 * silently render every worksheet as uncategorized.
 */
export async function fetchWorksheetOptions(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<WorksheetOption[]> {
  const r1 = await supabase
    .from("worksheets")
    .select("id, name, file_type, category")
    .order("created_at", { ascending: false });
  if (!r1.error) return (r1.data ?? []) as WorksheetOption[];

  if (!/category/i.test(r1.error.message)) {
    console.warn("[worksheet-options] select failed:", r1.error.message);
    return [];
  }
  console.warn(
    "[worksheet-options] category column missing (migration not run?), falling back:",
    r1.error.message,
  );
  const r2 = await supabase
    .from("worksheets")
    .select("id, name, file_type")
    .order("created_at", { ascending: false });
  return ((r2.data ?? []) as Omit<WorksheetOption, "category">[]).map((w) => ({
    ...w,
    category: null,
  }));
}
