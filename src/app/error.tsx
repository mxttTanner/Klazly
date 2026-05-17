"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, MessageCircle, RefreshCw, Activity } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { ZALO_URL } from "@/lib/zalo";

/**
 * Root error boundary. Server-component throws (Supabase timeout, bad
 * UUID cast, RLS surprise) land here instead of the default Next.js
 * error page.
 *
 * Customer-facing contract:
 *   - Plain language. No stack trace.
 *   - Data-is-safe reassurance.
 *   - Three escape hatches: retry, status page, Zalo.
 *   - A short incident ID the user can paste to me on Zalo so I can
 *     find the matching Sentry event without digging through digests.
 *
 * The incident ID is generated client-side (cryptographically random)
 * because Next.js' built-in `error.digest` is only present for server
 * components and only after a deployed build — it's empty in dev and
 * when an error originates in a client component. Our own ID covers
 * both cases.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorPage");

  // Stable per-incident ID. Eight hex chars is short enough to read
  // over the phone but big enough to uniquely identify within a
  // window of incidents on the same day.
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
      tags: { incident_id: incidentId },
      extra: { next_digest: error.digest ?? null },
    });
  }, [error, incidentId]);

  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-4">
      <div className="bg-card w-full max-w-md space-y-5 rounded-2xl border p-6 shadow-sm sm:p-7">
        <div className="bg-rose-50 text-rose-700 ring-rose-200 inline-flex size-12 items-center justify-center rounded-full ring-1">
          <AlertTriangle className="size-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t("body")}
          </p>
          <p className="text-emerald-700 text-sm font-medium">
            {t("dataSafe")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            <RefreshCw className="size-4" />
            {t("retry")}
          </button>
          <a
            href={ZALO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-600 text-white inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium hover:bg-emerald-500"
          >
            <MessageCircle className="size-4" />
            {t("zalo")}
          </a>
          <Link
            href="/status"
            className="bg-muted text-foreground inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium hover:bg-muted/70"
          >
            <Activity className="size-4" />
            {t("status")}
          </Link>
        </div>

        <div className="border-t pt-3">
          <p className="text-muted-foreground text-xs">
            {t("incidentId")}
            <span className="text-foreground ml-1.5 font-mono font-medium">
              {incidentId}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
