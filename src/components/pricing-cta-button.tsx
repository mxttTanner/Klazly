"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** Owner's Zalo deep link — plain chat, no ?message=. The pre-filled
 *  message lives in the modal so the user can edit before sending;
 *  the "Open Zalo" button auto-copies it to clipboard so they can
 *  paste straight away without needing to remember to hit Copy. We
 *  considered the ?message= query param but it's flaky across Zalo
 *  Web vs the mobile app, especially with URL-encoded newlines and
 *  Vietnamese diacritics — modal-first is reliable. */
const ZALO_URL = "https://zalo.me/84862404036";

export type PlanKey = "micro" | "monthly" | "annual";

/**
 * Pricing-card CTA that opens a Zalo-onboarding modal instead of
 * navigating. Centers manually sign up by sending an info template
 * to the owner's Zalo; no payment automation in MVP.
 *
 * Parent passes a fully-styled button class so each pricing tier can
 * have its own visual weight (outline / outline / solid-on-blue) while
 * sharing this single interaction.
 */
export function PricingCtaButton({
  planKey,
  buttonClassName,
  showArrow = false,
}: {
  planKey: PlanKey;
  buttonClassName: string;
  showArrow?: boolean;
}) {
  const t = useTranslations("pricingCta");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [autoCopied, setAutoCopied] = useState(false);

  // Resolve dynamic key against next-intl's typed message keys.
  // The keys exist; the typed `t()` doesn't know that at compile time.
  const tt = t as (key: string) => string;

  function handleOpen() {
    setMessage(tt(`templates.${planKey}`));
    setCopied(false);
    setAutoCopied(false);
    setOpen(true);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context, permissions) — user can
      // still select the textarea contents manually.
    }
  }

  async function handleOpenZalo() {
    // Auto-copy so a single click after editing = ready to paste in
    // Zalo. Don't block the window.open if clipboard fails.
    try {
      await navigator.clipboard.writeText(message);
      setAutoCopied(true);
    } catch {
      // ignore — user can copy manually
    }
    window.open(ZALO_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={buttonClassName}
      >
        {tt(`buttons.${planKey}`)}
        {showArrow ? <ArrowRight className="size-4" /> : null}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tt(`modalTitles.${planKey}`)}</DialogTitle>
            <DialogDescription className="leading-relaxed">
              {t("modalSubtitle")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label
              htmlFor="zalo-message"
              className="text-foreground text-sm font-medium"
            >
              {t("messageLabel")}
            </label>
            <Textarea
              id="zalo-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              className="font-mono text-xs leading-relaxed"
            />
            <p className="text-muted-foreground text-xs">{t("fillInHint")}</p>
            {autoCopied ? (
              <p className="text-emerald-600 inline-flex items-center gap-1 text-xs font-medium">
                <Check className="size-3.5" />
                {t("autoCopiedHint")}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="size-4" />
                  {t("copied")}
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  {t("copy")}
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={handleOpenZalo}
              className="bg-emerald-500 text-white hover:bg-emerald-600 inline-flex items-center gap-1.5 shadow-sm"
            >
              <MessageCircle className="size-4" />
              {t("openZalo")}
              <ExternalLink className="size-3.5 opacity-70" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
