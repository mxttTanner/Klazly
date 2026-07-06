/**
 * Unit tests for the comment-suggestion daily rotation
 * (src/lib/comment-suggestions.ts). Pure functions, no DB.
 *
 * Run: npm run test:rotation   (tsx scripts/test-comment-rotation.ts)
 * Exits 1 on any failure — same convention as test-tenant-isolation.ts.
 */

import assert from "node:assert/strict";
import {
  buildDailySuggestions,
  DAILY_SUGGESTION_COUNT,
  pickDailySuggestions,
  SUGGESTION_CATEGORIES,
  type CommentSuggestion,
} from "../src/lib/comment-suggestions";

let passed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

function makeRows(
  category: string,
  count: number,
  opts: { activeEvery?: number } = {},
): CommentSuggestion[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${category}-${String(i).padStart(3, "0")}`,
    category,
    text: `${category} suggestion ${i}`,
    active: opts.activeEvery ? i % opts.activeEvery === 0 : true,
    sort_order: i + 1,
  }));
}

function shuffle<T>(arr: T[]): T[] {
  // Deliberately NOT seeded — the point is that input order must not matter.
  return [...arr].sort(() => Math.random() - 0.5);
}

const POOL = [
  ...makeRows("positive", 15),
  ...makeRows("needs_improvement", 10),
  ...makeRows("participation", 8),
  ...makeRows("homework", 6),
];

test("returns exactly 5 when the category has more than 5 active rows", () => {
  const picks = pickDailySuggestions(POOL, "positive", "2026-07-06");
  assert.equal(picks.length, DAILY_SUGGESTION_COUNT);
});

test("is deterministic for the same date + category", () => {
  const a = pickDailySuggestions(POOL, "positive", "2026-07-06");
  const b = pickDailySuggestions(POOL, "positive", "2026-07-06");
  assert.deepEqual(
    a.map((r) => r.id),
    b.map((r) => r.id),
  );
});

test("ignores the caller's row ordering", () => {
  const a = pickDailySuggestions(POOL, "positive", "2026-07-06");
  for (let i = 0; i < 10; i++) {
    const b = pickDailySuggestions(shuffle(POOL), "positive", "2026-07-06");
    assert.deepEqual(
      b.map((r) => r.id),
      a.map((r) => r.id),
    );
  }
});

test("changes across dates (rotates day to day)", () => {
  const seen = new Set<string>();
  for (let day = 1; day <= 30; day++) {
    const date = `2026-07-${String(day).padStart(2, "0")}`;
    const picks = pickDailySuggestions(POOL, "positive", date);
    seen.add(picks.map((r) => r.id).join("|"));
  }
  // 30 days over C(15,5)=3003 possible sets — a handful of collisions is
  // fine, but a broken (constant) rotation would give exactly 1.
  assert.ok(
    seen.size >= 10,
    `expected many distinct daily sets over 30 days, got ${seen.size}`,
  );
});

test("different categories rotate independently on the same date", () => {
  const a = pickDailySuggestions(POOL, "positive", "2026-07-06").map((r) =>
    r.id.replace(/^positive-/, ""),
  );
  const b = pickDailySuggestions(
    POOL,
    "needs_improvement",
    "2026-07-06",
  ).map((r) => r.id.replace(/^needs_improvement-/, ""));
  // Not a hard guarantee for any single date, but with distinct seeds the
  // index picks should not be identical across categories on this date —
  // verified stable since the function is deterministic.
  assert.notDeepEqual(a, b);
});

test("returns the whole category when it has 5 or fewer active rows", () => {
  const small = makeRows("participation", 4);
  const picks = pickDailySuggestions(small, "participation", "2026-07-06");
  assert.equal(picks.length, 4);
  assert.deepEqual(
    picks.map((r) => r.id).sort(),
    small.map((r) => r.id).sort(),
  );
});

test("returns exactly 5 when a category has exactly 5 rows", () => {
  const five = makeRows("homework", 5);
  const picks = pickDailySuggestions(five, "homework", "2026-07-06");
  assert.equal(picks.length, 5);
});

test("never returns inactive rows", () => {
  const rows = makeRows("positive", 20, { activeEvery: 2 }); // 10 active
  for (let day = 1; day <= 10; day++) {
    const date = `2026-07-${String(day).padStart(2, "0")}`;
    const picks = pickDailySuggestions(rows, "positive", date);
    assert.equal(picks.length, DAILY_SUGGESTION_COUNT);
    for (const p of picks) assert.notEqual(p.active, false);
  }
});

test("returns [] for a category with zero active rows", () => {
  const rows = makeRows("positive", 6).map((r) => ({ ...r, active: false }));
  assert.deepEqual(pickDailySuggestions(rows, "positive", "2026-07-06"), []);
});

test("returns [] for an unknown category or empty input", () => {
  assert.deepEqual(pickDailySuggestions(POOL, "nope", "2026-07-06"), []);
  assert.deepEqual(pickDailySuggestions([], "positive", "2026-07-06"), []);
});

test("never returns duplicate rows", () => {
  for (let day = 1; day <= 20; day++) {
    const date = `2026-06-${String(day).padStart(2, "0")}`;
    const picks = pickDailySuggestions(POOL, "positive", date);
    assert.equal(new Set(picks.map((r) => r.id)).size, picks.length);
  }
});

test("buildDailySuggestions covers every category with texts", () => {
  const byCat = buildDailySuggestions(POOL, "2026-07-06");
  for (const cat of SUGGESTION_CATEGORIES) {
    assert.ok(Array.isArray(byCat[cat]));
    assert.ok(byCat[cat].length > 0 && byCat[cat].length <= 5);
    for (const text of byCat[cat]) assert.equal(typeof text, "string");
  }
});

test("buildDailySuggestions on empty input yields empty categories", () => {
  const byCat = buildDailySuggestions([], "2026-07-06");
  for (const cat of SUGGESTION_CATEGORIES) assert.deepEqual(byCat[cat], []);
});

if (process.exitCode === 1) {
  console.error("\nSome rotation tests FAILED.");
} else {
  console.log(`\nAll ${passed} rotation tests passed.`);
}
