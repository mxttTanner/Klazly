"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Activity,
  ArrowLeft,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { ZALO_URL } from "@/lib/zalo";

type Segment = "admin" | "teacher" | "parent" | "super-admin";

const SEGMENT_HOME: Record<Segment, string> = {
  admin: "/admin",
  teacher: "/teacher",
  parent: "/parent",
  "super-admin": "/super-admin",
};

/**
 * Per-segment error boundary. Same shell as the root error.tsx but
 * tags Sentry with the segment (so a broken admin page doesn't get
 * lumped in with a broken parent page in alerts) and offers a
 * "back to [segment] home" escape hatch so the user can recover
 * without retrying the failing page.
 */
export function SegmentErrorBoundary({
  error,
  reset,
  segment,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  segment: Segment;
}) {
  const t = useTranslations("errorPage");

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
      tags: { incident_id: incidentId, segment },
      extra: { next_digest: error.digest ?? null },
    });
  }, [error, incidentId, segment]);

  const homeHref = SEGMENT_HOME[segment];
  const backLabelKey = (
    {
      admin: "backToAdmin",
      teacher: "backToTeacher",
      parent: "backToParent",
      "super-admin": "backToSuperAdmin",
    } as const
  )[segment];

  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-4">
      <div className="bg-card w-full max-w-md space-y-5 rounded-2xl border p-6 shadow-sm sm:p-7">
        <div className="bg-destructive/10 text-destructive ring-destructive/20 inline-flex size-12 items-center justify-center rounded-full ring-1">
          <AlertTriangle className="size-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t("body")}
          </p>
          <p className="text-success text-sm font-medium">
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
          <Link
            href={homeHref}
            className="bg-secondary text-secondary-foreground inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            <ArrowLeft className="size-4" />
            {t(backLabelKey)}
          </Link>
          <a
            href={ZALO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="border-border bg-background text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium"
          >
            <MessageCircle className="size-4" />
            {t("zalo")}
          </a>
          <Link
            href="/status"
            className="bg-muted text-foreground hover:bg-muted/70 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium"
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
