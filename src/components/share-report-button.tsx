"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/**
 * "Share via Zalo" action on the parent report.
 *
 * On a phone the Web Share API opens the OS share sheet, where the
 * parent picks Zalo (or any chat app) and forwards the report link —
 * this is how parents actually send a child's progress to ông bà.
 * On desktop / browsers without the share sheet we fall back to
 * copying the link, with a brief inline "copied" confirmation (the
 * app doesn't mount a global toaster, so we keep feedback local).
 *
 * Note: the link points at the authenticated report page, so the
 * recipient sees it only when signed in as the parent. A truly public
 * shareable PDF/tokenized link is the planned follow-up; this still
 * lets a parent forward the report to their own devices and pull it
 * up in Zalo to save-as-PDF and attach.
 */
export function ShareReportButton({
  label,
  copiedLabel,
  shareTitle,
}: {
  label: string;
  copiedLabel: string;
  shareTitle: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url });
      } catch {
        // user dismissed the share sheet — nothing to do
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — no-op; the print button is the fallback path
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
    >
      {copied ? (
        <Check className="size-4" />
      ) : (
        <Share2 className="size-4" />
      )}
      {copied ? copiedLabel : label}
    </button>
  );
}
