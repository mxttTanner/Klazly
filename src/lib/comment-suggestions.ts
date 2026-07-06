/**
 * Daily rotation for the teacher comment-suggestion bank.
 *
 * The bank is pre-written, human-authored text stored in the
 * comment_suggestions table (db/comment-suggestions.sql) — nothing is
 * generated at write-time. This module only decides WHICH suggestions are
 * shown: 5 per category per calendar day, the same 5 for every teacher all
 * day, a different 5 tomorrow. Deterministic (seeded by "YYYY-MM-DD:category"),
 * so there is no per-click randomness. Callers pass the VIETNAM-local date
 * from vnTodayYMD() so the rotation flips at VN midnight, not UTC midnight.
 */

export const SUGGESTION_CATEGORIES = [
  "positive",
  "needs_improvement",
  "participation",
  "homework",
] as const;

export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

export type CommentSuggestion = {
  id: string;
  category: string;
  text: string;
  active?: boolean;
  sort_order?: number | null;
};

export const DAILY_SUGGESTION_COUNT = 5;

/** FNV-1a 32-bit string hash — small, dependency-free, stable across runtimes. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 — tiny seeded PRNG; enough statistical quality for a shuffle. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Display order for the picked set: sort_order (nulls last), then text. */
function displaySort(a: CommentSuggestion, b: CommentSuggestion): number {
  const ao = a.sort_order ?? Number.MAX_SAFE_INTEGER;
  const bo = b.sort_order ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return a.text.localeCompare(b.text);
}

/**
 * Pick the day's suggestions for one category.
 *
 * Deterministic: the same (rows, category, dateYMD) always yields the same
 * picks regardless of the input row order. If the category has `count` or
 * fewer active rows, all of them are returned. Inactive rows are never
 * returned.
 */
export function pickDailySuggestions(
  rows: CommentSuggestion[],
  category: string,
  dateYMD: string,
  count: number = DAILY_SUGGESTION_COUNT,
): CommentSuggestion[] {
  const pool = rows
    .filter((r) => r.category === category && r.active !== false)
    // Canonical order by id so the seeded shuffle is independent of the
    // caller's query ordering.
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  if (pool.length <= count) return [...pool].sort(displaySort);

  const rand = mulberry32(fnv1a(`${dateYMD}:${category}`));
  // Partial Fisher–Yates: shuffle just the first `count` slots.
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rand() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).sort(displaySort);
}

/**
 * Convenience for the lesson-form pages: today's texts for every category.
 * Rows typically come straight from a `select ... eq("active", true)` on
 * comment_suggestions; if that table doesn't exist yet (migration not
 * applied), callers pass [] and every category is simply empty — the form
 * hides the feature.
 */
export function buildDailySuggestions(
  rows: CommentSuggestion[],
  dateYMD: string,
): Record<SuggestionCategory, string[]> {
  const out = {} as Record<SuggestionCategory, string[]>;
  for (const category of SUGGESTION_CATEGORIES) {
    out[category] = pickDailySuggestions(rows, category, dateYMD).map(
      (r) => r.text,
    );
  }
  return out;
}
