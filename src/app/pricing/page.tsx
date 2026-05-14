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
    { q: tFaq("faq3Q"), a: tFaq("faq3A") },
    { q: tFaq("faq4Q"), a: tFaq("faq4A") },
    { q: tFaq("faq5Q"), a: tFaq("faq5A") },
    { q: tFaq("faq6Q"), a: tFaq("faq6A") },
  ];

  return (
    <div className="min-h-dvh bg-background">
      {/* Sticky nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 shadow-[0_1px_3px_-1px_rgb(0_0_0/0.06)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/"
            aria-label={t("brandAriaLabel")}
            className="inline-flex"
          >
            <BrandLogo size="md" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/#features"
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm font-medium transition"
            >
              {t("navFeatures")}
            </Link>
            <Link
              href="/pricing"
              aria-current="page"
              className="text-primary rounded-md px-3 py-1.5 text-sm font-semibold"
            >
              {t("navPricing")}
            </Link>
            <Link
              href="/demo"
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm font-medium transition"
            >
              {t("navDemo")}
            </Link>
            <Link
              href="/#contact"
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm font-medium transition"
            >
              {t("navContact")}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground hidden rounded-md px-3 py-1.5 text-sm font-medium transition sm:inline-flex"
            >
              {t("heroLoginCta")}
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="border-b border-border bg-zinc-50">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <span className="bg-amber-100 text-amber-800 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="size-3.5" />
            {tPP("heroEyebrow")}
          </span>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            {tPP("heroTitle")}
          </h1>
          <p className="text-muted-foreground mt-4 text-balance text-lg">
            {tPP("heroSubtitle")}
          </p>
        </div>
      </section>

      {/* 3 PRICING CARDS */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-6xl items-stretch gap-5 lg:grid-cols-12">
            {/* 1 month */}
            <div className="bg-card group/tier flex flex-col rounded-2xl border p-6 opacity-95 shadow-sm transition-all hover:opacity-100 hover:shadow-md lg:col-span-3">
              <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                {t("pricingMicroName")}
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight tabular-nums">
                  {t("pricingMicroPrice")}
                </div>
                <div className="text-muted-foreground text-xs">
                  {t("pricingMicroPeriod")}
                </div>
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
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

            {/* 6 months */}
            <div className="bg-card group/tier relative flex flex-col rounded-2xl border p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md lg:col-span-4">
              <div className="bg-emerald-100 text-emerald-800 absolute -top-3 right-6 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold">
                {t("pricingMonthlyBadge")}
              </div>
              <div className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">
                {t("pricingMonthlyName")}
              </div>
              <div className="mt-3">
                <div className="text-3xl font-bold tracking-tight tabular-nums">
                  {t("pricingMonthlyPrice")}
                </div>
                <div className="text-muted-foreground text-sm">
                  {t("pricingMonthlyPeriod")}
                </div>
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
                {t("pricingMonthlyNote")}
              </p>
              <div className="mt-auto pt-6">
                <PricingCtaButton
                  planKey="monthly"
                  buttonClassName={`${buttonVariants({ variant: "outline", size: "lg" })} w-full`}
                />
                <p className="text-muted-foreground mt-2 text-center text-xs">
                  {tCta("trustLines.monthly")}
                </p>
              </div>
            </div>

            {/* 12 months — DOMINANT */}
            <div className="group/tier relative flex flex-col rounded-2xl bg-primary p-6 text-primary-foreground shadow-2xl shadow-primary/30 transition-all hover:-translate-y-1 hover:shadow-2xl sm:p-8 lg:col-span-5 lg:scale-[1.02]">
              <div className="absolute -top-3 right-6 inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-950 shadow">
                <Sparkles className="size-3" />
                {tPP("annualBadge")}
              </div>
              <div className="text-primary-foreground/80 text-sm font-semibold uppercase tracking-wider">
                {t("pricingAnnualName")}
              </div>
              <div className="mt-3">
                <div className="text-4xl font-bold tracking-tight tabular-nums">
                  {t("pricingAnnualPrice")}
                </div>
                <div className="text-primary-foreground/80 text-sm">
                  {t("pricingAnnualPeriod")}
                </div>
              </div>
              <p className="text-primary-foreground/85 mt-1 text-xs">
                {t("pricingAnnualEquivalent")}
              </p>
              <p className="text-primary-foreground/90 mt-3 text-sm leading-relaxed">
                {t("pricingAnnualNote")}
              </p>
              <div className="bg-white/10 ring-white/20 mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-xs leading-relaxed ring-1">
                <Lock className="text-amber-200 mt-0.5 size-3.5 shrink-0" />
                <p className="text-primary-foreground/95">
                  {tPP("lockInPill")}
                </p>
              </div>
              <div className="mt-auto pt-6">
                <PricingCtaButton
                  planKey="annual"
                  buttonClassName="bg-background text-primary hover:bg-background/90 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-md px-4 text-base font-semibold shadow-md transition"
                  showArrow
                />
                <p className="text-primary-foreground/85 mt-2 inline-flex w-full items-center justify-center gap-1 text-center text-xs font-medium">
                  <Lock className="size-3" />
                  {tCta("trustLines.annual")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EVERY PLAN INCLUDES */}
      <section className="bg-zinc-50 border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {tPP("includesTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance">
              {tPP("includesSubtitle")}
            </p>
          </div>
          <ul className="bg-card mt-10 grid gap-3 rounded-2xl border p-6 text-sm shadow-sm sm:grid-cols-2 lg:grid-cols-3">
            {includes.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="text-emerald-600 mt-0.5 size-4 shrink-0" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
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

      {/* PRICING FAQ */}
      <section className="bg-zinc-50 border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {tPP("faqTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance text-lg">
              {tPP("faqSubtitle")}
            </p>
          </div>
          <div className="mt-10 space-y-3">
            {faqs.map((f, i) => (
              <details
                key={i}
                className="group bg-card rounded-xl border shadow-sm"
              >
                <summary className="hover:bg-muted/40 flex cursor-pointer items-center justify-between gap-3 rounded-xl px-5 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  <span>{f.q}</span>
                  <ChevronDown className="text-muted-foreground size-4 shrink-0 transition group-open:rotate-180" />
                </summary>
                <div className="text-muted-foreground border-t px-5 pb-4 pt-3 text-sm leading-relaxed">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL DARK CTA WITH ZALO QR */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div
          aria-hidden="true"
          className="from-primary/20 absolute -top-20 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-br to-transparent blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div className="text-center lg:text-left">
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                {tPP("ctaTitle")}
              </h2>
              <p className="text-slate-300 mt-4 max-w-xl text-balance text-lg">
                {tPP("ctaSubtitle")}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <a
                  href="https://zalo.me/84862404036"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-500 text-white hover:bg-emerald-400 inline-flex items-center gap-2 rounded-md px-6 py-3 text-base font-semibold shadow-lg transition"
                >
                  <MessageCircle className="size-4" />
                  {t("ctaZalo")}
                </a>
                <a
                  href="tel:+84862404036"
                  className="border-white/20 bg-white/5 hover:bg-white/10 inline-flex items-center gap-2 rounded-md border px-6 py-3 text-base font-medium backdrop-blur-sm transition"
                >
                  <Phone className="size-4" />
                  +84 86 240 4036
                </a>
              </div>
              <p className="text-slate-400 mt-4 inline-flex items-center gap-1.5 text-sm">
                <Mail className="size-3.5" />
                <a
                  href="mailto:matthewstadlers14@gmail.com"
                  className="hover:text-white"
                >
                  matthewstadlers14@gmail.com
                </a>
              </p>
            </div>

            <aside className="bg-white/5 ring-white/10 mx-auto w-full max-w-sm rounded-2xl p-6 backdrop-blur-sm ring-1">
              <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest">
                {t("contactCardLabel")}
              </p>
              <div className="mt-4 flex flex-col items-center text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/zalo-qr.jpg"
                  alt={t("zaloQrAlt")}
                  width={200}
                  height={200}
                  className="bg-white h-[200px] w-[200px] rounded-xl object-contain p-2 shadow-lg"
                />
                <p className="text-slate-200 mt-3 text-sm font-medium">
                  {t("contactCardScanHint")}
                </p>
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
