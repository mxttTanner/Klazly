/**
 * Unit tests for the comment-suggestion rotation (a deterministic shuffle
 * bag — src/lib/comment-suggestions.ts). Pure functions, no DB.
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

// A consecutive-day helper whose epoch-day increments by 1 per offset, so
// tests can reason about rotation cycles. Mirrors epochDay() in the lib.
const EPOCH0 = Math.floor(Date.UTC(2026, 0, 1) / 86_400_000);
function ymd(dayOffset: number): string {
  const d = new Date(Date.UTC(2026, 0, 1) + dayOffset * 86_400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// Production pool sizes — all multiples of 5 so cycles are seamless.
const POOL = [
  ...makeRows("positive", 20),
  ...makeRows("needs_improvement", 20),
  ...makeRows("participation", 15),
  ...makeRows("homework", 15),
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

test("never returns duplicate rows within a day", () => {
  for (let off = 0; off < 40; off++) {
    const picks = pickDailySuggestions(POOL, "positive", ymd(off));
    assert.equal(new Set(picks.map((r) => r.id)).size, picks.length);
  }
});

test("consecutive days in a cycle never overlap, and a full cycle covers the whole pool exactly once", () => {
  for (const [category, size] of [
    ["positive", 20],
    ["participation", 15],
  ] as const) {
    const count = DAILY_SUGGESTION_COUNT;
    const blockLen = Math.ceil(size / count);
    const byCycle = new Map<number, string[][]>();
    for (let off = 0; off < blockLen * 6; off++) {
      const cycle = Math.floor((EPOCH0 + off) / blockLen);
      const ids = pickDailySuggestions(POOL, category, ymd(off)).map(
        (r) => r.id,
      );
      let bucket = byCycle.get(cycle);
      if (!bucket) {
        bucket = [];
        byCycle.set(cycle, bucket);
      }
      bucket.push(ids);
    }
    for (const [cycle, days] of byCycle) {
      if (days.length !== blockLen) continue; // only assert complete cycles
      const all = days.flat();
      // No comment shown twice anywhere in the cycle...
      assert.equal(
        new Set(all).size,
        all.length,
        `${category} cycle ${cycle}: a comment repeated within the cycle`,
      );
      // ...and the cycle covers the entire pool.
      assert.equal(
        new Set(all).size,
        size,
        `${category} cycle ${cycle}: did not cover the whole pool`,
      );
    }
  }
});

test("changes across dates (rotates day to day)", () => {
  const seen = new Set<string>();
  for (let off = 0; off < 30; off++) {
    const picks = pickDailySuggestions(POOL, "positive", ymd(off));
    seen.add(picks.map((r) => r.id).sort().join("|"));
  }
  assert.ok(
    seen.size >= 10,
    `expected many distinct daily sets over 30 days, got ${seen.size}`,
  );
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
  for (let off = 0; off < 12; off++) {
    const picks = pickDailySuggestions(rows, "positive", ymd(off));
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
