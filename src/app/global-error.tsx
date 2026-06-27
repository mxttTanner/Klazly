"use client";

import { useEffect, useMemo } from "react";
import * as Sentry from "@sentry/nextjs";
import { ZALO_URL } from "@/lib/zalo";

/**
 * Catastrophic-error boundary. Fires when the root layout itself
 * throws (next-intl provider crash, font load failure, etc.) — at
 * that point the regular error.tsx can't render because the layout
 * tree that hosts it is broken. global-error MUST render its own
 * <html> and <body>.
 *
 * It also can't rely on next-intl (the provider lives in the layout
 * that just exploded), so the copy here is inlined bilingually.
 *
 * Should be reached extremely rarely in practice. If a user ever
 * sees this, something fundamental shipped broken.
 */
export default function GlobalCatastrophicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const incidentId = useMemo(() => {
    try {
      const buf = new Uint8Array(4);
      crypto.getRandomValues(buf);
      return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      return Math.random().toString(16).slice(2, 10);
    }
  }, []);

  useEffect(() => {
    Sentry.captureException(error, {
      tags: { incident_id: incidentId, fatal: true },
      extra: { next_digest: error.digest ?? null },
    });
  }, [error, incidentId]);

  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          background: "#fafafa",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            maxWidth: "28rem",
            width: "100%",
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "1.75rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              width: "3rem",
              height: "3rem",
              background: "#fee2e2",
              color: "#b91c1c",
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "1rem",
            }}
          >
            !
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              margin: "0 0 0.5rem",
              letterSpacing: "-0.02em",
            }}
          >
            Đã có sự cố / Something went wrong
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#475569",
              margin: "0 0 0.5rem",
              lineHeight: 1.5,
            }}
          >
            Dữ liệu của bạn vẫn an toàn. Hãy thử tải lại trang.
          </p>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#475569",
              margin: "0 0 1.25rem",
              lineHeight: 1.5,
            }}
          >
            Your data is safe. Please try reloading the page.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#0f172a",
                color: "white",
                border: 0,
                borderRadius: "6px",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Tải lại / Reload
            </button>
            <a
              href={ZALO_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "white",
                color: "#0f172a",
                textDecoration: "none",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Nhắn Zalo / Message us
            </a>
          </div>
          <p
            style={{
              fontSize: "0.75rem",
              color: "#64748b",
              marginTop: "1rem",
              borderTop: "1px solid #e2e8f0",
              paddingTop: "0.75rem",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            ref: {incidentId}
          </p>
        </div>
      </body>
    </html>
  );
}
