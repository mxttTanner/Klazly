/**
 * Smoke-test the founding-trial conversion logic in lib/subscription.ts
 * without touching the database. Run:
 *
 *   npx tsx scripts/verify-founding-conversion.ts
 *
 * Six fixture rows cover the four interesting states:
 *   1. Standard trial, still in-progress     →  no transition
 *   2. Standard trial, past trial_ends_at    →  expireIds (will become 'expired')
 *   3. Founding trial, still in-progress     →  no transition
 *   4. Founding trial, past trial_ends_at    →  convertRows (will become 'active')
 *   5. Already-active center                 →  no transition (sanity)
 *   6. Founding trial with null trial_ends_at→  no transition (sanity)
 *
 * Each fixture also asserts the display side (deriveStatus) — most
 * importantly that a founding trial past its end date NEVER shows as
 * 'expired'; it shows as 'active' even before the bulk UPDATE has run.
 */

import {
  deriveStatus,
  findFoundingTrialsToConvert,
  findTrialsToExpire,
  type CenterSubscriptionInput,
} from "../src/lib/subscription";

const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const future = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

const fixtures: Array<{
  label: string;
  row: CenterSubscriptionInput;
  expectExpire: boolean;
  expectConvert: boolean;
  expectDerived: string;
}> = [
  {
    label: "Standard trial, in progress",
    row: {
      id: "s-active",
      subscription_status: "trial",
      subscription_plan: null,
      plan_tier: "standard",
      trial_ends_at: future,
    },
    expectExpire: false,
    expectConvert: false,
    expectDerived: "trial",
  },
  {
    label: "Standard trial, EXPIRED (past trial_ends_at)",
    row: {
      id: "s-expired",
      subscription_status: "trial",
      subscription_plan: null,
      plan_tier: "standard",
      trial_ends_at: past,
    },
    expectExpire: true,
    expectConvert: false,
    expectDerived: "expired",
  },
  {
    label: "Founding trial, in progress (Mỹ Hảo's current state)",
    row: {
      id: "f-active",
      subscription_status: "trial",
      subscription_plan: null,
      plan_tier: "founding",
      trial_ends_at: future,
    },
    expectExpire: false,
    expectConvert: false,
    expectDerived: "trial",
  },
  {
    label: "Founding trial, PAST end-date (the June-16 scenario)",
    row: {
      id: "f-convert",
      subscription_status: "trial",
      subscription_plan: null,
      plan_tier: "founding",
      trial_ends_at: past,
    },
    expectExpire: false,
    expectConvert: true,
    expectDerived: "active",
  },
  {
    label: "Already-active standard center",
    row: {
      id: "active",
      subscription_status: "active",
      subscription_plan: "monthly",
      plan_tier: "standard",
      trial_ends_at: past,
    },
    expectExpire: false,
    expectConvert: false,
    expectDerived: "active",
  },
  {
    label: "Founding trial with null trial_ends_at",
    row: {
      id: "f-null",
      subscription_status: "trial",
      subscription_plan: null,
      plan_tier: "founding",
      trial_ends_at: null,
    },
    expectExpire: false,
    expectConvert: false,
    expectDerived: "trial",
  },
];

const rows = fixtures.map((f) => f.row);
const expireIds = new Set(findTrialsToExpire(rows));
const convertIds = new Set(findFoundingTrialsToConvert(rows).map((r) => r.id));

let failures = 0;

for (const f of fixtures) {
  const inExpire = expireIds.has(f.row.id);
  const inConvert = convertIds.has(f.row.id);
  const derived = deriveStatus(f.row);

  const lines: string[] = [];
  if (inExpire !== f.expectExpire) {
    lines.push(
      `  ✗ expire bucket: got ${inExpire}, expected ${f.expectExpire}`,
    );
  }
  if (inConvert !== f.expectConvert) {
    lines.push(
      `  ✗ convert bucket: got ${inConvert}, expected ${f.expectConvert}`,
    );
  }
  if (derived !== f.expectDerived) {
    lines.push(
      `  ✗ deriveStatus: got '${derived}', expected '${f.expectDerived}'`,
    );
  }

  if (lines.length === 0) {
    console.log(`✓ ${f.label}`);
  } else {
    failures += 1;
    console.error(`✗ ${f.label}`);
    for (const l of lines) console.error(l);
  }
}

// Cross-bucket invariants — a row must never appear in BOTH buckets,
// and standard/founding partitioning must be exhaustive over overdue
// trials.
const both = Array.from(expireIds).filter((id) => convertIds.has(id));
if (both.length > 0) {
  failures += 1;
  console.error(`✗ rows in BOTH expire and convert buckets: ${both.join(",")}`);
} else {
  console.log("✓ no row appears in both buckets");
}

console.log("");
if (failures > 0) {
  console.error(`FAIL — ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("PASS — founding-trial conversion logic behaves as specified");
