#!/usr/bin/env node
// Regression guard for public-facing copy. Fails the build if any of
// these patterns reappear in the translation strings or root marketing
// docs — they all map to messaging mistakes we've explicitly stripped:
//
//   1. Western card-payment framing
//      ("credit card" / "thẻ tín dụng" / "no card required" …)
//      VN business subscriptions are paid via bank transfer / Momo /
//      ZaloPay / VNPay — card language makes the product feel foreign.
//
//   2. Public 14-day-trial promises
//      ("14-day free trial" / "free trial" / "14 ngày" …)
//      Trial length is now a private super-admin setting (Founding
//      Trial = 30 days). The public site doesn't commit to a number.
//
//   3. Fabricated testimonial names
//      ("Nguyen Thi Lan" / "Tran Van Hoang" / "Le Thi Huong")
//      These three were invented placeholders — illegal under VN
//      consumer law and discoverable by the target community.
//
//   4. Refund / money-back marketing promises
//      ("refund" / "hoàn tiền" / "money back")
//      The marketing FAQ doesn't promise refunds; the Terms reserve
//      the right not to refund unused portions. Marketing-tone
//      mentions create expectations we can't easily honour.
//
// Scope: src/messages/*.json (the strings that actually render) plus
// the root-level marketing docs (WHY.md, SALES.md, PRIVACY.md,
// TERMS.md). Internal super-admin status labels ("Trial",
// "Founding Trial") are allowed — they're not customer-facing.

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

const BAD_PATTERNS = [
  // 1. Card-payment language
  { rx: /credit\s+card/i, label: "credit card" },
  { rx: /debit\s+card/i, label: "debit card" },
  { rx: /\bcardless\b/i, label: "cardless" },
  { rx: /no\s+card\s+required/i, label: "no card required" },
  { rx: /no\s+credit\s+card/i, label: "no credit card" },
  { rx: /card\s+on\s+file/i, label: "card on file" },
  { rx: /card\s+details/i, label: "card details" },
  { rx: /payment\s+card/i, label: "payment card" },
  { rx: /thẻ\s+tín\s+dụng/i, label: "thẻ tín dụng" },
  { rx: /thẻ\s+ghi\s+nợ/i, label: "thẻ ghi nợ" },
  { rx: /không\s+cần\s+thẻ/i, label: "không cần thẻ" },
  { rx: /thẻ\s+thanh\s+toán/i, label: "thẻ thanh toán" },

  // 2. 14-day-trial messaging
  { rx: /14[-\s]day(s)?\s+(free\s+)?trial/i, label: "14-day trial" },
  { rx: /\bfree\s+trial\b/i, label: "free trial" },
  { rx: /14\s+ngày\s+miễn\s+phí/i, label: "14 ngày miễn phí" },
  { rx: /dùng\s+thử\s+14\s+ngày/i, label: "dùng thử 14 ngày" },
  { rx: /dùng\s+thử\s+miễn\s+phí/i, label: "dùng thử miễn phí" },

  // 3. Fake testimonial names (any locale spelling)
  { rx: /nguyen\s+thi\s+lan|nguyễn\s+thị\s+lan/i, label: "Nguyen Thi Lan" },
  { rx: /tran\s+van\s+hoang|trần\s+văn\s+hoàng/i, label: "Tran Van Hoang" },
  { rx: /le\s+thi\s+huong|lê\s+thị\s+hương/i, label: "Le Thi Huong" },

  // 4. Marketing refund promises (Terms can still reserve the right
  // not to refund — those use the word "Refunds" capitalised in a
  // negative-policy sentence, which still trips the regex. We accept
  // that and require the Terms language to be reworded if it ever
  // changes; the current Terms entry phrases it as "Refunds are not
  // offered…" which is fine for legal cover, so we whitelist it via
  // the SAFE list below.)
  { rx: /\brefund(s|ed|ing)?\b/i, label: "refund" },
  { rx: /money[-\s]back/i, label: "money back" },
  { rx: /hoàn\s+tiền/i, label: "hoàn tiền" },
];

/** Substrings that contain a bad pattern but are intentional (e.g.
 *  legal disclaimer that REFUSES refunds). Matched as case-sensitive
 *  exact substrings — keep narrow. */
const SAFE_SUBSTRINGS = [
  "Refunds are not offered",
  "no refund for unused portion",
  "no refund for unused",
  "Không hoàn tiền",
  // New TOS section after the May 2026 legal rebrand. The section
  // exists *to disclaim* refunds, not to promise them. Same
  // intent as the prior whitelists; just a different phrasing the
  // guard would otherwise trip on every line.
  "Refunds and cancellation",
  "don't offer refunds for unused",
  "Hoàn tiền và huỷ thuê bao",
  "không hoàn tiền cho phần chưa dùng",
  "# 3. Refunds and cancellation",
];

const offenders = [];

for (const rel of TARGETS) {
  const abs = join(ROOT, rel);
  let text;
  try {
    text = readFileSync(abs, "utf8");
  } catch {
    continue;
  }
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (SAFE_SUBSTRINGS.some((safe) => lines[i].includes(safe))) continue;
    for (const { rx, label } of BAD_PATTERNS) {
      if (rx.test(lines[i])) {
        offenders.push({
          file: rel,
          line: i + 1,
          label,
          text: lines[i].trim().slice(0, 160),
        });
        break;
      }
    }
  }
}

if (offenders.length > 0) {
  console.error("\n❌ Forbidden marketing phrase in user-facing copy:");
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}  [${o.label}]\n    ${o.text}`);
  }
  console.error(
    "\nFix: VN business subscriptions use bank transfer / Momo / ZaloPay /" +
      " VNPay; trial length is private; no fabricated names or refund" +
      " promises in marketing copy. Internal super-admin status labels" +
      " are allowed (they're not customer-facing).",
  );
  process.exit(1);
}

console.log("✓ no forbidden marketing language in user-facing copy");
