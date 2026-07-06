/**
 * Daily rotation for the teacher comment-suggestion bank.
 *
 * The bank is pre-written, human-authored text stored in the
 * comment_suggestions table (db/comment-suggestions.sql) — nothing is
 * generated at write-time. This module only decides WHICH suggestions are
 * shown: 5 per category per calendar day, the same 5 for every teacher all
 * day, a different 5 tomorrow.
 *
 * It is a deterministic SHUFFLE BAG, not an independent daily draw. Each
 * "cycle" (ceil(pool / 5) days) the whole category is shuffled with a
 * per-cycle seed and dealt out 5 at a time — so consecutive days never
 * overlap and every comment is shown exactly once before the deck
 * reshuffles into a new order. Pools sized to a multiple of 5 rotate with
 * zero repeats within a cycle. Callers pass the VIETNAM-local date from
 * vnTodayYMD() so the rotation flips at VN midnight, not UTC midnight.
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

/** Whole-array Fisher–Yates shuffle with a seeded PRNG (pure, deterministic). */
function shuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Whole days since the Unix epoch for a "YYYY-MM-DD" (UTC, deterministic). */
function epochDay(dateYMD: string): number {
  const [y, m, d] = dateYMD.split("-").map(Number);
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000);
}

/**
 * Pick the day's suggestions for one category — a deterministic SHUFFLE BAG.
 *
 * Each cycle (ceil(pool / count) days) the whole category is reshuffled with
 * a per-cycle seed and dealt `count` per day. Consecutive days show adjacent,
 * non-overlapping slices, so a comment never repeats until the deck is
 * exhausted and reshuffled into a new order. When the pool is a multiple of
 * `count` the cycle is seamless (zero repeats); otherwise the last day of a
 * cycle wraps and re-shows a few from its first day — the seed pools are
 * sized to multiples of 5 to avoid that. Same (rows, category, dateYMD)
 * always yields the same picks regardless of input row order; inactive rows
 * are never returned.
 */
export function pickDailySuggestions(
  rows: CommentSuggestion[],
  category: string,
  dateYMD: string,
  count: number = DAILY_SUGGESTION_COUNT,
): CommentSuggestion[] {
  const pool = rows
    .filter((r) => r.category === category && r.active !== false)
    // Canonical order by id so the deck is independent of query ordering.
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const n = pool.length;
  if (n <= count) return [...pool].sort(displaySort);

  const blockLen = Math.ceil(n / count);
  const day = epochDay(dateYMD);
  const cycle = Math.floor(day / blockLen);
  const dayInCycle = ((day % blockLen) + blockLen) % blockLen;
  const deck = shuffle(pool, fnv1a(`${category}:${cycle}`));
  const start = dayInCycle * count;
  const picks: CommentSuggestion[] = [];
  for (let i = 0; i < count; i++) picks.push(deck[(start + i) % n]);
  return picks.sort(displaySort);
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
