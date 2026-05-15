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
  // EN
  { rx: /\bleverage(s|d|ing)?\b/i, label: "leverage" },
  { rx: /\bseamlessly\b/i, label: "seamlessly" },
  { rx: /\brobust\b/i, label: "robust" },
  { rx: /\bempower(s|ed|ing)?\b/i, label: "empower" },
  { rx: /\bcutting[-\s]edge\b/i, label: "cutting-edge" },
  { rx: /\bgame[-\s]changing\b/i, label: "game-changing" },
  // VI
  { rx: /giải\s+pháp\s+toàn\s+diện/i, label: "giải pháp toàn diện" },
  { rx: /trải\s+nghiệm\s+tuyệt\s+vời/i, label: "trải nghiệm tuyệt vời" },
  { rx: /đột\s+phá/i, label: "đột phá" },
  { rx: /cuộc\s+cách\s+mạng/i, label: "cuộc cách mạng" },
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
