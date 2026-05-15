#!/usr/bin/env node
// Regression guard: fail the build if any customer-facing string in
// the codebase reintroduces Western "credit card" / "thẻ tín dụng"
// payment language. We sell into Vietnam where business
// subscriptions are paid via bank transfer / Momo / ZaloPay /
// VNPay — card framing makes the product feel foreign and was
// stripped in commit 7ef92c5 / follow-ups.
//
// Scope: src/messages/*.json (the translation strings that actually
// render to users) plus the root-level marketing docs (WHY.md,
// SALES.md, PRIVACY.md, TERMS.md).
//
// Explicitly excluded:
//   - src/components/clarity-script.tsx — technical comment about
//     what Clarity auto-masks (credit card fields are one of them);
//     it's accurate, not a marketing claim.
//   - Anything matching `classCard*` — those are UI Card component
//     names ("class card lessons"), nothing to do with payment.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

const TARGETS = [
  "src/messages/en.json",
  "src/messages/vi.json",
  "WHY.md",
  "SALES.md",
  "PRIVACY.md",
  "TERMS.md",
];

// Phrases that always indicate payment-context card language.
const BAD_PATTERNS = [
  /credit\s+card/i,
  /debit\s+card/i,
  /\bcardless\b/i,
  /no\s+card\s+required/i,
  /no\s+credit\s+card/i,
  /card\s+on\s+file/i,
  /card\s+details/i,
  /payment\s+card/i,
  /thẻ\s+tín\s+dụng/i,
  /thẻ\s+ghi\s+nợ/i,
  /không\s+cần\s+thẻ/i,
  /thẻ\s+thanh\s+toán/i,
];

const offenders = [];

for (const rel of TARGETS) {
  const abs = join(ROOT, rel);
  let text;
  try {
    text = readFileSync(abs, "utf8");
  } catch {
    continue; // file missing — not a regression
  }
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of BAD_PATTERNS) {
      if (pattern.test(lines[i])) {
        offenders.push({
          file: rel,
          line: i + 1,
          match: pattern.source,
          text: lines[i].trim().slice(0, 160),
        });
        break; // one finding per line is enough
      }
    }
  }
}

if (offenders.length > 0) {
  console.error("\n❌ Western card payment language found:");
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}  (/${o.match}/)\n    ${o.text}`);
  }
  console.error(
    "\nVN business subscriptions are paid via bank transfer / Momo / " +
      "ZaloPay / VNPay — no cards involved. Use 'No upfront payment' " +
      "(EN) or 'Không cần thanh toán trước' (VI) instead.",
  );
  process.exit(1);
}

console.log("✓ no card-payment language in user-facing copy");
