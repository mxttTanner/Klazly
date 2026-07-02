import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Worksheet uploads can be 5MB PDFs; default server action limit is 1MB.
    serverActions: { bodySizeLimit: "10mb" },
  },
  async headers() {
    return [
      {
        // Apply baseline security headers to every response. Vercel adds its
        // own defaults too; these tighten and document the policy here.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            // Report-Only so it CANNOT break the live site — it only logs
            // violations. Allowlist reflects what the app actually loads:
            // Supabase (Postgres/Auth over https + Realtime over wss),
            // Microsoft Clarity (analytics tag), and Sentry ingest (US +
            // DE regions, since the DSN host varies by project region).
            // Inter is self-hosted via next/font, so fonts need only self.
            // TODO: validate reports in Sentry/Clarity, then promote this
            // to the enforcing `Content-Security-Policy` header.
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://www.clarity.ms https://*.clarity.ms",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self'",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.clarity.ms https://*.clarity.ms https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

// Sentry wraps last so its webpack plugin sees the final config. When
// SENTRY_DSN isn't set the runtime SDK no-ops; this wrap is still safe.
export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  // Source maps are uploaded only when SENTRY_AUTH_TOKEN is configured.
  // Without it, the wrap stays a no-op at build time.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  // Replaces the deprecated `disableLogger: true` — same effect (strip
  // Sentry SDK debug-logging code from the production bundle), new
  // canonical config path per the Sentry SDK upgrade notice.
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
});
