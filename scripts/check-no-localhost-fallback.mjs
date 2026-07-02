#!/usr/bin/env node
// Regression guard: fail the build if any file under src/ uses a
// "localhost" string as a fallback URL. We got bitten once when
// `process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"` ran
// on production and bounced logged-out users to their own laptop.
//
// Comments mentioning localhost are fine — we only flag uses inside
// string literals on lines that aren't comments. The check is
// intentionally narrow so it doesn't blow up on docs.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../src", import.meta.url));
const offenders = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry)) scan(p);
  }
}

function scan(file) {
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    // Skip pure comments — they often legitimately mention localhost
    // (e.g. dev-mode docs). We only care about runtime string literals.
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
    if (/["'`]http:\/\/localhost(:\d+)?/.test(line) ||
        /["'`]127\.0\.0\.1/.test(line)) {
      offenders.push({ file, line: i + 1, text: line.trim() });
    }
    // Old preview-deploy domain. The custom domain is klazly.com,
    // surfaced via NEXT_PUBLIC_APP_URL with klazly.com as the
    // fallback. Anything still hard-coding the vercel.app hostname
    // is a leftover from the rebrand and would publish stale URLs
    // in OG / sitemap / email links.
    if (/parent-portal-nine\.vercel\.app/.test(line)) {
      offenders.push({ file, line: i + 1, text: line.trim() });
    }
  }
}

walk(ROOT);

if (offenders.length > 0) {
  console.error("\n❌ Localhost URL literal found in src/:");
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}\n    ${o.text}`);
  }
  console.error(
    "\nUse request.url (route handlers) or window.location.origin (client) " +
      "as the redirect base. See src/app/logout/route.ts for the pattern.",
  );
  process.exit(1);
}

console.log("✓ no localhost URL fallbacks in src/");
