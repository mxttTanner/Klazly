import { getTranslations } from "next-intl/server";
import { Sparkles, MessageCircle } from "lucide-react";
import { getFoundingStatus } from "@/lib/founding";

import { ZALO_URL, ZALO_PHONE_DISPLAY as PHONE_DISPLAY } from "@/lib/zalo";

/**
 * Right-side brand panel on /login. Quiet dark-navy surface with a small
 * abstract dashboard mockup and an authentic founder/Founding-Center
 * panel at the bottom — *not* fabricated testimonials.
 *
 * Server component — needs no client state. The Founding-Center spots
 * count is server-rendered so the panel matches the same live counter
 * shown on /super-admin and the public landing page.
 *
 * On mobile (< lg) this component hides — the form fills the screen.
 */
export async function LoginBrandPanel() {
  const t = await getTranslations("login");
  const tFounder = await getTranslations("founder");
  const status = await getFoundingStatus();

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

      {/* Authentic Founding-Center panel — dark-variant card so it sits
          on the navy background without a colour clash. */}
      <div className="relative border-white/10 border-t bg-navy px-10 py-6">
        <div className="ring-white/15 bg-white/5 rounded-xl p-4 ring-1">
          <div className="flex items-center gap-2.5">
            <span className="bg-white/10 text-slate-200 inline-flex size-8 items-center justify-center rounded-full ring-1 ring-white/15">
              <Sparkles className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-slate-300 text-[10px] font-semibold uppercase tracking-widest">
                {tFounder("programName")}
              </p>
              <p className="text-white mt-0.5 text-sm font-semibold">
                {status.isFull
                  ? tFounder("fullHeadlineShort")
                  : tFounder("openHeadlineShort", {
                      filled: status.filled,
                      cap: status.cap,
                    })}
              </p>
            </div>
          </div>
          <a
            href={ZALO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald hover:bg-emerald-light text-[#06281f] mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold shadow-sm transition-colors"
          >
            <MessageCircle className="size-3.5" />
            {status.isFull
              ? tFounder("waitlistCta")
              : tFounder("zaloCta")}
          </a>
        </div>
        <p className="text-slate-400 mt-3 text-[11px]">
          {tFounder("loginHelpHint")}{" "}
          <span className="text-slate-200 font-medium">{PHONE_DISPLAY}</span>
        </p>
      </div>
    </aside>
  );
}
