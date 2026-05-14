import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  Globe,
  GraduationCap,
  Heart,
  Languages,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  Printer,
  Sparkles,
  UserCog,
  Users,
  X,
  Zap,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { BrandLogo } from "@/components/brand-logo";

/**
 * Landing page — center-owner-focused redesign.
 *
 * Audience: Vietnamese English-center OWNERS, not parents. The parent
 * experience is a benefit the owner sells, not the headline product.
 *
 * The page reads top-to-bottom as a sales conversation:
 *   1. Hero pitch (dark navy for visual confidence)
 *   2. Social proof bar
 *   3. Featured "three views" — owner is the hero
 *   4. Alternating feature deep-dives with product mockups
 *   5. How it works (3 steps)
 *   6. Without-us / With-us comparison
 *   7. Testimonials (placeholder names today, real ones as pilots sign)
 *   8. Pricing — annual visually dominant
 *   9. FAQ accordion
 *  10. Dark final CTA
 *  11. Multi-column dark footer with Zalo
 */
export default async function HomePage() {
  const t = await getTranslations("landing");
  const tFaq = await getTranslations("landing.faq");
  const year = new Date().getFullYear();

  const navLinks = [
    { href: "#features", label: t("navFeatures") },
    { href: "#pricing", label: t("navPricing") },
    { href: "/demo", label: t("navDemo") },
    { href: "#contact", label: t("navContact") },
  ];

  const trustStripItems = [
    t("trustTrial"),
    t("trustNoCard"),
    t("trustSetup"),
    t("trustBilingual"),
  ];

  const cities = [
    t("socialProofCity1"),
    t("socialProofCity2"),
    t("socialProofCity3"),
    t("socialProofCity4"),
  ];

  const howSteps = [
    {
      n: "1",
      title: t("howStep1Title"),
      body: t("howStep1Body"),
      icon: Building2,
    },
    {
      n: "2",
      title: t("howStep2Title"),
      body: t("howStep2Body"),
      icon: Users,
    },
    {
      n: "3",
      title: t("howStep3Title"),
      body: t("howStep3Body"),
      icon: Sparkles,
    },
  ];

  const withoutUs = [
    t("compareWithout1"),
    t("compareWithout2"),
    t("compareWithout3"),
    t("compareWithout4"),
    t("compareWithout5"),
  ];
  const withUs = [
    t("compareWith1"),
    t("compareWith2"),
    t("compareWith3"),
    t("compareWith4"),
    t("compareWith5"),
  ];

  const testimonials = [
    {
      quote: t("testimonial1Quote"),
      name: t("testimonial1Name"),
      role: t("testimonial1Role"),
      city: t("testimonial1City"),
    },
    {
      quote: t("testimonial2Quote"),
      name: t("testimonial2Name"),
      role: t("testimonial2Role"),
      city: t("testimonial2City"),
    },
    {
      quote: t("testimonial3Quote"),
      name: t("testimonial3Name"),
      role: t("testimonial3Role"),
      city: t("testimonial3City"),
    },
  ];

  const faqs = [
    { q: tFaq("q1"), a: tFaq("a1") },
    { q: tFaq("q2"), a: tFaq("a2") },
    { q: tFaq("q3"), a: tFaq("a3") },
    { q: tFaq("q4"), a: tFaq("a4") },
    { q: tFaq("q5"), a: tFaq("a5") },
    { q: tFaq("q6"), a: tFaq("a6") },
    { q: tFaq("q7"), a: tFaq("a7") },
    { q: tFaq("q8"), a: tFaq("a8") },
  ];

  return (
    <div className="min-h-dvh bg-background">
      {/* ============================================================
          STICKY TOP NAV
          ============================================================ */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 shadow-[0_1px_3px_-1px_rgb(0_0_0/0.06)] backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/"
            aria-label={t("brandAriaLabel")}
            className="flex min-w-0 items-center gap-2.5"
          >
            <BrandLogo size="md" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm font-medium transition"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageToggle />
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground hidden rounded-md px-3 py-1.5 text-sm font-medium transition sm:inline-flex"
            >
              {t("heroLoginCta")}
            </Link>
            <Link
              href="/demo"
              className={buttonVariants({ size: "sm" })}
            >
              {t("ctaStartTrial")}
            </Link>
          </div>
        </div>
      </header>

      {/* ============================================================
          HERO — dark navy, owner-focused pitch, product mockup
          ============================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 text-white">
        {/* Subtle ambient glows */}
        <div
          aria-hidden="true"
          className="from-primary/25 absolute -top-32 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-br to-transparent blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 right-1/4 size-[28rem] rounded-full bg-violet-500/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="border-white/15 bg-white/5 inline-block rounded-full border px-3 py-1 text-xs font-medium tracking-wide backdrop-blur-sm">
              {t("heroEyebrow")}
            </span>
            <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="text-slate-300 mx-auto mt-5 max-w-2xl text-balance text-lg leading-relaxed">
              {t("heroSubtitle")}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/demo"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-6 py-3 text-base font-semibold shadow-lg shadow-primary/30 transition"
              >
                {t("ctaStartTrial")}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/demo"
                className="border-white/20 bg-white/5 hover:bg-white/10 inline-flex items-center gap-2 rounded-md border px-6 py-3 text-base font-medium backdrop-blur-sm transition"
              >
                {t("ctaLiveDemo")}
              </Link>
            </div>

            <ul className="text-slate-300 mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
              {trustStripItems.map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <Check className="size-4 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Hero product mockup — laptop + phone */}
          <div className="relative mx-auto mt-14 max-w-5xl">
            <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
              <LaptopMock />
              <div className="-mt-8 hidden sm:mx-auto sm:block">
                <PhoneMock />
              </div>
            </div>
            <div className="mx-auto mt-6 max-w-xs sm:hidden">
              <PhoneMock />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SOCIAL PROOF BAR
          ============================================================ */}
      <section className="border-b border-border bg-zinc-50">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center sm:px-6">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
            {t("socialProofTitle")}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium">
            {cities.map((city) => (
              <span
                key={city}
                className="text-muted-foreground/80 inline-flex items-center gap-1.5"
              >
                <Building2 className="size-4" />
                {city}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          THREE VIEWS — owner featured (60%), teacher + parent stacked
          ============================================================ */}
      <section className="bg-background border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("audienceTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance text-lg">
              {t("audienceSubtitle")}
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-5">
            {/* Owner — large card */}
            <div className="group bg-card relative overflow-hidden rounded-2xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg lg:col-span-3">
              <div className="bg-sky-500 absolute inset-x-0 top-0 h-1" />
              <div className="grid gap-5 p-7 sm:grid-cols-[auto_1fr] sm:items-start">
                <div className="bg-sky-50 text-sky-700 flex size-12 shrink-0 items-center justify-center rounded-xl">
                  <UserCog className="size-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    {t("audienceOwnerTitle")}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {t("audienceOwnerDesc")}
                  </p>
                  <ul className="text-muted-foreground mt-4 space-y-1.5 text-sm">
                    {[
                      t("audienceOwnerBullet1"),
                      t("audienceOwnerBullet2"),
                      t("audienceOwnerBullet3"),
                    ].map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <Check className="text-sky-600 mt-0.5 size-4 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="bg-zinc-50 border-t p-4 sm:p-6">
                <MiniDashboardMock />
              </div>
            </div>

            {/* Teacher + Parent — stacked */}
            <div className="grid gap-5 lg:col-span-2">
              <div className="group bg-card relative overflow-hidden rounded-2xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <div className="bg-violet-500 absolute inset-x-0 top-0 h-1" />
                <div className="p-6">
                  <div className="bg-violet-50 text-violet-700 flex size-10 items-center justify-center rounded-lg">
                    <GraduationCap className="size-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">
                    {t("audienceTeacherTitle")}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {t("audienceTeacherDesc")}
                  </p>
                </div>
              </div>
              <div className="group bg-card relative overflow-hidden rounded-2xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <div className="bg-rose-500 absolute inset-x-0 top-0 h-1" />
                <div className="p-6">
                  <div className="bg-rose-50 text-rose-700 flex size-10 items-center justify-center rounded-lg">
                    <Heart className="size-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">
                    {t("audienceParentTitle")}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {t("audienceParentDesc")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FEATURE BLOCKS — alternating layout with mockups
          ============================================================ */}
      <section id="features" className="bg-zinc-50 border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("featuresTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance text-lg">
              {t("featuresSubtitle")}
            </p>
          </div>

          <div className="mt-16 space-y-20 sm:space-y-28">
            <FeatureBlock
              eyebrow={t("feat1Eyebrow")}
              title={t("feat1Title")}
              body={t("feat1Body")}
              bullets={[t("feat1B1"), t("feat1B2"), t("feat1B3")]}
              icon={Printer}
              tone="sky"
              visual={<PdfReportMock />}
              layout="right"
            />
            <FeatureBlock
              eyebrow={t("feat2Eyebrow")}
              title={t("feat2Title")}
              body={t("feat2Body")}
              bullets={[t("feat2B1"), t("feat2B2"), t("feat2B3")]}
              icon={Heart}
              tone="rose"
              visual={<ParentPhoneMock />}
              layout="left"
            />
            <FeatureBlock
              eyebrow={t("feat3Eyebrow")}
              title={t("feat3Title")}
              body={t("feat3Body")}
              bullets={[t("feat3B1"), t("feat3B2"), t("feat3B3")]}
              icon={BarChart3}
              tone="violet"
              visual={<AnalyticsMock />}
              layout="right"
            />
            <FeatureBlock
              eyebrow={t("feat4Eyebrow")}
              title={t("feat4Title")}
              body={t("feat4Body")}
              bullets={[t("feat4B1"), t("feat4B2"), t("feat4B3")]}
              icon={MessageCircle}
              tone="emerald"
              visual={<ZaloShareMock />}
              layout="left"
            />
            <FeatureBlock
              eyebrow={t("feat5Eyebrow")}
              title={t("feat5Title")}
              body={t("feat5Body")}
              bullets={[t("feat5B1"), t("feat5B2"), t("feat5B3")]}
              icon={Languages}
              tone="amber"
              visual={<BilingualMock />}
              layout="right"
            />
            <FeatureBlock
              eyebrow={t("feat6Eyebrow")}
              title={t("feat6Title")}
              body={t("feat6Body")}
              bullets={[t("feat6B1"), t("feat6B2"), t("feat6B3")]}
              icon={Lock}
              tone="indigo"
              visual={<SecurityMock />}
              layout="left"
            />
          </div>
        </div>
      </section>

      {/* ============================================================
          HOW IT WORKS
          ============================================================ */}
      <section className="bg-background border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("howTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance text-lg">
              {t("howSubtitle")}
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {howSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.n}
                  className="bg-card relative rounded-2xl border p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-primary text-primary-foreground inline-flex size-9 items-center justify-center rounded-full text-sm font-bold">
                      {step.n}
                    </span>
                    <Icon className="text-primary size-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {step.body}
                  </p>
                  {i < howSteps.length - 1 ? (
                    <ArrowRight
                      aria-hidden="true"
                      className="text-muted-foreground/30 absolute -right-3 top-1/2 hidden -translate-y-1/2 sm:block"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          <p className="text-muted-foreground mx-auto mt-10 max-w-xl text-balance text-center text-sm">
            <Zap className="text-primary mr-1 inline size-4 align-text-bottom" />
            {t("howFooter")}
          </p>
        </div>
      </section>

      {/* ============================================================
          WITHOUT US / WITH US COMPARISON
          ============================================================ */}
      <section className="bg-zinc-50 border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("compareTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance text-lg">
              {t("compareSubtitle")}
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-2">
            <div className="bg-card relative rounded-2xl border border-rose-200/60 p-6 shadow-sm sm:p-8">
              <div className="bg-rose-50 text-rose-700 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                <X className="size-3.5" />
                {t("compareWithoutLabel")}
              </div>
              <h3 className="mt-3 text-lg font-semibold">
                {t("compareWithoutTitle")}
              </h3>
              <ul className="mt-5 space-y-3 text-sm">
                {withoutUs.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <X className="text-rose-500 mt-0.5 size-4 shrink-0" />
                    <span className="text-muted-foreground leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card border-emerald-200/60 ring-emerald-200/40 relative rounded-2xl border p-6 shadow-md ring-1 sm:p-8">
              <div className="bg-emerald-50 text-emerald-700 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                <Check className="size-3.5" />
                {t("compareWithLabel")}
              </div>
              <h3 className="mt-3 text-lg font-semibold">
                {t("compareWithTitle")}
              </h3>
              <ul className="mt-5 space-y-3 text-sm">
                {withUs.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="text-emerald-600 mt-0.5 size-4 shrink-0" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          TESTIMONIALS — placeholder, replace as real ones land
          ============================================================ */}
      <section className="bg-background border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("testimonialsTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance text-lg">
              {t("testimonialsSubtitle")}
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <figure
                key={i}
                className="bg-card flex flex-col rounded-2xl border p-6 shadow-sm"
              >
                <blockquote className="text-foreground text-sm leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="bg-primary/10 text-primary inline-flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1 ring-primary/20">
                    {t.name.trim().split(/\s+/).slice(-1)[0]?.charAt(0) ?? "?"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{t.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {t.role} · {t.city}
                    </p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          PRICING — annual visually dominates
          ============================================================ */}
      <section
        id="pricing"
        className="bg-zinc-50 border-b border-border"
      >
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="bg-amber-100 text-amber-800 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <Sparkles className="size-3.5" />
              {t("pricingLaunchBadge")}
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {t("pricingTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance text-base">
              {t("pricingSubtitle")}
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-6xl items-stretch gap-5 lg:grid-cols-12">
            {/* 1 month — quietest tier */}
            <div className="bg-card group/tier flex flex-col rounded-2xl border p-6 opacity-90 shadow-sm transition-all hover:opacity-100 hover:shadow-md lg:col-span-3">
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
              <Link
                href="/demo"
                className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-auto w-full`}
              >
                {t("pricingCta")}
              </Link>
            </div>

            {/* 6 months — middle tier */}
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
              <Link
                href="/demo"
                className={`${buttonVariants({ variant: "outline" })} mt-auto w-full`}
              >
                {t("pricingCta")}
              </Link>
              <p className="text-muted-foreground mt-2 text-center text-xs">
                {t("pricingTrialInline")}
              </p>
            </div>

            {/* 12 months — DOMINANT — brand blue background */}
            <div className="group/tier relative flex flex-col rounded-2xl bg-primary p-6 text-primary-foreground shadow-2xl shadow-primary/30 transition-all hover:-translate-y-1 hover:shadow-2xl sm:p-8 lg:col-span-5">
              <div className="absolute -top-3 right-6 inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-950 shadow">
                <Sparkles className="size-3" />
                {t("pricingAnnualBadge")}
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
              <div className="text-primary-foreground/90 mt-3 inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium ring-1 ring-white/20">
                <Lock className="size-3.5" />
                {t("pricingLockInInline")}
              </div>
              <Link
                href="/demo"
                className="bg-background text-primary hover:bg-background/90 mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-4 py-3 text-base font-semibold shadow-md transition"
              >
                {t("pricingCta")}
                <ArrowRight className="size-4" />
              </Link>
              <p className="text-primary-foreground/80 mt-2 text-center text-xs font-medium">
                {t("pricingTrialInline")}
              </p>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-3xl">
            <p className="text-muted-foreground mb-4 text-center text-sm">
              {t("pricingNote")}
            </p>
            <ul className="text-muted-foreground grid gap-3 text-sm sm:grid-cols-2">
              {[
                t("pricingItem1"),
                t("pricingItem2"),
                t("pricingItem3"),
                t("pricingItem4"),
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="text-primary mt-0.5 size-4 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ============================================================
          FAQ ACCORDION
          ============================================================ */}
      <section className="bg-background border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {tFaq("title")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance text-lg">
              {tFaq("subtitle")}
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

      {/* ============================================================
          FINAL CTA — dark, dramatic
          ============================================================ */}
      <section
        id="contact"
        className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white"
      >
        <div
          aria-hidden="true"
          className="from-primary/20 absolute -top-20 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-br to-transparent blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div className="text-center lg:text-left">
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
                {t("finalCtaTitle")}
              </h2>
              <p className="text-slate-300 mt-4 max-w-xl text-balance text-lg lg:max-w-md">
                {t("finalCtaSubtitle")}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Link
                  href="/demo"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-6 py-3 text-base font-semibold shadow-lg shadow-primary/30 transition"
                >
                  {t("ctaStartTrial")}
                  <ArrowRight className="size-4" />
                </Link>
                <a
                  href="https://zalo.me/84862404036"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-white/20 bg-white/5 hover:bg-white/10 inline-flex items-center gap-2 rounded-md border px-6 py-3 text-base font-medium backdrop-blur-sm transition"
                >
                  <MessageCircle className="size-4" />
                  {t("ctaZalo")}
                </a>
              </div>
              <p className="text-slate-400 mt-6 text-sm">
                {t("finalCtaTrust")}
              </p>
            </div>

            {/* Contact card — all three channels, Zalo prominent with
                its QR code. Zalo is the primary channel in Vietnam, so
                it gets the largest visual weight (QR + button); phone
                + email are listed beneath. */}
            <aside className="bg-white/5 ring-white/10 mx-auto w-full max-w-sm rounded-2xl p-6 backdrop-blur-sm ring-1">
              <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest">
                {t("contactCardLabel")}
              </p>
              <div className="mt-4 flex flex-col items-center text-center">
                {/* QR image — drop the JPG at public/zalo-qr.jpg.
                    eslint-disable: next/image isn't worth it for one
                    decorative static QR. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/zalo-qr.jpg"
                  alt={t("zaloQrAlt")}
                  width={220}
                  height={220}
                  className="bg-white h-[220px] w-[220px] rounded-xl object-contain p-2 shadow-lg"
                />
                <p className="text-slate-200 mt-3 text-sm font-medium">
                  {t("contactCardScanHint")}
                </p>
                <a
                  href="https://zalo.me/84862404036"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-500 text-white hover:bg-emerald-400 mt-3 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold shadow-md transition"
                >
                  <MessageCircle className="size-4" />
                  {t("contactCardOpenZalo")}
                </a>
              </div>
              <div className="border-white/10 mt-5 space-y-2 border-t pt-4 text-sm">
                <a
                  href="tel:+84862404036"
                  className="text-slate-200 hover:text-white flex items-center gap-2"
                >
                  <Phone className="size-4 text-emerald-400" />
                  +84 86 240 4036
                </a>
                <a
                  href="mailto:matthewstadlers14@gmail.com"
                  className="text-slate-200 hover:text-white flex items-center gap-2 break-all"
                >
                  <Mail className="size-4 text-emerald-400" />
                  matthewstadlers14@gmail.com
                </a>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ============================================================
          FOOTER — dark multi-column
          ============================================================ */}
      <footer className="bg-slate-950 text-slate-300">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white">
                <BrandLogo size="md" />
              </div>
              <p className="text-slate-400 max-w-sm text-sm leading-relaxed">
                {t("footerTagline")}
              </p>
              {/* Zalo QR + button. The QR is small (120px) here — the
                  large version lives in the final-CTA contact card. */}
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/zalo-qr.jpg"
                  alt={t("zaloQrAlt")}
                  width={120}
                  height={120}
                  className="bg-white h-[120px] w-[120px] shrink-0 rounded-lg object-contain p-1.5"
                />
                <div className="flex flex-col gap-2">
                  <a
                    href="https://zalo.me/84862404036"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-200 border-slate-700 bg-slate-800/60 hover:bg-slate-800 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition"
                  >
                    <MessageCircle className="size-4 text-emerald-400" />
                    {t("footerZalo")}
                  </a>
                  <p className="text-slate-500 text-[11px] leading-snug">
                    {t("footerZaloScan")}
                  </p>
                </div>
              </div>
              <div className="text-slate-400 space-y-1 text-xs">
                <p className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5" />
                  <a
                    href="tel:+84862404036"
                    className="hover:text-white"
                  >
                    +84 86 240 4036
                  </a>
                </p>
                <p className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  <a
                    href="mailto:matthewstadlers14@gmail.com"
                    className="hover:text-white"
                  >
                    matthewstadlers14@gmail.com
                  </a>
                </p>
                <p>{t("footerAddress")}</p>
              </div>
            </div>

            <FooterColumn
              title={t("footerColProduct")}
              links={[
                { href: "#features", label: t("navFeatures") },
                { href: "#pricing", label: t("navPricing") },
                { href: "/demo", label: t("navDemo") },
                { href: "/login", label: t("heroLoginCta") },
              ]}
            />
            <FooterColumn
              title={t("footerColResources")}
              links={[
                { href: "#contact", label: t("footerLinkSupport") },
                { href: "#features", label: t("footerLinkHelp") },
              ]}
            />
            <FooterColumn
              title={t("footerColLegal")}
              links={[
                { href: "/legal/terms", label: t("footerTerms") },
                { href: "/legal/privacy", label: t("footerPrivacy") },
              ]}
            />
          </div>

          <div className="border-slate-800 text-slate-500 mt-12 flex flex-wrap items-center justify-between gap-3 border-t pt-6 text-xs">
            <p>{t("footerCopyright", { year })}</p>
            <div className="flex items-center gap-3">
              <span className="border-slate-700 bg-slate-800/60 inline-flex items-center gap-1 rounded-md border px-2 py-1">
                <Globe className="size-3" />
                {t("footerMadeInVn")} 🇻🇳
              </span>
              <span className="text-slate-500">{t("footerOwnership")}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================
   SHARED FEATURE-BLOCK
   ============================================================ */

function FeatureBlock({
  eyebrow,
  title,
  body,
  bullets,
  icon: Icon,
  tone,
  visual,
  layout,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  icon: React.ComponentType<{ className?: string }>;
  tone: "sky" | "rose" | "violet" | "emerald" | "amber" | "indigo";
  visual: React.ReactNode;
  layout: "left" | "right";
}) {
  const toneClasses: Record<typeof tone, { bg: string; text: string }> = {
    sky: { bg: "bg-sky-50", text: "text-sky-700" },
    rose: { bg: "bg-rose-50", text: "text-rose-700" },
    violet: { bg: "bg-violet-50", text: "text-violet-700" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700" },
    amber: { bg: "bg-amber-50", text: "text-amber-700" },
    indigo: { bg: "bg-indigo-50", text: "text-indigo-700" },
  };
  const cls = toneClasses[tone];
  const copy = (
    <div className="max-w-lg">
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${cls.bg} ${cls.text}`}
      >
        <Icon className="size-3.5" />
        {eyebrow}
      </div>
      <h3 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h3>
      <p className="text-muted-foreground mt-3 text-base leading-relaxed">
        {body}
      </p>
      <ul className="mt-5 space-y-2 text-sm">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <Check className={`mt-0.5 size-4 shrink-0 ${cls.text}`} />
            <span className="leading-relaxed">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
  const visualEl = (
    <div className="relative w-full">
      <div className="bg-card group/visual rounded-2xl border shadow-xl shadow-slate-900/5 transition-transform hover:scale-[1.01]">
        {visual}
      </div>
    </div>
  );
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      {layout === "left" ? (
        <>
          {visualEl}
          {copy}
        </>
      ) : (
        <>
          {copy}
          {visualEl}
        </>
      )}
    </div>
  );
}

/* ============================================================
   MOCK PRODUCT VISUALS
   CSS-only fake screenshots — replace with real ones later.
   ============================================================ */

function LaptopMock() {
  return (
    <div className="bg-slate-800 ring-slate-700/50 rounded-xl p-1.5 shadow-2xl shadow-slate-950/50 ring-1">
      <div className="bg-slate-900 mb-1 flex items-center gap-1 rounded-t-lg px-3 py-1.5">
        <span className="size-2 rounded-full bg-rose-400/70" />
        <span className="size-2 rounded-full bg-amber-400/70" />
        <span className="size-2 rounded-full bg-emerald-400/70" />
        <span className="text-slate-500 ml-3 text-[10px]">
          parent-portal-nine.vercel.app
        </span>
      </div>
      <div className="bg-background overflow-hidden rounded-md">
        <div className="bg-background flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="bg-primary size-6 rounded-md" />
            <div className="text-xs font-semibold">Trung Tâm Hoa Mai</div>
          </div>
          <div className="bg-muted size-6 rounded-full" />
        </div>
        <div className="grid grid-cols-[140px_1fr]">
          <div className="bg-background space-y-1 border-r border-border p-3">
            {[
              "Tổng quan",
              "Giáo viên",
              "Phụ huynh",
              "Lớp học",
              "Học sinh",
              "Tin nhắn",
            ].map((n, i) => (
              <div
                key={n}
                className={`rounded-md px-2.5 py-1.5 text-[11px] ${
                  i === 0
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {n}
              </div>
            ))}
          </div>
          <div className="space-y-3 bg-zinc-50 p-4">
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Giáo viên", value: "12", accent: "bg-sky-500" },
                { label: "Phụ huynh", value: "84", accent: "bg-rose-500" },
                { label: "Lớp", value: "18", accent: "bg-violet-500" },
                { label: "Học sinh", value: "126", accent: "bg-amber-500" },
              ].map((c) => (
                <div
                  key={c.label}
                  className="bg-card relative overflow-hidden rounded-md border p-2"
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-0.5 ${c.accent}`}
                  />
                  <div className="text-muted-foreground text-[9px] uppercase">
                    {c.label}
                  </div>
                  <div className="text-base font-bold tabular-nums">
                    {c.value}
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-card rounded-md border p-2.5">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold">
                <ClipboardList className="text-primary size-3" />
                Hoạt động gần đây
              </div>
              {[
                "Lê Thị Hương · Senior B · Unit 5 — KET Practice",
                "Lê Thị Hương · Junior A · Unit 4 — Animals",
                "Lê Thị Hương · Senior B · Unit 4 — Books & Films",
              ].map((line, i) => (
                <div
                  key={i}
                  className="text-muted-foreground border-t py-1 text-[10px] first:border-t-0"
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneMock() {
  return (
    <div className="bg-slate-900 mx-auto w-[14rem] rounded-[1.75rem] p-1.5 shadow-2xl shadow-slate-950/50 ring-1 ring-slate-800">
      <div className="bg-background relative overflow-hidden rounded-[1.4rem]">
        <div className="bg-slate-900 absolute left-1/2 top-1 h-1 w-12 -translate-x-1/2 rounded-full" />
        <div className="px-3 pb-3 pt-5">
          <div className="text-[9px] font-medium uppercase text-primary">
            Phụ huynh
          </div>
          <div className="mt-0.5 text-base font-bold">Phạm Minh An</div>
          <div className="text-muted-foreground text-[10px]">
            Lớp Junior A · Cô Hương
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            <div className="bg-card rounded-md border p-2">
              <div className="text-muted-foreground text-[8px] uppercase">
                Chuyên cần
              </div>
              <div className="text-sm font-bold text-emerald-700 tabular-nums">
                95%
              </div>
            </div>
            <div className="bg-card rounded-md border p-2">
              <div className="text-muted-foreground text-[8px] uppercase">
                BTVN
              </div>
              <div className="text-sm font-bold text-emerald-700 tabular-nums">
                88%
              </div>
            </div>
          </div>
          <div className="mt-2.5 space-y-1.5">
            {[
              { date: "TH 6 · 03/05", topic: "Unit 4 — Animals" },
              { date: "TH 4 · 01/05", topic: "Unit 4 — Free Time" },
              { date: "TH 2 · 29/04", topic: "Unit 3 — Daily Routines" },
            ].map((l) => (
              <div
                key={l.date}
                className="bg-card rounded-md border p-2"
              >
                <div className="text-primary text-[8px] font-semibold uppercase">
                  {l.date}
                </div>
                <div className="text-[10px] font-medium">{l.topic}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniDashboardMock() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        { label: "GV", value: "12", accent: "bg-sky-500" },
        { label: "PH", value: "84", accent: "bg-rose-500" },
        { label: "Lớp", value: "18", accent: "bg-violet-500" },
        { label: "HS", value: "126", accent: "bg-amber-500" },
      ].map((c) => (
        <div
          key={c.label}
          className="bg-card relative overflow-hidden rounded-md border p-2.5 shadow-sm"
        >
          <div className={`absolute inset-x-0 top-0 h-0.5 ${c.accent}`} />
          <div className="text-muted-foreground text-[10px] font-medium uppercase">
            {c.label}
          </div>
          <div className="text-lg font-bold tabular-nums">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

function PdfReportMock() {
  return (
    <div className="bg-white aspect-[4/5] overflow-hidden p-6 sm:p-10">
      <div className="flex items-start gap-3 border-b border-slate-200 pb-3">
        <div className="bg-primary size-12 rounded-lg" />
        <div>
          <div className="text-sm font-bold">Trung Tâm Anh Ngữ Hoa Mai</div>
          <div className="text-slate-500 text-[10px]">
            lienhe@hoamai.test · +84 28 1234 5678
          </div>
        </div>
      </div>
      <div className="mt-4 text-center">
        <div className="text-[10px] uppercase text-slate-500">
          Báo cáo tiến độ
        </div>
        <div className="text-base font-bold">Phạm Minh An</div>
        <div className="text-[10px] text-slate-500">Lớp Junior A · Tháng 5</div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { l: "Buổi học", v: "12" },
          { l: "BTVN", v: "88%" },
          { l: "Chuyên cần", v: "95%" },
        ].map((s) => (
          <div
            key={s.l}
            className="rounded-md border border-slate-200 p-2"
          >
            <div className="text-[8px] uppercase text-slate-500">{s.l}</div>
            <div className="text-sm font-bold tabular-nums">{s.v}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {[
          "Unit 4 — Animals · Tham gia tích cực",
          "Unit 4 — Free Time · Phát biểu nhiều",
          "Unit 3 — Daily Routines · BTVN đầy đủ",
        ].map((l) => (
          <div
            key={l}
            className="border-l-2 border-primary/40 pl-2 text-[10px] leading-relaxed text-slate-600"
          >
            {l}
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 pt-3 text-center text-[9px] text-slate-500">
        <div>
          <div className="border-b border-slate-300 pb-3" />
          Giáo viên chủ nhiệm
        </div>
        <div>
          <div className="border-b border-slate-300 pb-3" />
          Phụ huynh
        </div>
      </div>
    </div>
  );
}

function ParentPhoneMock() {
  return (
    <div className="flex items-center justify-center p-6 sm:p-10">
      <PhoneMock />
    </div>
  );
}

function AnalyticsMock() {
  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold">Hoạt động giáo viên · Tuần này</div>
        <div className="text-muted-foreground text-xs">8/12 ghi bài</div>
      </div>
      <div className="mt-5 space-y-2.5">
        {[
          { name: "Lê Thị Hương", week: 6, total: 24, ok: true },
          { name: "Trần Văn Tú", week: 4, total: 18, ok: true },
          { name: "Phạm Quốc Anh", week: 2, total: 9, ok: true },
          { name: "Nguyễn Thanh Hà", week: 0, total: 12, ok: false },
          { name: "Đinh Minh Đức", week: 0, total: 4, ok: false },
        ].map((row) => (
          <div
            key={row.name}
            className="bg-card flex items-center gap-3 rounded-lg border p-2.5"
          >
            <div className="bg-violet-50 text-violet-700 flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-1 ring-violet-200">
              {row.name.split(/\s+/).slice(-1)[0]?.charAt(0) ?? "?"}
            </div>
            <div className="flex-1 truncate text-sm font-medium">
              {row.name}
            </div>
            <div
              className={`text-xs font-semibold tabular-nums ${row.ok ? "text-foreground" : "text-rose-600"}`}
            >
              {row.week}
            </div>
            <div className="text-muted-foreground text-xs tabular-nums">
              {row.total}
            </div>
          </div>
        ))}
      </div>
      <div className="text-muted-foreground mt-4 text-xs">
        <span className="text-rose-600 font-semibold">2 giáo viên</span> chưa
        ghi bài tuần này — nhắc qua Zalo
      </div>
    </div>
  );
}

function ZaloShareMock() {
  return (
    <div className="bg-zinc-50 p-6 sm:p-10">
      <div className="bg-card mx-auto max-w-xs rounded-2xl border p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="text-primary size-4" />
          <div className="text-xs font-semibold">
            BaoCao-PhamMinhAn-Thang5.pdf
          </div>
        </div>
        <div className="text-muted-foreground mt-2 text-[11px]">
          Báo cáo tháng 5 cho con. Mọi thắc mắc xin liên hệ trung tâm.
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            className="bg-emerald-50 text-emerald-700 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ring-1 ring-emerald-200"
          >
            <MessageCircle className="size-3.5" />
            Gửi qua Zalo
          </button>
          <button
            type="button"
            className="text-muted-foreground inline-flex items-center gap-1 text-xs"
          >
            <Printer className="size-3.5" />
            In
          </button>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <span>Phụ huynh nhận trong Zalo · không cần app khác</span>
      </div>
    </div>
  );
}

function BilingualMock() {
  return (
    <div className="bg-zinc-50 p-6 sm:p-10">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="bg-card space-y-2 rounded-xl border p-4 shadow-sm">
          <div className="bg-primary/10 text-primary inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase">
            VI · Phụ huynh
          </div>
          <div className="text-xs font-bold">Buổi học: Unit 4 — Animals</div>
          <div className="text-muted-foreground text-[11px] leading-relaxed">
            Tham gia tích cực, phát âm chuẩn. Phụ huynh khuyến khích con đọc
            tiếng Anh ở nhà.
          </div>
        </div>
        <div className="bg-card space-y-2 rounded-xl border p-4 shadow-sm">
          <div className="bg-primary/10 text-primary inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase">
            EN · Teacher
          </div>
          <div className="text-xs font-bold">Lesson: Unit 4 — Animals</div>
          <div className="text-muted-foreground text-[11px] leading-relaxed">
            Engaged well, clear pronunciation. Encourage at-home reading in
            English.
          </div>
        </div>
      </div>
      <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
        <Languages className="size-3.5" />
        Tự động đổi VI ↔ EN theo người xem
      </div>
    </div>
  );
}

function SecurityMock() {
  return (
    <div className="p-6 sm:p-10">
      <div className="space-y-3">
        {[
          { name: "Hoa Mai", color: "bg-sky-500", items: ["12 GV", "126 HS"] },
          {
            name: "Ánh Dương",
            color: "bg-violet-500",
            items: ["8 GV", "94 HS"],
          },
          { name: "Sky Kids", color: "bg-rose-500", items: ["6 GV", "72 HS"] },
        ].map((c) => (
          <div
            key={c.name}
            className="bg-card flex items-center gap-3 rounded-xl border p-3 shadow-sm"
          >
            <div className={`size-9 shrink-0 rounded-lg ${c.color}`} />
            <div className="flex-1">
              <div className="text-sm font-semibold">{c.name}</div>
              <div className="text-muted-foreground text-xs">
                {c.items.join(" · ")}
              </div>
            </div>
            <Lock className="text-muted-foreground size-4" />
          </div>
        ))}
      </div>
      <div className="text-muted-foreground mt-4 text-xs leading-relaxed">
        Mỗi trung tâm là một silo riêng. Không trung tâm nào nhìn thấy dữ liệu
        của trung tâm khác — RLS tại lớp cơ sở dữ liệu.
      </div>
    </div>
  );
}

/* ============================================================
   FOOTER COLUMN
   ============================================================ */

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-white text-xs font-semibold uppercase tracking-wider">
        {title}
      </p>
      <ul className="text-slate-400 mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
