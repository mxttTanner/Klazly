import { getTranslations } from "next-intl/server";
import { ClipboardList, Sparkles, MessageCircle } from "lucide-react";
import { getFoundingStatus } from "@/lib/founding";

const ZALO_URL = "https://zalo.me/84862404036";
const PHONE_DISPLAY = "+84 86 240 4036";

/**
 * Right-side brand panel on /login. Dark navy gradient with a small
 * abstract dashboard mockup and an authentic founder/Founding-Center
 * panel at the bottom — *not* fabricated testimonials (the previous
 * version rotated three fake quotes; those are now stripped).
 *
 * Server component now — needs no client state. The Founding-Center
 * spots count is server-rendered so the panel matches the same live
 * counter shown on /super-admin and the public landing page.
 *
 * On mobile (< lg) this component hides — the form fills the screen.
 */
export async function LoginBrandPanel() {
  const t = await getTranslations("login");
  const tFounder = await getTranslations("founder");
  const status = await getFoundingStatus();

  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white lg:flex lg:flex-col">
      {/* Ambient glows */}
      <div
        aria-hidden="true"
        className="from-primary/25 pointer-events-none absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-br to-transparent blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-1/4 size-[28rem] rounded-full bg-violet-500/10 blur-3xl"
      />

      {/* Headline + mockup */}
      <div className="relative flex flex-1 flex-col justify-center px-10 py-12">
        <span className="border-white/15 bg-white/5 inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tracking-wide backdrop-blur-sm">
          <Sparkles className="size-3 text-amber-300" />
          {t("brandEyebrow")}
        </span>
        <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
          {t("brandHeadline")}
        </h2>
        <p className="text-slate-300 mt-3 max-w-md text-sm leading-relaxed">
          {tFounder("loginTagline")}
        </p>

        {/* Floating mini-dashboard — abstracted, not the full app. */}
        <div className="mt-8 max-w-md">
          <div className="bg-slate-800/50 ring-slate-700/50 rounded-xl p-1.5 shadow-2xl shadow-slate-950/50 ring-1 backdrop-blur-md">
            <div className="bg-slate-900 mb-1 flex items-center gap-1 rounded-t-lg px-3 py-1.5">
              <span className="size-1.5 rounded-full bg-rose-400/70" />
              <span className="size-1.5 rounded-full bg-amber-400/70" />
              <span className="size-1.5 rounded-full bg-emerald-400/70" />
            </div>
            <div className="bg-background overflow-hidden rounded-md p-3">
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { l: "GV", v: "12", c: "bg-sky-500" },
                  { l: "PH", v: "84", c: "bg-rose-500" },
                  { l: "Lớp", v: "18", c: "bg-violet-500" },
                  { l: "HS", v: "126", c: "bg-amber-500" },
                ].map((card) => (
                  <div
                    key={card.l}
                    className="bg-card relative overflow-hidden rounded-md border p-1.5"
                  >
                    <div className={`absolute inset-x-0 top-0 h-0.5 ${card.c}`} />
                    <div className="text-muted-foreground text-[8px] uppercase">
                      {card.l}
                    </div>
                    <div className="text-foreground text-sm font-bold tabular-nums">
                      {card.v}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-card mt-2 rounded-md border p-2">
                <div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold">
                  <ClipboardList className="text-primary size-2.5" />
                  <span className="text-foreground">Hoạt động gần đây</span>
                </div>
                {[
                  "Cô Linh · Senior B · Unit 5",
                  "Cô Linh · Junior A · Unit 4",
                ].map((line) => (
                  <div
                    key={line}
                    className="text-muted-foreground border-t py-1 text-[9px] first:border-t-0"
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Authentic Founding-Center panel — replaces the previous
          rotating fake testimonials. Dark-variant card so it sits on
          the navy background without a colour clash. */}
      <div className="relative border-white/10 border-t bg-slate-950/40 px-10 py-6 backdrop-blur-sm">
        <div className="ring-white/15 bg-white/5 rounded-xl p-4 ring-1">
          <div className="flex items-center gap-2.5">
            <span className="bg-amber-400/15 text-amber-300 inline-flex size-8 items-center justify-center rounded-full ring-1 ring-amber-300/30">
              <Sparkles className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-amber-200 text-[10px] font-semibold uppercase tracking-widest">
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
            className="bg-emerald-500 hover:bg-emerald-400 text-white mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold shadow-sm transition"
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
