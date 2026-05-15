#!/usr/bin/env node
// Regression guard scoped to the customer-facing translation files.
// Fails the build if any of a small set of marketing-AI tells reappear
// in vi.json or en.json. The list is intentionally short — 10 words
// total — because every English word on it (leverage, robust, etc.)
// has legitimate uses in code, comments, and technical docs. Limiting
// the scope to /src/messages prevents false positives elsewhere.
//
// The Vietnamese entries are the marketing-AI phrases that translation
// tools love and that no real Vietnamese founder writes:
//   "giải pháp toàn diện" (comprehensive solution)
//   "trải nghiệm tuyệt vời" (great experience)
//   "đột phá" / "cuộc cách mạng" (breakthrough / revolution)
//
// Add new entries sparingly — the value of this guard is that it
// stays narrow enough to never fire on legitimate copy.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

const TARGETS = ["src/messages/en.json", "src/messages/vi.json"];

const BAD_PATTERNS = [
  // EN marketing-AI vocabulary
  { rx: /\bleverage(s|d|ing)?\b/i, label: "leverage" },
  { rx: /\bseamlessly\b/i, label: "seamlessly" },
  { rx: /\brobust\b/i, label: "robust" },
  { rx: /\bempower(s|ed|ing)?\b/i, label: "empower" },
  { rx: /\bcutting[-\s]edge\b/i, label: "cutting-edge" },
  { rx: /\bgame[-\s]changing\b/i, label: "game-changing" },
  // VI marketing-AI vocabulary
  { rx: /giải\s+pháp\s+toàn\s+diện/i, label: "giải pháp toàn diện" },
  { rx: /trải\s+nghiệm\s+tuyệt\s+vời/i, label: "trải nghiệm tuyệt vời" },
  { rx: /đột\s+phá/i, label: "đột phá" },
  { rx: /cuộc\s+cách\s+mạng/i, label: "cuộc cách mạng" },
  // EN in-person setup commitments — Matthew can't always travel, so
  // public copy should never promise a physical visit. Internal
  // labels (super-admin "In-person visit" lead-source) live outside
  // src/messages and aren't checked.
  { rx: /\bin[-\s]person\s+(setup|training|visit|help)/i, label: "in-person setup/visit" },
  { rx: /\bpersonal\s+setup\b/i, label: "personal setup" },
  { rx: /\bi\s+come\s+(in\s+person|to\s+your)/i, label: "I come (to your center / in person)" },
  { rx: /\bi'll\s+come\b/i, label: "I'll come" },
  // VI in-person commitments. "trực tiếp" is ambiguous (means
  // 'directly' OR 'in person'), so we only block the specific
  // physical-visit collocations.
  { rx: /setup\s+trực\s+tiếp/i, label: "setup trực tiếp" },
  { rx: /training\s+trực\s+tiếp/i, label: "training trực tiếp" },
  { rx: /em\s+đến\s+trực\s+tiếp/i, label: "em đến trực tiếp" },
  { rx: /em\s+sẽ\s+tới\s+setup/i, label: "em sẽ tới setup" },
  { rx: /em\s+ghé\s+qua/i, label: "em ghé qua" },
  { rx: /em\s+đến\s+trung\s+tâm/i, label: "em đến trung tâm" },
];

/** Internal-only translation keys that legitimately contain a flagged
 *  word. Currently: the super-admin lead-source dropdown has an
 *  "In-person visit" option as one of the channels by which a center
 *  was acquired — that's a *data label*, not a public promise. */
const SAFE_KEYS = [
  "source_in_person", // super-admin signup-source enum label
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
    if (SAFE_KEYS.some((key) => lines[i].includes(`"${key}"`))) continue;
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
  console.error("\n❌ AI-marketing tell in customer-facing copy:");
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}  [${o.label}]\n    ${o.text}`);
  }
  console.error(
    "\nThese words read as AI-generated marketing-speak. Rewrite the line " +
      "in plain founder voice. Internal code / comments may use them; this " +
      "guard only checks the translation files.",
  );
  process.exit(1);
}

console.log("✓ no AI-marketing tells in translation files");
