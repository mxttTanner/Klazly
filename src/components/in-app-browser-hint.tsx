"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, X } from "lucide-react";
import { isInAppBrowserUserAgent } from "@/lib/zalo";

/**
 * Sticky hint banner shown when the page is loaded inside an
 * in-app browser (Facebook Messenger, Instagram, WeChat, Line).
 * In those environments, tapping a https://zalo.me/... link often
 * fails silently — the user sees nothing happen and assumes the
 * button is broken.
 *
 * Detection runs once on mount (no SSR — userAgent is unreliable
 * server-side in this codebase since we don't pin it). The banner
 * is dismissible per-session via sessionStorage so a power user
 * who already knows the workaround can hide it.
 *
 * Mount this once near the root of any public-facing layout
 * (landing, pricing, login). Authed layouts don't need it — once
 * a user is signed in they're already inside their normal browser.
 */
export function InAppBrowserHint() {
  const t = useTranslations("inAppHint");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isInAppBrowserUserAgent(window.navigator.userAgent)) return;
    try {
      if (window.sessionStorage.getItem("hideInAppHint") === "1") return;
    } catch {
      /* sessionStorage can throw in some webviews — fall through */
    }
    setShow(true);
  }, []);

  if (!show) return null;

  function dismiss() {
    try {
      window.sessionStorage.setItem("hideInAppHint", "1");
    } catch {
      /* swallow — dismissing is a session nicety, not critical */
    }
    setShow(false);
  }

  return (
    <div
      role="status"
      className="bg-warning/10 text-foreground border-b border-warning/30 fixed inset-x-0 top-0 z-50 print:hidden"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="mx-auto flex max-w-3xl items-start gap-3 px-4 py-2.5 text-xs sm:px-6 sm:text-sm">
        <ExternalLink className="size-4 shrink-0 mt-0.5" />
        <p className="flex-1 leading-snug">{t("body")}</p>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismiss")}
          className="text-muted-foreground hover:text-foreground shrink-0 -mr-1"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
