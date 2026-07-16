import { getTranslations } from "next-intl/server";
import { Sparkles, MessageCircle } from "lucide-react";

import { ZALO_URL, ZALO_PHONE_DISPLAY as PHONE_DISPLAY } from "@/lib/zalo";

/**
 * Right-side brand panel on /login. Quiet dark-navy surface with a small
 * product screenshot and a founder tagline plus a Zalo contact card.
 *
 * Server component — needs no client state.
 *
 * On mobile (< lg) this component hides — the form fills the screen.
 */
export async function LoginBrandPanel() {
  const t = await getTranslations("login");
  const tFounder = await getTranslations("founder");
  const tHome = await getTranslations("home");

  return (
    <aside className="relative hidden overflow-hidden bg-navy text-white lg:flex lg:flex-col">
      {/* Headline + mockup */}
      <div className="relative flex flex-1 flex-col justify-center px-10 py-12">
        <span className="border-white/15 bg-white/5 inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tracking-wide">
          <Sparkles className="text-slate-300 size-3" />
          {t("brandEyebrow")}
        </span>
        <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
          {t("brandHeadline")}
        </h2>
        <p className="text-slate-300 mt-3 max-w-md text-sm leading-relaxed">
          {tFounder("loginTagline")}
        </p>

        {/* Real product screenshot of the owner dashboard. */}
        <div className="mt-8 max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/shots/admin.png"
            alt={t("brandHeadline")}
            className="w-full rounded-xl border border-white/10 shadow-2xl"
          />
        </div>
      </div>

      {/* Contact card — a direct line to the founder over Zalo. */}
      <div className="relative border-white/10 border-t bg-navy px-10 py-6">
        <a
          href={ZALO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-emerald hover:bg-emerald-light text-[#06281f] inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold shadow-sm transition-colors"
        >
          <MessageCircle className="size-3.5" />
          {tHome("zaloCta")}
        </a>
        <p className="text-slate-400 mt-3 text-[11px]">
          {tFounder("loginHelpHint")}{" "}
          <span className="text-slate-200 font-medium">{PHONE_DISPLAY}</span>
        </p>
      </div>
    </aside>
  );
}
