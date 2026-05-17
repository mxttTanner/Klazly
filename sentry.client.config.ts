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
    // Drop noise that isn't actionable for us — these errors come
    // from the embedding environment (Zalo in-app browser, browser
    // extensions, mobile webview shims) and have nothing to do with
    // our code. If they reach our Sentry budget we burn quota chasing
    // bugs that don't exist on our side.
    ignoreErrors: [
      // Zalo in-app browser injects helper scripts that reference its
      // own SDK globals (zaloJSV2). When users open klazly.com inside
      // the Zalo Vietnam app, those scripts fire before the SDK loads
      // and throw on pages we haven't opted into. We don't load the
      // Zalo SDK ourselves and have nothing to do with this error.
      /zaloJSV2/i,
      // Facebook in-app browser equivalent — common when a center
      // owner taps a klazly.com link from a Facebook/Messenger DM.
      /fb_dtsg/i,
      // ResizeObserver loop limit — browser-level non-error that
      // some browsers surface as exceptions. Harmless; user-invisible.
      /ResizeObserver loop limit exceeded/i,
      /ResizeObserver loop completed with undelivered notifications/i,
      // Bitdefender + a few corporate browser extensions inject these
      // properties post-hydration; React flags them in dev as
      // attribute mismatches and some SDKs treat them as errors.
      /bis_skin_checked/i,
      // Network errors that aren't our problem to solve:
      //   - "Load failed" is Safari's idiom for a user-cancelled fetch
      //     (closing the tab mid-request)
      //   - AbortError fires whenever we ourselves cancel a fetch
      //     (e.g. dialog close mid-submit) — never indicates a bug
      /^Load failed$/,
      /AbortError/,
      // Script load errors from CDNs / third-party widgets that aren't
      // in our build. We don't load anything we can't host ourselves,
      // so these are by definition from injected scripts.
      /Script error\.?$/,
    ],
    // Belt-and-suspenders: also drop events whose first stack frame
    // doesn't reference our own bundle. Zalo / FB / extension scripts
    // run from chrome-extension://, file://, or unknown URLs.
    beforeSend(event) {
      const firstFrame =
        event.exception?.values?.[0]?.stacktrace?.frames?.slice(-1)[0];
      const filename = firstFrame?.filename ?? "";
      if (
        filename.startsWith("chrome-extension://") ||
        filename.startsWith("moz-extension://") ||
        filename.startsWith("safari-extension://") ||
        filename.startsWith("file://")
      ) {
        return null;
      }
      return event;
    },
  });
}
