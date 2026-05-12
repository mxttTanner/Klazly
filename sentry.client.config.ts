// Sentry — browser. Loaded automatically by @sentry/nextjs.
// Stays a no-op if NEXT_PUBLIC_SENTRY_DSN isn't set, so local dev and
// pre-Sentry deploys don't error out.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Sampling: keep all errors (events), sample 10% of perf traces in
    // prod to stay under the free-tier quota.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Sessions / replay are off — we'll add if/when we need them.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    environment: process.env.NODE_ENV,
  });
}
