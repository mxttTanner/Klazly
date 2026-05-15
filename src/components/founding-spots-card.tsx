import { getTranslations } from "next-intl/server";
import { MessageCircle, Phone, Sparkles } from "lucide-react";
import type { FoundingStatus } from "@/lib/founding";
import {
  ZALO_URL,
  ZALO_TEL_URL,
  ZALO_PHONE_DISPLAY as PHONE_DISPLAY,
} from "@/lib/zalo";

/**
 * Public-facing "Founding Center spots remaining" card. Rendered on
 * landing, pricing, login, and demo so the scarcity messaging stays
 * consistent everywhere.
 *
 * Server component — needs no client state. Translations resolved
 * server-side so SSR is final.
 *
 * When `isFull`, the CTA + copy flip to a "join the waitlist for the
 * next cohort" tone so we never look like we're still pitching a slot
 * that doesn't exist.
 *
 * `variant="dark"` renders inverted for dark backgrounds (e.g. the
 * login brand panel). `variant="light"` is the default for the
 * landing/pricing surfaces.
 */
export async function FoundingSpotsCard({
  status,
  variant = "light",
  showQr = true,
}: {
  status: FoundingStatus;
  variant?: "light" | "dark";
  showQr?: boolean;
}) {
  const t = await getTranslations("founding");
  const { filled, cap, isFull } = status;
  const pct = Math.min(100, Math.max(0, (filled / Math.max(1, cap)) * 100));

  if (variant === "dark") {
    return (
      <div className="ring-white/15 bg-white/5 rounded-xl p-5 ring-1 backdrop-blur-sm">
        <div className="flex items-start gap-2.5">
          <span className="bg-amber-400/15 text-amber-300 inline-flex size-9 items-center justify-center rounded-full ring-1 ring-amber-300/30">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-amber-200 text-xs font-semibold uppercase tracking-widest">
              {t("programName")}
            </p>
            <p className="text-white mt-1 text-sm font-semibold">
              {isFull ? t("fullHeadlineShort") : t("openHeadlineShort", { filled, cap })}
            </p>
          </div>
        </div>
        <div
          className="bg-white/10 mt-3 h-1.5 w-full overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="bg-amber-400 h-full rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
        <a
          href={ZALO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-emerald-500 hover:bg-emerald-400 text-white mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold shadow-sm transition"
        >
          <MessageCircle className="size-3.5" />
          {isFull ? t("waitlistCta") : t("zaloCta")}
        </a>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/60 to-white p-6 shadow-sm sm:p-7">
      <div className="flex items-start gap-3">
        <span className="bg-amber-100 text-amber-700 ring-amber-200 inline-flex size-10 items-center justify-center rounded-full ring-1">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-amber-900 text-xs font-semibold uppercase tracking-widest">
            {t("programName")}
          </p>
          <p className="text-foreground mt-1 text-lg font-semibold">
            {isFull
              ? t("fullHeadline")
              : t("openHeadline", { filled, cap })}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div
          className="bg-muted h-2 w-full overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="bg-amber-500 h-full rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          {isFull ? t("fullSubtext") : t("openSubtext")}
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href={ZALO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold shadow-sm transition"
        >
          <MessageCircle className="size-4" />
          {isFull ? t("waitlistCta") : t("zaloCta")}
        </a>
        <a
          href={ZALO_TEL_URL}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs"
        >
          <Phone className="size-3.5" />
          {PHONE_DISPLAY}
        </a>
      </div>

      {showQr ? (
        <div className="border-amber-100 mt-5 flex items-center gap-4 border-t pt-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/zalo-qr.jpg"
            alt={t("zaloQrAlt")}
            width={96}
            height={96}
            className="bg-white shrink-0 rounded-lg border p-1 shadow-sm"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">{t("zaloQrHint")}</p>
            <p className="text-foreground mt-0.5 truncate text-sm font-medium">
              {PHONE_DISPLAY}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
