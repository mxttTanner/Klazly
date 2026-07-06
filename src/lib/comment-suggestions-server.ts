import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { vnTodayYMD } from "@/lib/vn-time";
import {
  buildDailySuggestions,
  type CommentSuggestion,
  type SuggestionCategory,
} from "@/lib/comment-suggestions";

/**
 * Fetch the active comment-suggestion bank for the teacher's UI locale and
 * rotate it into today's per-category picks (VN calendar day). Shared by the
 * new-lesson and edit-lesson pages so both forms always show the same bank.
 *
 * Degrades to empty categories (feature hidden) if the
 * db/comment-suggestions.sql migration hasn't been applied.
 */
export async function fetchDailySuggestions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  locale: string,
): Promise<Record<SuggestionCategory, string[]>> {
  const lang = locale === "vi" ? "vi" : "en";
  const res = await supabase
    .from("comment_suggestions")
    .select("id, category, text, sort_order")
    .eq("active", true)
    .eq("lang", lang);
  if (res.error) {
    console.warn(
      "[comment-suggestions] select failed (migration not run?):",
      res.error.message,
    );
    return buildDailySuggestions([], vnTodayYMD());
  }
  return buildDailySuggestions(
    (res.data ?? []) as CommentSuggestion[],
    vnTodayYMD(),
  );
}
