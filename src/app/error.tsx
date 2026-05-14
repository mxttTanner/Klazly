"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

/**
 * Root error boundary. Server-component throws (Supabase timeout, bad UUID
 * cast, etc.) land here instead of the default Next.js error page. Keeps
 * the visit friendly with a clear retry + go-home path.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center px-4">
      <div className="bg-card max-w-md space-y-4 rounded-2xl border p-6 shadow-sm">
        <div className="bg-rose-50 text-rose-700 inline-flex size-12 items-center justify-center rounded-full">
          <AlertTriangle className="size-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-muted-foreground text-sm">
            Đã có sự cố ngoài ý muốn. Hãy thử tải lại trang. Nếu vẫn không
            được, quay lại trang chủ hoặc liên hệ trung tâm.
          </p>
          <p className="text-muted-foreground text-sm">
            An unexpected error happened. Try reloading; if it keeps failing,
            head back home or contact your center.
          </p>
        </div>
        {error.digest ? (
          <p className="text-muted-foreground font-mono text-xs">
            ref: {error.digest}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            <RefreshCw className="size-4" />
            Try again / Thử lại
          </button>
          <Link
            href="/"
            className="bg-muted text-foreground inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium hover:bg-muted/70"
          >
            <Home className="size-4" />
            Go home / Trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
