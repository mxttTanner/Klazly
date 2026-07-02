// Next.js instrumentation hook. Sentry uses this to register its
// runtime-specific config (node vs edge) at app boot.

import * as Sentry from "@sentry/nextjs";

// Force the Node runtime into Vietnam time so server-side new Date()
// calls produce VN-local calendar values. Vercel reserves the TZ env
// var (you can't set it via dashboard/CLI), so we set it in code
// before any other module loads — register() runs before any route
// is served, and process.env.TZ is read once by libc when the first
// Date method runs, so this captures the whole process.
//
// We only do this on the Node runtime; edge runtimes use Intl-based
// formatters that take explicit timeZone params, so process.env.TZ
// doesn't apply there.
if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.TZ) {
  process.env.TZ = "Asia/Ho_Chi_Minh";
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Next 15 introduced the `onRequestError` instrumentation hook. Sentry uses
// it to capture errors thrown in nested React Server Components. No-op
// without SENTRY_DSN, like the rest of the SDK config.
export const onRequestError = Sentry.captureRequestError;
