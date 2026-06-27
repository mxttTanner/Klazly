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
import { ScrollReveal } from "@/components/scroll-reveal";
import { PricingCtaButton } from "@/components/pricing-cta-button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
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
    <div
      className="min-h-dvh bg-background"
      // Scope the brand accent to emerald for this whole marketing page
      // by overriding --primary on the subtree, so every bg-primary /
      // text-primary / ring-primary lands on emerald without per-element
      // edits. The shared dark nav/footer use their own navy tokens.
      style={
        {
          // emerald-dark so accent text/links stay readable on white;
          // foreground is white for any emerald fills. The highlighted
          // annual card is navy (set explicitly below), not emerald.
          "--primary": "oklch(0.54 0.12 162)",
          "--primary-foreground": "oklch(0.99 0 0)",
          "--ring": "oklch(0.54 0.12 162)",
        } as React.CSSProperties
      }
    >
      <SiteNav active="pricing" />

      {/* HERO + 3 PRICING CARDS — quiet off-white band, single accent.
          Tier ladder: micro (quiet outline) → 6-month (raised neutral)
          → annual (dominant, solid primary fill). Dominance comes from
          size + weight + fill, not glows or rainbow. */}
      <section
        id="pricing-cards"
        className="relative overflow-hidden border-b border-border bg-muted/30"
      >
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <ScrollReveal className="mx-auto max-w-2xl text-center">
            <span className="bg-primary/10 text-primary ring-primary/20 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1">
              <Sparkles className="size-3.5" />
              {tPP("heroEyebrow")}
            </span>
            <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              {tPP("heroTitle")}
            </h1>
            <p className="text-muted-foreground mt-4 text-balance text-base sm:text-lg">
              {tPP("heroSubtitle")}
            </p>
          </ScrollReveal>

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

            {/* 6 months — middle tier, raised neutral card */}
            <div className="group/tier bg-card relative flex flex-col rounded-2xl border p-6 shadow-md transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg lg:col-span-4">
              <span className="bg-foreground text-background absolute -top-3.5 left-6 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-sm">
                <Sparkles className="size-3" />
                {t("pricingMonthlyBadge")}
              </span>
              <div className="text-primary inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
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

            {/* 12 months — DOMINANT — solid primary fill, larger
                padding, lifted offset and mega numerals. Dominance is
                size + weight + fill, not glow or rainbow. */}
            <div className="bg-navy group/tier relative flex flex-col rounded-2xl p-6 text-white shadow-lg transition-all hover:-translate-y-0.5 sm:p-8 lg:col-span-5 lg:-mt-4">
              <div className="absolute inset-x-0 -top-3.5 flex justify-center">
                <span className="bg-background text-primary inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest shadow-sm">
                  <Sparkles className="size-3.5" />
                  {tPP("annualBadge")}
                </span>
              </div>
              <div className="bg-primary-foreground/15 mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                {t("pricingAnnualName")}
              </div>
              <div className="mt-4">
                <div className="text-5xl font-bold tracking-tight tabular-nums sm:text-6xl">
                  {t("pricingAnnualPrice")}
                </div>
                <div className="text-primary-foreground/80 mt-1 text-sm">
                  {t("pricingAnnualPeriod")}
                </div>
              </div>
              <div className="bg-primary-foreground/15 mt-2 inline-flex w-fit items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold">
                <Sparkles className="size-3" />
                {t("pricingAnnualEquivalent")}
              </div>
              <p className="text-primary-foreground/90 mt-4 text-sm leading-relaxed">
                {t("pricingAnnualNote")}
              </p>
              <div className="bg-primary-foreground/10 mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-xs leading-relaxed">
                <Lock className="mt-0.5 size-3.5 shrink-0" />
                <p className="text-primary-foreground/95">
                  {tPP("lockInPill")}
                </p>
              </div>
              <div className="mt-auto pt-6">
                <PricingCtaButton
                  planKey="annual"
                  buttonClassName="bg-emerald text-[#06281f] hover:bg-emerald-light inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-md px-4 text-base font-bold shadow-sm transition"
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

      {/* EVERY PLAN INCLUDES — single-accent check pills on a white
          panel. */}
      <section className="relative border-b border-border">
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <ScrollReveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {tPP("includesTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance">
              {tPP("includesSubtitle")}
            </p>
          </ScrollReveal>
          <div className="bg-card mt-10 rounded-2xl border p-6 shadow-sm sm:p-8">
            <ul className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {includes.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="bg-primary/10 text-primary mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full">
                    <Check className="size-3" />
                  </span>
                  <span className="text-foreground leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <ScrollReveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {tPP("compareTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance text-lg">
              {tPP("compareSubtitle")}
            </p>
          </ScrollReveal>

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
                        <X className="text-muted-foreground/60 mt-0.5 size-3.5 shrink-0" />
                        {row.paper}
                      </span>
                    </td>
                    <td className="text-muted-foreground px-4 py-4 sm:px-6">
                      <span className="inline-flex items-start gap-1.5">
                        <X className="text-muted-foreground/60 mt-0.5 size-3.5 shrink-0" />
                        {row.zalo}
                      </span>
                    </td>
                    <td className="bg-primary/5 px-4 py-4 font-medium text-foreground sm:px-6">
                      <span className="inline-flex items-start gap-1.5">
                        <Check className="text-primary mt-0.5 size-4 shrink-0" />
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

      {/* PRICING FAQ — numbered-chip accordion. Open state lifts and
          gains a hairline primary ring + neutral shadow. */}
      <section className="bg-background relative border-b border-border">
        <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <ScrollReveal className="text-center">
            <span className="bg-primary/10 text-primary ring-primary/20 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ring-1">
              FAQ
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              {tPP("faqTitle")}
            </h2>
            <p className="text-muted-foreground mt-4 text-balance text-lg">
              {tPP("faqSubtitle")}
            </p>
          </ScrollReveal>
          <div className="mt-12 space-y-3">
            {faqs.map((f, i) => (
              <details
                key={i}
                className="group bg-card rounded-xl border shadow-sm transition-all open:-translate-y-0.5 open:border-primary/40 open:shadow-md open:ring-1 open:ring-primary/20 hover:border-primary/20 hover:shadow-md"
              >
                <summary className="flex min-h-14 cursor-pointer items-center gap-4 rounded-xl px-5 py-4 text-sm font-semibold transition hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
                  <span className="bg-primary/10 text-primary group-open:bg-primary group-open:text-primary-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums transition-all">
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
      <section className="border-y border-border bg-muted/30">
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

      {/* FINAL CTA — quiet dark band. Solid surface, single primary
          CTA, neutral contact card. No orbs, glows or pulsing dots. */}
      <section className="relative bg-slate-950 text-white">
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div className="text-center md:text-left">
              <span className="border-white/15 bg-white/5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest">
                <span className="bg-white/60 inline-block size-1.5 rounded-full" />
                {t("trustTrial")}
              </span>
              <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
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
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-7 py-3.5 text-base font-bold shadow-sm transition"
                >
                  <MessageCircle className="size-4" />
                  {t("ctaZalo")}
                </a>
                <a
                  href="tel:+84862404036"
                  className="border-white/20 bg-white/5 hover:bg-white/10 inline-flex items-center gap-2 rounded-lg border px-7 py-3.5 text-base font-semibold transition hover:border-white/30"
                >
                  <Phone className="size-4" />
                  +84 86 240 4036
                </a>
              </div>
              <p className="text-slate-400 mt-6 inline-flex items-center gap-1.5 text-sm">
                <Mail className="size-3.5" />
                <a
                  href="mailto:matthewstadlers14@gmail.com"
                  className="hover:text-white"
                >
                  matthewstadlers14@gmail.com
                </a>
              </p>
            </div>

            <aside className="ring-white/10 relative mx-auto w-full max-w-sm rounded-2xl bg-white/[0.06] p-6 shadow-lg ring-1">
              <div>
                <p className="text-slate-300 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                  <span className="bg-white/60 inline-block size-1.5 rounded-full" />
                  {t("contactCardLabel")}
                </p>
                <div className="mt-4 flex flex-col items-center text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/zalo-qr.jpg"
                    alt={t("zaloQrAlt")}
                    width={200}
                    height={200}
                    className="bg-white h-[200px] w-[200px] rounded-xl object-contain p-2 shadow-md"
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
      <section className="bg-muted/40 border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-5 text-center sm:px-6">
          <p className="text-foreground inline-flex flex-wrap items-center justify-center gap-2 text-sm font-medium">
            <Check className="text-primary size-4" />
            <span>{tPP("guaranteeBar")}</span>
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
