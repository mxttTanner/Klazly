"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ClipboardList, Sparkles } from "lucide-react";

/**
 * Right-side brand panel on /login. Dark navy gradient, ambient glow,
 * floating dashboard mockup, and a rotating testimonial pinned at
 * bottom. Client component because of the testimonial rotation.
 *
 * On mobile (< lg) this component hides — the form fills the screen.
 * The auth/forgot-password + reset-password screens reuse the same
 * pattern via their own copies of this layout if we want; for now
 * only /login uses it.
 */
export function LoginBrandPanel() {
  const t = useTranslations("login");

  // Three quotes rotate every 7 seconds. Static index on first paint
  // so SSR + client agree.
  const quotes = [
    {
      quote: t("testimonial1Quote"),
      name: t("testimonial1Name"),
      role: t("testimonial1Role"),
    },
    {
      quote: t("testimonial2Quote"),
      name: t("testimonial2Name"),
      role: t("testimonial2Role"),
    },
    {
      quote: t("testimonial3Quote"),
      name: t("testimonial3Name"),
      role: t("testimonial3Role"),
    },
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(
      () => setIdx((i) => (i + 1) % quotes.length),
      7000,
    );
    return () => window.clearInterval(id);
  }, [quotes.length]);
  const q = quotes[idx];

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
          {t("brandSubtitle")}
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
                  "Cô Hương · Senior B · Unit 5",
                  "Cô Hương · Junior A · Unit 4",
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

      {/* Rotating testimonial pinned at bottom. Fades on rotation via
          key prop forcing a remount. */}
      <div className="relative border-white/10 border-t bg-slate-950/40 px-10 py-6 backdrop-blur-sm">
        <figure key={idx} className="animate-in fade-in duration-700">
          <blockquote className="text-slate-200 text-sm leading-relaxed">
            &ldquo;{q.quote}&rdquo;
          </blockquote>
          <figcaption className="text-slate-400 mt-3 flex items-center gap-2 text-xs">
            <span className="bg-primary/20 text-primary inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold ring-1 ring-primary/30">
              {q.name.trim().split(/\s+/).slice(-1)[0]?.charAt(0) ?? "?"}
            </span>
            <span>
              <span className="text-slate-200 font-medium">{q.name}</span>
              <span className="text-slate-500"> · {q.role}</span>
            </span>
          </figcaption>
        </figure>
        {/* Pagination dots */}
        <div className="mt-4 flex items-center gap-1.5">
          {quotes.map((_, i) => (
            <span
              key={i}
              className={
                "h-1 rounded-full transition-all " +
                (i === idx ? "w-6 bg-white/70" : "w-1.5 bg-white/20")
              }
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
