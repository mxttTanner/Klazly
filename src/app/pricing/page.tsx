import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Check,
  ChevronDown,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  Sparkles,
  X,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { PricingCtaButton } from "@/components/pricing-cta-button";
import { FoundingSpotsCard } from "@/components/founding-spots-card";
import { getFoundingStatus } from "@/lib/founding";

/**
 * Dedicated /pricing page. Extends the landing page's pricing teaser
 * with a comparison table, an extended "every plan includes" grid,
 * a pricing FAQ, a dark contact CTA, and a bottom guarantee bar.
 *
 * The three plan cards reuse the same PricingCtaButton component as
 * the landing pricing section, so any future change to onboarding
 * flow lands in both places automatically.
 */
export default async function PricingPage() {
  const t = await getTranslations("landing");
  const tPP = await getTranslations("pricingPage");
  const tCta = await getTranslations("pricingCta");
  const tFaq = await getTranslations("pricingPage");
  const tFounder = await getTranslations("founder");
  const foundingStatus = await getFoundingStatus();

  const includes = [
    tPP("include1"),
    tPP("include2"),
    tPP("include3"),
    tPP("include4"),
    tPP("include5"),
    tPP("include6"),
    tPP("include7"),
    tPP("include8"),
    tPP("include9"),
    tPP("include10"),
  ];

  const comparisonRows = [
    {
      label: tPP("compareRow1Label"),
      paper: tPP("compareRow1Paper"),
      zalo: tPP("compareRow1Zalo"),
      us: tPP("compareRow1Us"),
    },
    {
      label: tPP("compareRow2Label"),
      paper: tPP("compareRow2Paper"),
      zalo: tPP("compareRow2Zalo"),
      us: tPP("compareRow2Us"),
    },
    {
      label: tPP("compareRow3Label"),
      paper: tPP("compareRow3Paper"),
      zalo: tPP("compareRow3Zalo"),
      us: tPP("compareRow3Us"),
    },
    {
      label: tPP("compareRow4Label"),
      paper: tPP("compareRow4Paper"),
      zalo: tPP("compareRow4Zalo"),
      us: tPP("compareRow4Us"),
    },
    {
      label: tPP("compareRow5Label"),
      paper: tPP("compareRow5Paper"),
      zalo: tPP("compareRow5Zalo"),
      us: tPP("compareRow5Us"),
    },
    {
      label: tPP("compareRow6Label"),
      paper: tPP("compareRow6Paper"),
      zalo: tPP("compareRow6Zalo"),
      us: tPP("compareRow6Us"),
    },
  ];

  const faqs = [
    { q: tFaq("faq1Q"), a: tFaq("faq1A") },
    { q: tFaq("faq2Q"), a: tFaq("faq2A") },
    // faq3 intentionally omitted — covered 1:1 on Zalo for now.
    // JSON keys for faq3Q/A were removed; numbering stays as-is to
    // keep faq4–6 edits stable.
    { q: tFaq("faq4Q"), a: tFaq("faq4A") },
    { q: tFaq("faq5Q"), a: tFaq("faq5A") },
    { q: tFaq("faq6Q"), a: tFaq("faq6A") },
  ];

  return (
    <div className="min-h-dvh bg-background">
      {/* Sticky nav — matches the landing page treatment: brighter
          glass, animated gradient hairline (sky → primary → amber),
          nav links in a pill container, separators between toggle
          and login. */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div
          aria-hidden="true"
          className="from-sky-400 via-primary to-amber-400 absolute inset-x-0 top-0 h-px bg-gradient-to-r"
        />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link
            href="/"
            aria-label={t("brandAriaLabel")}
            className="flex min-w-0 items-center gap-2.5 transition hover:opacity-80"
          >
            <BrandLogo size="md" />
            <span className="border-emerald-200 bg-emerald-50 text-emerald-700 hidden items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest sm:inline-flex">
              <span className="relative inline-flex size-1">
                <span className="bg-emerald-500 absolute inset-0 rounded-full motion-safe:animate-ping motion-safe:opacity-75" />
                <span className="bg-emerald-500 relative inline-block size-1 rounded-full" />
              </span>
              Live
            </span>
          </Link>
          <nav className="hidden items-center rounded-full border bg-muted/40 p-1 md:flex">
            <Link
              href="/#features"
              className="text-muted-foreground hover:bg-background hover:text-foreground rounded-full px-3.5 py-1.5 text-sm font-medium transition hover:shadow-sm"
            >
              {t("navFeatures")}
            </Link>
            <Link
              href="/pricing"
              aria-current="page"
              className="bg-background text-primary rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-sm"
            >
              {t("navPricing")}
            </Link>
            <Link
              href="/demo"
              className="text-muted-foreground hover:bg-background hover:text-foreground rounded-full px-3.5 py-1.5 text-sm font-medium transition hover:shadow-sm"
            >
              {t("navDemo")}
            </Link>
            <Link
              href="/#contact"
              className="text-muted-foreground hover:bg-background hover:text-foreground rounded-full px-3.5 py-1.5 text-sm font-medium transition hover:shadow-sm"
            >
              {t("navContact")}
            </Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <div className="bg-border hidden h-5 w-px sm:block" />
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex shrink-0 items-center rounded-md px-2.5 py-1.5 text-sm font-medium transition sm:px-3"
            >
              {t("heroLoginCta")}
            </Link>
          </div>
        </div>
      </header>

      {/* HERO + 3 PRICING CARDS — merged into one richer section
          matching the landing page's pricing treatment: orbs +
          diagonal stripe pattern background, pulsing launch badge,
          tier ladder (micro → emerald confident → annual dominant
          with rotating glow ring + centered floating ribbon). */}
      <section
        id="pricing-cards"
        className="relative overflow-hidden border-b border-border bg-gradient-to-b from-zinc-50 via-zinc-50 to-zinc-100"
      >
        <div
          aria-hidden="true"
          className="bg-primary/10 pointer-events-none absolute -top-32 left-1/4 size-[32rem] rounded-full blur-3xl"
        />
        <div
          aria-hidden="true"
          className="bg-amber-200/30 pointer-events-none absolute -bottom-32 right-1/4 size-[28rem] rounded-full blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:repeating-linear-gradient(45deg,currentColor_0px,currentColor_1px,transparent_1px,transparent_14px)] text-foreground"
        />

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="bg-amber-100 text-amber-800 ring-amber-200 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-sm ring-1">
              <Sparkles className="size-3.5 motion-safe:animate-pulse" />
              {tPP("heroEyebrow")}
            </span>
            <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              {tPP("heroTitle")}
            </h1>
            <p className="text-muted-foreground mt-4 text-balance text-base sm:text-lg">
              {tPP("heroSubtitle")}
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-6xl items-stretch gap-5 overflow-visible lg:grid-cols-12">
            {/* 1 month — quietest tier */}
            <div className="bg-card group/tier relative flex flex-col rounded-2xl border p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md lg:col-span-3">
              <div className="bg-muted text-muted-foreground inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                {t("pricingMicroName")}
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                  {t("pricingMicroPrice")}
                </div>
                <div className="text-muted-foreground mt-1 text-sm">
                  {t("pricingMicroPeriod")}
                </div>
              </div>
              <p className="text-muted-foreground mt-4 text-sm">
                {t("pricingMicroNote")}
              </p>
              <div className="mt-auto pt-6">
                <PricingCtaButton
                  planKey="micro"
                  buttonClassName={`${buttonVariants({ variant: "outline", size: "lg" })} w-full`}
                />
                <p className="text-muted-foreground mt-2 text-center text-xs">
                  {tCta("trustLines.micro")}
                </p>
              </div>
            </div>

            {/* 6 months — middle tier with emerald gradient + savings badge */}
            <div className="group/tier relative flex flex-col rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/60 via-card to-card p-6 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg lg:col-span-4">
              <span className="bg-emerald-500 text-white absolute -top-3.5 left-6 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-lg shadow-emerald-500/30">
                <Sparkles className="size-3" />
                {t("pricingMonthlyBadge")}
              </span>
              <div className="text-emerald-700 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                {t("pricingMonthlyName")}
              </div>
              <div className="mt-4">
                <div className="text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
                  {t("pricingMonthlyPrice")}
                </div>
                <div className="text-muted-foreground mt-1 text-sm">
                  {t("pricingMonthlyPeriod")}
                </div>
              </div>
              <p className="text-muted-foreground mt-4 text-sm">
                {t("pricingMonthlyNote")}
              </p>
              <div className="mt-auto pt-6">
                <PricingCtaButton
                  planKey="monthly"
                  buttonClassName={`${buttonVariants({ variant: "default", size: "lg" })} w-full`}
                />
                <p className="text-muted-foreground mt-2 text-center text-xs">
                  {tCta("trustLines.monthly")}
                </p>
              </div>
            </div>

            {/* 12 months — DOMINANT — rotating conic-gradient ring +
                centered floating ribbon + mega numerals. Mirrors the
                landing page treatment exactly so the pricing CTA
                story is identical across both surfaces. */}
            <div className="klazly-glow-ring group/tier relative flex flex-col rounded-2xl bg-gradient-to-br from-primary via-primary to-blue-700 p-6 text-primary-foreground shadow-2xl shadow-primary/40 transition-all hover:-translate-y-1.5 hover:shadow-2xl sm:p-8 lg:col-span-5 lg:-mt-4">
              <div className="absolute inset-x-0 -top-4 flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-950 shadow-xl shadow-amber-500/40 ring-2 ring-amber-300/60">
                  <Sparkles className="size-3.5 motion-safe:animate-pulse" />
                  {tPP("annualBadge")}
                </span>
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top_right,rgb(255_255_255/0.12),transparent_50%)]"
              />
              <div className="relative mt-3 text-amber-200 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ring-1 ring-amber-300/40">
                {t("pricingAnnualName")}
              </div>
              <div className="relative mt-4">
                <div className="from-white via-white bg-gradient-to-b to-blue-100 bg-clip-text text-5xl font-bold tracking-tight tabular-nums text-transparent sm:text-6xl">
                  {t("pricingAnnualPrice")}
                </div>
                <div className="text-primary-foreground/80 mt-1 text-sm">
                  {t("pricingAnnualPeriod")}
                </div>
              </div>
              <div className="relative mt-2 inline-flex w-fit items-center gap-1.5 rounded-md bg-amber-400/20 px-2.5 py-1 text-xs font-semibold text-amber-200 ring-1 ring-amber-300/30">
                <Sparkles className="size-3" />
                {t("pricingAnnualEquivalent")}
              </div>
              <p className="text-primary-foreground/90 relative mt-4 text-sm leading-relaxed">
                {t("pricingAnnualNote")}
              </p>
              <div className="relative bg-white/10 ring-white/20 mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-xs leading-relaxed ring-1">
                <Lock className="text-amber-200 mt-0.5 size-3.5 shrink-0" />
                <p className="text-primary-foreground/95">
                  {tPP("lockInPill")}
                </p>
              </div>
              <div className="relative mt-auto pt-6">
                <PricingCtaButton
                  planKey="annual"
                  buttonClassName="bg-white text-primary hover:bg-amber-50 inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-md px-4 text-base font-bold shadow-lg ring-2 ring-white/20 transition hover:scale-[1.02]"
                  showArrow
                />
                <p className="text-primary-foreground/90 mt-3 inline-flex w-full items-center justify-center gap-1.5 text-center text-xs font-semibold">
                  <Lock className="size-3" />
                  {tCta("trustLines.annual")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EVERY PLAN INCLUDES — same role-colored check pill pattern
          as the landing page's includes panel. Pills rotate through
          sky/violet/rose/amber to tie back to the role-color system. */}
      <section className="bg-zinc-50 relative overflow-hidden border-b border-border">
        <div
          aria-hidden="true"
          className="bg-primary/5 pointer-events-none absolute -top-32 right-0 size-[28rem] rounded-full blur-3xl"
        />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {tPP("includesTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance">
              {tPP("includesSubtitle")}
            </p>
          </div>
          <div className="relative mt-10 overflow-hidden rounded-2xl border bg-card/80 p-6 shadow-sm backdrop-blur-sm sm:p-8">
            <div
              aria-hidden="true"
              className="from-primary absolute inset-x-0 top-0 h-1 bg-gradient-to-r via-emerald-500 to-amber-500"
            />
            <ul className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {includes.map((item, idx) => {
                // Cycle through role colours so the panel reads as
                // "everything ships with every plan" while still
                // carrying the role-palette identity.
                const tones = [
                  "bg-sky-100 text-sky-700",
                  "bg-violet-100 text-violet-700",
                  "bg-rose-100 text-rose-700",
                  "bg-amber-100 text-amber-700",
                ];
                const tone = tones[idx % tones.length];
                return (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full ${tone}`}>
                      <Check className="size-3" />
                    </span>
                    <span className="text-foreground leading-relaxed">{item}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {tPP("compareTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance text-lg">
              {tPP("compareSubtitle")}
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-4xl overflow-x-auto rounded-2xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="px-4 py-3 text-left font-semibold text-foreground sm:px-6"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-6">
                    {tPP("compareColPaper")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-6">
                    {tPP("compareColZalo")}
                  </th>
                  <th className="bg-primary/5 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-primary sm:px-6">
                    {tPP("compareColUs")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <td className="px-4 py-4 font-medium text-foreground sm:px-6">
                      {row.label}
                    </td>
                    <td className="text-muted-foreground px-4 py-4 sm:px-6">
                      <span className="inline-flex items-start gap-1.5">
                        <X className="text-rose-400 mt-0.5 size-3.5 shrink-0" />
                        {row.paper}
                      </span>
                    </td>
                    <td className="text-muted-foreground px-4 py-4 sm:px-6">
                      <span className="inline-flex items-start gap-1.5">
                        <X className="text-rose-400 mt-0.5 size-3.5 shrink-0" />
                        {row.zalo}
                      </span>
                    </td>
                    <td className="bg-primary/5 px-4 py-4 font-medium text-foreground sm:px-6">
                      <span className="inline-flex items-start gap-1.5">
                        <Check className="text-emerald-600 mt-0.5 size-4 shrink-0" />
                        {row.us}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PRICING FAQ — numbered-chip accordion matching the landing
          FAQ treatment (open state lifts, gets primary ring, gradient
          wash on the summary row, chevron lives in a pill). */}
      <section className="bg-background relative overflow-hidden border-b border-border">
        <div
          aria-hidden="true"
          className="bg-primary/5 pointer-events-none absolute -top-32 right-0 size-[28rem] rounded-full blur-3xl"
        />
        <div
          aria-hidden="true"
          className="bg-violet-200/20 pointer-events-none absolute -bottom-32 -left-32 size-[28rem] rounded-full blur-3xl"
        />
        <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center">
            <span className="bg-primary/10 text-primary ring-primary/20 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ring-1">
              FAQ
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              {tPP("faqTitle")}
            </h2>
            <p className="text-muted-foreground mt-4 text-balance text-lg">
              {tPP("faqSubtitle")}
            </p>
          </div>
          <div className="mt-12 space-y-3">
            {faqs.map((f, i) => (
              <details
                key={i}
                className="group bg-card rounded-xl border shadow-sm transition-all open:-translate-y-0.5 open:border-primary/40 open:shadow-lg open:ring-1 open:ring-primary/20 hover:border-primary/20 hover:shadow-md"
              >
                <summary className="flex min-h-14 cursor-pointer items-center gap-4 rounded-xl px-5 py-4 text-sm font-semibold transition group-open:bg-gradient-to-r group-open:from-primary/[0.04] group-open:to-transparent hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
                  <span className="bg-primary/10 text-primary group-open:bg-primary group-open:text-primary-foreground group-open:shadow-md group-open:shadow-primary/30 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums transition-all">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-balance text-base">{f.q}</span>
                  <span className="bg-muted/60 text-muted-foreground group-open:bg-primary group-open:text-primary-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-full transition">
                    <ChevronDown className="size-3.5 transition group-open:rotate-180" />
                  </span>
                </summary>
                <div className="text-muted-foreground ml-12 border-t px-5 pb-5 pt-4 text-sm leading-relaxed">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FOUNDING-CENTER SCARCITY — sits just above the final CTA
          so anyone who scrolled this far sees the live spot count
          before deciding. Same source-of-truth as the landing page
          and super-admin dashboard. */}
      <section className="border-y border-amber-100 bg-amber-50/30">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-14">
          <div className="mb-5 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {tFounder("pricingPanelTitle")}
            </h2>
            <p className="text-muted-foreground mt-2 text-balance text-sm">
              {tFounder("pricingPanelSubtitle")}
            </p>
          </div>
          <FoundingSpotsCard status={foundingStatus} showQr={false} />
        </div>
      </section>

      {/* FINAL DARK CTA — matches the landing's treatment: drifting
          mesh orbs + dot-grid backdrop + gradient title + bigger
          primary CTA + emerald-tinted contact card with pulsing dot. */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        />
        <div
          aria-hidden="true"
          className="klazly-drift-a from-primary/30 absolute -top-20 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-br to-transparent blur-3xl"
        />
        <div
          aria-hidden="true"
          className="klazly-drift-b absolute bottom-0 right-10 size-[28rem] rounded-full bg-amber-500/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="klazly-drift-a absolute bottom-10 -left-20 size-[24rem] rounded-full bg-emerald-500/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div className="text-center md:text-left">
              <span className="border-white/15 bg-white/5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest backdrop-blur-sm">
                <span className="relative inline-flex size-1.5">
                  <span className="bg-amber-400 absolute inset-0 rounded-full motion-safe:animate-ping motion-safe:opacity-75" />
                  <span className="bg-amber-400 relative inline-block size-1.5 rounded-full" />
                </span>
                {t("trustTrial")}
              </span>
              <h2 className="mt-5 text-balance bg-gradient-to-br from-white via-white to-slate-300 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-5xl">
                {tPP("ctaTitle")}
              </h2>
              <p className="text-slate-300 mt-5 max-w-xl text-balance text-lg md:max-w-md">
                {tPP("ctaSubtitle")}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                <a
                  href="https://zalo.me/84862404036"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-500 text-white hover:bg-emerald-400 inline-flex items-center gap-2 rounded-lg px-7 py-3.5 text-base font-bold shadow-2xl shadow-emerald-500/40 ring-2 ring-emerald-400/40 transition-all hover:scale-[1.03]"
                >
                  <MessageCircle className="size-4" />
                  {t("ctaZalo")}
                </a>
                <a
                  href="tel:+84862404036"
                  className="border-white/20 bg-white/5 hover:bg-white/10 inline-flex items-center gap-2 rounded-lg border px-7 py-3.5 text-base font-semibold backdrop-blur-sm transition hover:border-white/30"
                >
                  <Phone className="size-4" />
                  +84 86 240 4036
                </a>
              </div>
              <p className="text-slate-400 mt-6 inline-flex items-center gap-1.5 text-sm">
                <Mail className="size-3.5 text-emerald-400" />
                <a
                  href="mailto:matthewstadlers14@gmail.com"
                  className="hover:text-white"
                >
                  matthewstadlers14@gmail.com
                </a>
              </p>
            </div>

            <aside className="ring-emerald-400/20 relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white/[0.06] p-6 shadow-2xl shadow-black/40 ring-1 backdrop-blur-md">
              <div
                aria-hidden="true"
                className="bg-emerald-500/20 pointer-events-none absolute -bottom-12 -right-12 size-40 rounded-full blur-3xl"
              />
              <div className="relative">
                <p className="text-slate-300 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                  <span className="relative inline-flex size-1.5">
                    <span className="bg-emerald-400 absolute inset-0 rounded-full motion-safe:animate-ping motion-safe:opacity-75" />
                    <span className="bg-emerald-400 relative inline-block size-1.5 rounded-full" />
                  </span>
                  {t("contactCardLabel")}
                </p>
                <div className="mt-4 flex flex-col items-center text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/zalo-qr.jpg"
                    alt={t("zaloQrAlt")}
                    width={200}
                    height={200}
                    className="bg-white ring-amber-300/40 h-[200px] w-[200px] rounded-xl object-contain p-2 shadow-2xl ring-4 transition-transform hover:scale-[1.03]"
                  />
                  <p className="text-slate-200 mt-3 text-sm font-medium">
                    {t("contactCardScanHint")}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* GUARANTEE BAR */}
      <section className="bg-emerald-50/60 border-t border-emerald-100">
        <div className="mx-auto max-w-6xl px-4 py-5 text-center sm:px-6">
          <p className="text-emerald-900 inline-flex flex-wrap items-center justify-center gap-2 text-sm font-medium">
            <Check className="size-4 text-emerald-600" />
            <span>{tPP("guaranteeBar")}</span>
          </p>
        </div>
      </section>

      {/* Footer — minimal, just brand + back-to-home */}
      <footer className="bg-slate-950 text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-white">
            <BrandLogo size="sm" />
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/legal/terms" className="hover:text-white">
              {t("footerTerms")}
            </Link>
            <Link href="/legal/privacy" className="hover:text-white">
              {t("footerPrivacy")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
