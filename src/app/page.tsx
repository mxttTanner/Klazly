import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser, dashboardPathFor } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/super-admin";
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
import { PricingCtaButton } from "@/components/pricing-cta-button";
import { FoundingSpotsCard } from "@/components/founding-spots-card";
import { ScrollReveal } from "@/components/scroll-reveal";
import { getFoundingStatus } from "@/lib/founding";
import { ZALO_URL } from "@/lib/zalo";

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
  // If a logged-in user lands here (e.g. opened the PWA from home
  // screen, typed the bare domain, or clicked the brand logo), bounce
  // them to their portal so the home-screen-installed app feels like
  // a real app rather than the marketing site. Standard SaaS pattern
  // (Linear, Notion, Vercel all do the same). The auth check is
  // cookie-based and cheap; cold landings without a session pay zero
  // extra cost. Super-admin gets routed to /super-admin via the same
  // helper that /post-login uses.
  const user = await getCurrentUser();
  if (user) {
    if (isSuperAdminEmail(user.email)) {
      redirect("/super-admin");
    }
    redirect(dashboardPathFor(user.role));
  }

  const t = await getTranslations("landing");
  const tFaq = await getTranslations("landing.faq");
  const tCta = await getTranslations("pricingCta");
  const tFounder = await getTranslations("founder");
  const tCommon = await getTranslations("common");
  const foundingStatus = await getFoundingStatus();
  const year = new Date().getFullYear();

  const navLinks = [
    { href: "#features", label: t("navFeatures") },
    { href: "/pricing", label: t("navPricing") },
    { href: "/demo", label: t("navDemo") },
    { href: "#contact", label: t("navContact") },
  ];

  const trustStripItems = [
    t("trustTrial"),
    t("trustNoCard"),
    t("trustSetup"),
    t("trustBilingual"),
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


  const faqs = [
    { q: tFaq("q1"), a: tFaq("a1") },
    { q: tFaq("q2"), a: tFaq("a2") },
    // q3 intentionally omitted — covered 1:1 on Zalo for now.
    // JSON keys for q3/a3 were removed; numbering stays as-is to
    // keep q4–q8 edits stable.
    { q: tFaq("q4"), a: tFaq("a4") },
    { q: tFaq("q5"), a: tFaq("a5") },
    { q: tFaq("q6"), a: tFaq("a6") },
    { q: tFaq("q7"), a: tFaq("a7") },
    { q: tFaq("q8"), a: tFaq("a8") },
  ];

  return (
    <div className="min-h-dvh bg-background pb-24 lg:pb-0">
      {/* ============================================================
          STICKY TOP NAV
          ============================================================
          Premium-feeling header: brighter glass blur, taller padding,
          subtle gradient hairline, nav links sit in a "tab strip"
          treatment so they don't read as plain text links, lang
          toggle + login wear a subtle separator, primary CTA gets
          its own visual weight with shadow + ring. */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link
            href="/"
            aria-label={t("brandAriaLabel")}
            className="group flex min-w-0 items-center gap-2.5 transition hover:opacity-80"
          >
            <BrandLogo size="md" />
            {/* Live status chip — small, static success dot signals
                "active product" next to the brand without noise. */}
            <span className="border-border bg-muted text-muted-foreground hidden items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest sm:inline-flex">
              <span className="bg-success size-1.5 rounded-full" />
              Live
            </span>
          </Link>

          {/* Nav — visible at lg+. Pill background container with
              individual link hover. Active page tint where applicable. */}
          <nav className="hidden items-center rounded-full border bg-muted/40 p-1 md:flex">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-muted-foreground hover:bg-background hover:text-foreground rounded-full px-3.5 py-1.5 text-sm font-medium transition hover:shadow-sm"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageToggle />
            {/* Hairline separator between toggle + login auth row */}
            <div className="bg-border hidden h-5 w-px sm:block" />
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex shrink-0 items-center rounded-md px-2.5 py-1.5 text-sm font-medium transition sm:px-3"
            >
              {t("heroLoginCta")}
            </Link>
            {/* Primary CTA — full text on sm+, compact icon-only
                "Zalo" button on mobile so the right cluster of the
                nav (lang + login + CTA) doesn't overflow a 360px
                phone. */}
            <a
              href={ZALO_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("ctaStartTrial")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold shadow-sm transition hover:shadow-md sm:px-4"
            >
              <MessageCircle className="size-4 sm:hidden" />
              <span className="hidden sm:inline">{t("ctaStartTrial")}</span>
            </a>
          </div>
        </div>
      </header>

      {/* ============================================================
          HERO — dark navy, owner-focused pitch, product mockup
          ============================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 text-white">
        {/* Subtle dot-grid backdrop — adds texture without competing
            with the headline. radial-gradient on a 24px cell, fading
            from center-top so the eye stays on the pitch. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center_top,black_30%,transparent_70%)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28">
          <div className="mx-auto max-w-4xl text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
            {/* Eyebrow — frosted pill with a single static accent dot */}
            <span className="border-white/15 bg-white/5 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
              <span className="bg-white/70 size-1.5 rounded-full" />
              {t("heroEyebrow")}
            </span>
            {/* Headline — bigger, gradient text fill. Cleaner without
                the SVG underline gimmick. */}
            <h1 className="mt-7 text-balance bg-gradient-to-br from-white via-white to-slate-300 bg-clip-text text-5xl font-bold leading-[1.05] tracking-tight text-transparent sm:text-7xl md:text-[5.5rem]">
              {t("heroTitle")}
            </h1>
            <p className="text-slate-300 mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed sm:text-xl">
              {t("heroSubtitle")}
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 motion-safe:delay-200">
              {/* Primary CTA — the one prominent action in the hero */}
              <a
                href={ZALO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary text-primary-foreground hover:bg-primary/90 group/cta inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-bold shadow-lg transition hover:-translate-y-0.5"
              >
                {t("ctaStartTrial")}
                <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-0.5" />
              </a>
              <Link
                href="/demo"
                className="border-white/20 bg-white/5 hover:bg-white/10 inline-flex items-center gap-2 rounded-xl border px-7 py-3.5 text-base font-semibold backdrop-blur-sm transition hover:border-white/30"
              >
                {t("ctaLiveDemo")}
              </Link>
            </div>

            <ul className="text-slate-400 mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
              {trustStripItems.map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <Check className="text-slate-400 size-3.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Hero product mockup — single centered laptop with phone
              offset behind. Cleaner than the side-by-side split.
              The phone tucks behind the laptop's bottom-right corner
              to give depth without crowding the headline. */}
          <div className="relative mx-auto mt-16 max-w-4xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 motion-safe:duration-1000 motion-safe:delay-300">
            <div className="relative">
              <LaptopMock />
              <div className="absolute -bottom-12 -right-4 hidden lg:block">
                <PhoneMock />
              </div>
            </div>
            <div className="mx-auto mt-8 max-w-[12rem] lg:hidden">
              <PhoneMock />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          PRODUCT-FACT STATS + STATIC TRUST STRIP
          ============================================================
          Four product-fact numerals (60s, 1 chạm, VI·EN, 30 phút)
          above a calm, static single row of feature pills. No
          marquee — the row sits still so prospects can read it. */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div aria-hidden="true" className="from-slate-900 absolute inset-x-0 top-0 h-16 bg-gradient-to-b to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-slate-400 text-center text-xs font-semibold uppercase tracking-widest">
            {t("statsBandLabel")}
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-8">
            {[
              { v: t("stat1Value"), l: t("stat1Label") },
              { v: t("stat2Value"), l: t("stat2Label") },
              { v: t("stat3Value"), l: t("stat3Label") },
              { v: t("stat4Value"), l: t("stat4Label") },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <dt className="from-white via-white bg-gradient-to-b to-slate-400 bg-clip-text text-4xl font-bold tracking-tight tabular-nums text-transparent sm:text-5xl">
                  {s.v}
                </dt>
                <dd className="text-slate-300 mt-2 text-sm leading-snug">
                  {s.l}
                </dd>
              </div>
            ))}
          </dl>
          {/* Static trust strip — a single calm row of capability
              pills. Replaces the old scrolling marquee. */}
          <ul className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
            {[
              "Ghi bài học từ điện thoại · 60 giây",
              "PDF có letterhead riêng · một chạm",
              "Gửi báo cáo qua Zalo",
              "Song ngữ Việt · Anh",
              "Bảo mật RLS tại cơ sở dữ liệu",
            ].map((label) => (
              <li
                key={label}
                className="border-white/10 bg-white/5 text-slate-300 inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium"
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================================
          THREE VIEWS — owner featured (60%), teacher + parent stacked
          ============================================================ */}
      <section className="bg-background relative overflow-hidden border-b border-border">
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <ScrollReveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("audienceTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance text-lg">
              {t("audienceSubtitle")}
            </p>
          </ScrollReveal>

          <div className="mt-12 grid gap-5 lg:grid-cols-5">
            {/* Owner — the large, lead card. Neutral white surface,
                single primary accent, labelled clearly. */}
            <div className="group bg-card relative overflow-hidden rounded-2xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md lg:col-span-3">
              <div className="relative grid gap-5 p-7 sm:grid-cols-[auto_1fr] sm:items-start">
                <div className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl">
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
                        <Check className="text-primary mt-0.5 size-4 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="bg-muted/40 border-t p-4 sm:p-6">
                <MiniDashboardMock />
              </div>
            </div>

            {/* Teacher + Parent — stacked neutral cards. Same calm
                surface; the role is named in the heading, not the hue. */}
            <div className="grid gap-5 lg:col-span-2">
              <div className="group bg-card relative overflow-hidden rounded-2xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative p-6">
                  <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
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
              <div className="group bg-card relative overflow-hidden rounded-2xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative p-6">
                  <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
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
          DAY-IN-THE-LIFE NARRATIVE
          ============================================================
          Three vertical "timestamp cards" — owner 8:30 / teacher
          16:45 / parent 20:15. Each card uses its role color in the
          time chip + accent bar so a reader scanning the page sees
          the role palette repeated. Background softened from pure
          navy to a tinted white-on-gradient so it flows with the
          rest of the page instead of feeling like a hard break.
          ============================================================ */}
      <section className="relative overflow-hidden border-b border-border bg-muted/30">
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <ScrollReveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {t("dayTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance text-lg">
              {t("daySubtitle")}
            </p>
          </ScrollReveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                time: t("dayMorningTime"),
                role: t("dayMorningRole"),
                body: t("dayMorningBody"),
                icon: UserCog,
              },
              {
                time: t("dayAfternoonTime"),
                role: t("dayAfternoonRole"),
                body: t("dayAfternoonBody"),
                icon: GraduationCap,
              },
              {
                time: t("dayEveningTime"),
                role: t("dayEveningRole"),
                body: t("dayEveningBody"),
                icon: Heart,
              },
            ].map((d, i) => {
              const Icon = d.icon;
              return (
                <article
                  key={i}
                  style={{ animationDelay: `${i * 100}ms` }}
                  className="group bg-card relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700 motion-safe:fill-mode-backwards sm:p-7"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="bg-muted text-muted-foreground inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest tabular-nums">
                      {d.time}
                    </span>
                    <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                      <Icon className="size-5" />
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight">
                    {d.role}
                  </h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                    {d.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          FEATURE BLOCKS — alternating layout with mockups
          ============================================================ */}
      <section id="features" className="bg-zinc-50 border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <ScrollReveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("featuresTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance text-lg">
              {t("featuresSubtitle")}
            </p>
          </ScrollReveal>

          {/* Four primary feature deep-dives — the must-show product
              proofs. Bilingual + security moved to the compact
              "also includes" tile row below so the page reads tight
              (was six alternating blocks, which over-extended the
              page). */}
          <div className="mt-16 space-y-20 sm:space-y-28">
            <FeatureBlock
              eyebrow={t("feat1Eyebrow")}
              title={t("feat1Title")}
              body={t("feat1Body")}
              bullets={[
                t("feat1B1"),
                t("feat1B2"),
                t("feat1B3"),
                t("feat1B4"),
              ]}
              icon={Printer}
              visual={<PdfReportMock />}
              layout="right"
            />
            <FeatureBlock
              eyebrow={t("feat2Eyebrow")}
              title={t("feat2Title")}
              body={t("feat2Body")}
              bullets={[t("feat2B1"), t("feat2B2"), t("feat2B3")]}
              icon={Heart}
              visual={<ParentPhoneMock />}
              layout="left"
            />
            <FeatureBlock
              eyebrow={t("feat3Eyebrow")}
              title={t("feat3Title")}
              body={t("feat3Body")}
              bullets={[t("feat3B1"), t("feat3B2"), t("feat3B3")]}
              icon={BarChart3}
              visual={<AnalyticsMock />}
              layout="right"
            />
            <FeatureBlock
              eyebrow={t("feat4Eyebrow")}
              title={t("feat4Title")}
              body={t("feat4Body")}
              bullets={[t("feat4B1"), t("feat4B2"), t("feat4B3")]}
              icon={MessageCircle}
              visual={<ZaloShareMock />}
              layout="left"
            />
          </div>

          {/* "Also includes" compact tile row — bilingual, security,
              setup time. These don't need a full mockup-anchored deep-
              dive but are still strong selling points (especially
              security for owner-buyers). The two-tile layout has
              feat5 and feat6 share equal weight. */}
          <div className="mt-20 space-y-10 sm:mt-28">
            <ScrollReveal className="mx-auto max-w-2xl text-center">
              <p className="text-primary inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
                <Sparkles className="size-3.5" />
                {t("featuresAlsoLabel")}
              </p>
            </ScrollReveal>
            <div className="grid gap-5 lg:grid-cols-3">
              <ExtraCard
                icon={Languages}
                eyebrow={t("feat5Eyebrow")}
                title={t("feat5Title")}
                bullets={[t("feat5B1"), t("feat5B2"), t("feat5B3")]}
              />
              <ExtraCard
                icon={Lock}
                eyebrow={t("feat6Eyebrow")}
                title={t("feat6Title")}
                bullets={[t("feat6B1"), t("feat6B2"), t("feat6B3")]}
              />
              <ExtraCard
                icon={Zap}
                eyebrow={t("howFooterLabel")}
                title={t("howStep1Title")}
                bullets={[
                  t("howStep1Body"),
                  t("howStep2Body"),
                  t("howStep3Body"),
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          HOW IT WORKS
          ============================================================ */}
      <section className="bg-background border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <ScrollReveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("howTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance text-lg">
              {t("howSubtitle")}
            </p>
          </ScrollReveal>

          {/* How-it-works — desktop has a dashed line connecting the
              three step circles so the sequence reads as a journey,
              not three isolated tiles. The line sits at the same y as
              the numeral circle (top-9 = center of size-9 circle plus
              the p-6 of the card). */}
          <div className="relative mt-14">
            <div
              aria-hidden="true"
              className="border-primary/20 pointer-events-none absolute inset-x-0 top-[3.75rem] hidden border-t-2 border-dashed sm:block"
              style={{ left: "16.66%", right: "16.66%" }}
            />
            <div className="relative grid gap-6 sm:grid-cols-3">
              {howSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.n}
                    className="bg-card relative rounded-2xl border p-6 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="bg-primary text-primary-foreground ring-background relative inline-flex size-11 items-center justify-center rounded-full text-base font-bold shadow-md ring-4">
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
                        className="text-primary/40 absolute -right-3 top-1/2 hidden -translate-y-1/2 bg-background sm:block"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
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
          <ScrollReveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("compareTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 text-balance text-lg">
              {t("compareSubtitle")}
            </p>
          </ScrollReveal>

          {/* Split-screen comparison — two neutral cards. The "before"
              state stays quiet; the "after" state reads as dominant
              through a heavier shadow + primary accents. The VS coin
              in the center frames it as one decisive choice. */}
          <div className="relative mx-auto mt-12 max-w-5xl">
            <div className="grid items-stretch gap-5 md:grid-cols-2">
              <div className="bg-card relative overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-8">
                <div className="relative">
                  <div className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    <X className="size-3.5" />
                    {t("compareWithoutLabel")}
                  </div>
                  <h3 className="text-foreground mt-3 text-lg font-semibold">
                    {t("compareWithoutTitle")}
                  </h3>
                  <ul className="mt-5 space-y-3 text-sm">
                    {withoutUs.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="bg-muted text-muted-foreground mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full">
                          <X className="size-3" />
                        </span>
                        <span className="text-muted-foreground leading-relaxed line-through decoration-border underline-offset-2">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="bg-card relative overflow-hidden rounded-2xl border p-6 shadow-md sm:p-8">
                <div className="relative">
                  <div className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    <Check className="size-3.5" />
                    {t("compareWithLabel")}
                  </div>
                  <h3 className="text-foreground mt-3 text-lg font-semibold">
                    {t("compareWithTitle")}
                  </h3>
                  <ul className="mt-5 space-y-3 text-sm">
                    {withUs.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="bg-primary text-primary-foreground mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full">
                          <Check className="size-3" />
                        </span>
                        <span className="text-foreground leading-relaxed">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            {/* Center VS coin — sits between the two cards on md+ */}
            <div
              aria-hidden="true"
              className="bg-background ring-border absolute left-1/2 top-1/2 hidden size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold uppercase tracking-wider ring-4 md:inline-flex"
            >
              <span className="text-muted-foreground">VS</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FOUNDER STORY + FOUNDING CENTER RECRUITMENT
          Replaces the previous testimonials section. The product has
          zero customers at the moment of writing — pretending
          otherwise is illegal under VN consumer law and would be
          caught by the (small, tight-knit) target community. So we
          tell the truth instead and actively recruit Founding
          Centers from this page.
          ============================================================ */}
      <section className="relative overflow-hidden border-b border-border bg-background">
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-14">
            {/* Founder narrative */}
            <div className="space-y-5">
              <span className="bg-primary/10 text-primary inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                <Heart className="size-3.5" />
                {tFounder("eyebrow")}
              </span>
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                {tFounder("title")}
              </h2>
              <div className="text-muted-foreground space-y-4 text-base leading-relaxed">
                <p>{tFounder("paragraph1")}</p>
                <p>{tFounder("paragraph2")}</p>
                <p>{tFounder("paragraph3")}</p>
              </div>
              <ul className="space-y-2 text-sm">
                {[
                  tFounder("benefit1"),
                  tFounder("benefit2"),
                  tFounder("benefit3"),
                  tFounder("benefit4"),
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check className="text-primary mt-0.5 size-4 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <p className="text-foreground text-sm font-medium">
                {tFounder("closing")}
              </p>
              {/* Personal signature block — handwritten-feel name +
                  "Hải Phòng" location underline. Matches the
                  founder-tagline tone in vi.json (matter-of-fact,
                  first-person). No fake testimonials, no portrait
                  stock photo — just the credible "this is who's
                  building it" stamp. */}
              <div className="border-t pt-4 mt-2">
                <p className="text-foreground text-lg font-semibold italic tracking-tight">
                  Matthew
                </p>
                <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                  Klazly · Hải Phòng
                </p>
              </div>
            </div>

            {/* Founding spots card */}
            <div className="lg:pt-12">
              <FoundingSpotsCard status={foundingStatus} />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          PRICING — annual visually dominates
          ============================================================ */}
      <section
        id="pricing"
        className="relative overflow-hidden border-b border-border bg-muted/30"
      >
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <ScrollReveal className="mx-auto max-w-2xl text-center">
            <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <Sparkles className="size-3.5" />
              {t("pricingLaunchBadge")}
            </span>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              {t("pricingTitle")}
            </h2>
            <p className="text-muted-foreground mt-4 text-balance text-base sm:text-lg">
              {t("pricingSubtitle")}
            </p>
          </ScrollReveal>

          {/* overflow-visible so the floating ribbons + badges on
              the middle + annual tiers don't clip on iOS Safari. */}
          <div className="mx-auto mt-14 grid max-w-6xl items-stretch gap-5 overflow-visible lg:grid-cols-12">
            {/* 1 month — quietest tier. opacity-95 removed: it made
                the tier read as broken rather than restrained. The
                tier now stands on its own with a calm card +
                "Linh hoạt" eyebrow. */}
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

            {/* 6 months — middle tier. Calm white card with a single
                primary savings badge pinned above the price. */}
            <div className="bg-card group/tier relative flex flex-col rounded-2xl border p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md lg:col-span-4">
              <span className="bg-primary/10 text-primary absolute -top-3.5 left-6 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold">
                <Sparkles className="size-3" />
                {t("pricingMonthlyBadge")}
              </span>
              <div className="bg-muted text-muted-foreground inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
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

            {/* 12 months — DOMINANT. Solid primary fill, the widest
                column, a bigger price numeral, and lg:-mt-4 lifting it
                above the row so the eye lands here first. Confidence
                from size + weight, not glow. */}
            <div className="bg-primary group/tier relative flex flex-col rounded-2xl p-6 text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 sm:p-8 lg:col-span-5 lg:-mt-4">
              {/* Centered top ribbon — declarative "Most popular". */}
              <div className="absolute inset-x-0 -top-4 flex justify-center">
                <span className="bg-background text-foreground inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest shadow-sm">
                  <Sparkles className="size-3.5" />
                  {t("pricingAnnualBadge")}
                </span>
              </div>
              <div className="bg-white/15 text-primary-foreground relative mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                {t("pricingAnnualName")}
              </div>
              <div className="relative mt-4">
                <div className="text-5xl font-bold tracking-tight tabular-nums sm:text-6xl">
                  {t("pricingAnnualPrice")}
                </div>
                <div className="text-primary-foreground/80 mt-1 text-sm">
                  {t("pricingAnnualPeriod")}
                </div>
              </div>
              <div className="text-primary-foreground relative mt-2 inline-flex w-fit items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold">
                <Sparkles className="size-3" />
                {t("pricingAnnualEquivalent")}
              </div>
              <p className="text-primary-foreground/90 relative mt-4 text-sm leading-relaxed">
                {t("pricingAnnualNote")}
              </p>
              <div className="relative mt-auto pt-6">
                <PricingCtaButton
                  planKey="annual"
                  buttonClassName="bg-background text-primary hover:bg-background/90 inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-md px-4 text-base font-bold shadow-sm transition"
                  showArrow
                />
                <p className="text-primary-foreground/90 mt-3 inline-flex w-full items-center justify-center gap-1.5 text-center text-xs font-semibold">
                  <Lock className="size-3" />
                  {tCta("trustLines.annual")}
                </p>
              </div>
            </div>
          </div>

          {/* Includes panel — lifted into a real card with role-colored
              check pills so it reads as the "every plan ships with" guarantee
              rather than a footnote. */}
          <div className="mx-auto mt-12 max-w-4xl">
            <div className="bg-card relative overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-8">
              <p className="text-foreground text-center text-sm font-semibold">
                {t("pricingNote")}
              </p>
              <ul className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                {[
                  t("pricingItem1"),
                  t("pricingItem2"),
                  t("pricingItem3"),
                  t("pricingItem4"),
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="bg-primary/10 text-primary mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full">
                      <Check className="size-3" />
                    </span>
                    <span className="text-foreground leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FAQ ACCORDION
          ============================================================ */}
      <section className="relative overflow-hidden border-b border-border bg-background">
        <div className="relative mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-24">
          <ScrollReveal className="text-center">
            <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest">
              {tFaq("eyebrow")}
            </span>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              {tFaq("title")}
            </h2>
            <p className="text-muted-foreground mt-4 text-balance text-lg">
              {tFaq("subtitle")}
            </p>
          </ScrollReveal>

          {/* FAQ — each row gets a numbered chip for visual rhythm.
              Chip flips primary tint → solid primary on open, the
              card lifts with a primary ring, and a soft gradient
              wash appears so the active question is impossible to
              lose track of. */}
          <div className="mt-12 space-y-3">
            {faqs.map((f, i) => (
              <details
                key={i}
                className="group bg-card rounded-xl border shadow-sm transition-all open:-translate-y-0.5 open:border-primary/40 open:shadow-md hover:shadow-md"
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

          {/* "Still have a question?" cardlet — closes the loop
              between FAQ and the founder-as-real-person promise.
              Personal, first-person voice, drives to Zalo (not a
              ticket queue). */}
          <div className="bg-card mt-10 overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-7">
            <div className="grid items-center gap-5 sm:grid-cols-[1fr_auto]">
              <div className="space-y-1.5">
                <p className="text-primary inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
                  <span className="bg-primary size-1.5 rounded-full" />
                  Klazly
                </p>
                <h3 className="text-xl font-bold tracking-tight">
                  {tFaq("stillHaveTitle")}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {tFaq("stillHaveBody")}
                </p>
              </div>
              <a
                href={ZALO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex shrink-0 items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-bold shadow-sm transition hover:shadow-md"
              >
                <MessageCircle className="size-4" />
                {tFaq("stillHaveCta")}
              </a>
            </div>
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
        {/* Static dot-grid backdrop for texture, masked to fade
            toward the edges so it doesn't distract from the CTA. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div className="text-center md:text-left">
              {/* Static accent-dot eyebrow — visual bookend with the
                  hero eyebrow. */}
              <span className="border-white/15 bg-white/5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest backdrop-blur-sm">
                <span className="bg-white/70 size-1.5 rounded-full" />
                {t("trustTrial")}
              </span>
              <h2 className="mt-5 text-balance bg-gradient-to-br from-white via-white to-slate-300 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
                {t("finalCtaTitle")}
              </h2>
              <p className="text-slate-300 mt-5 max-w-xl text-balance text-lg md:max-w-md">
                {t("finalCtaSubtitle")}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                {/* Primary CTA — the one prominent action here. */}
                <a
                  href={ZALO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 group/cta inline-flex items-center gap-2 rounded-lg px-7 py-3.5 text-base font-bold shadow-lg transition hover:-translate-y-0.5"
                >
                  {t("ctaStartTrial")}
                  <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-0.5" />
                </a>
                <a
                  href={ZALO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-white/20 bg-white/5 hover:bg-white/10 inline-flex items-center gap-2 rounded-lg border px-7 py-3.5 text-base font-semibold backdrop-blur-sm transition hover:border-white/30"
                >
                  <MessageCircle className="size-4" />
                  {t("ctaZalo")}
                </a>
              </div>
              <p className="text-slate-400 mt-6 inline-flex items-center gap-1.5 text-sm">
                <Lock className="text-slate-400 size-3.5" />
                {t("finalCtaTrust")}
              </p>
            </div>

            {/* Contact card — Zalo QR is the centerpiece. Calm frosted
                panel with a hairline border, no glow. */}
            <aside className="ring-white/10 relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white/[0.06] p-6 shadow-lg ring-1 backdrop-blur-md">
              <div className="relative">
                <p className="text-slate-300 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                  <span className="bg-white/70 size-1.5 rounded-full" />
                  {t("contactCardLabel")}
                </p>
                <div className="mt-4 flex flex-col items-center text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/zalo-qr.jpg"
                    alt={t("zaloQrAlt")}
                    width={220}
                    height={220}
                    className="bg-white ring-white/10 h-[220px] w-[220px] rounded-xl object-contain p-2 shadow-md ring-1"
                  />
                  <p className="text-slate-200 mt-3 text-sm font-medium">
                    {t("contactCardScanHint")}
                  </p>
                  <a
                    href="https://zalo.me/84862404036"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold shadow-sm transition hover:shadow-md"
                  >
                    <MessageCircle className="size-4" />
                    {t("contactCardOpenZalo")}
                  </a>
                </div>
                <div className="border-white/10 mt-5 space-y-1 border-t pt-4 text-sm">
                  <a
                    href="tel:+84862404036"
                    className="text-slate-200 hover:bg-white/5 hover:text-white -mx-2 flex items-center gap-2.5 rounded-md px-2 py-2 transition"
                  >
                    <span className="bg-white/10 text-slate-200 flex size-7 shrink-0 items-center justify-center rounded-md">
                      <Phone className="size-3.5" />
                    </span>
                    <span className="font-medium tabular-nums">+84 86 240 4036</span>
                  </a>
                  <a
                    href="mailto:matthewstadlers14@gmail.com"
                    className="text-slate-200 hover:bg-white/5 hover:text-white -mx-2 flex items-center gap-2.5 break-all rounded-md px-2 py-2 transition"
                  >
                    <span className="bg-white/10 text-slate-200 flex size-7 shrink-0 items-center justify-center rounded-md">
                      <Mail className="size-3.5" />
                    </span>
                    <span className="break-all font-medium">matthewstadlers14@gmail.com</span>
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ============================================================
          STICKY SCROLL-TRIGGERED CTA STRIP
          ============================================================
          Pinned to the bottom of the viewport on mobile only. The
          page is long; this gives visitors who scroll deep a
          permanent action handle without forcing them to scroll
          back up to the header. Hidden on lg+ where the sticky top
          nav already carries the CTA. Respects iOS safe-area. */}
      <div className="fixed inset-x-0 bottom-0 z-40 print:hidden lg:hidden">
        <div className="border-white/10 from-slate-950/95 to-slate-900/95 mx-auto flex max-w-2xl items-center justify-between gap-2 border-t bg-gradient-to-r px-4 py-3 pb-safe text-white shadow-[0_-4px_24px_-8px_rgb(0_0_0/0.3)] backdrop-blur-md sm:rounded-t-2xl">
          <p className="text-xs font-medium leading-snug">
            <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-widest">
              {t("trustTrial")}
            </span>
            <span className="text-slate-200 line-clamp-1">
              {t("pricingLockInInline")}
            </span>
          </p>
          <a
            href={ZALO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold shadow-md transition"
          >
            {t("ctaStartTrial")}
            <ArrowRight className="size-3.5" />
          </a>
        </div>
      </div>

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
              {/* Vietnamese tagline sits directly under the wordmark
                  so the brand pattern (Klazly + 'Cổng Phụ Huynh cho
                  trung tâm tiếng Anh') is consistent with the spec
                  everywhere it appears. */}
              <p className="text-slate-400 -mt-1 text-xs italic leading-snug">
                {tCommon("appTagline")}
              </p>
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
                    <MessageCircle className="text-slate-300 size-4" />
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
  visual,
  layout,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  icon: React.ComponentType<{ className?: string }>;
  visual: React.ReactNode;
  layout: "left" | "right";
}) {
  const copy = (
    <div className="max-w-lg">
      <div className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest">
        <Icon className="size-3.5" />
        {eyebrow}
      </div>
      <h3 className="mt-5 text-2xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h3>
      <p className="text-muted-foreground mt-4 text-base leading-relaxed">
        {body}
      </p>
      <ul className="mt-6 space-y-2.5 text-sm">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2.5">
            <span className="bg-primary/10 text-primary mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full">
              <Check className="size-3" />
            </span>
            <span className="text-foreground leading-relaxed">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
  // Visual container — neutral white card, hairline border, neutral
  // shadow that lifts on hover.
  const visualEl = (
    <div className="relative w-full">
      <div className="bg-card group/visual relative overflow-hidden rounded-2xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
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

/**
 * Compact "also includes" card used in the row after the main 4
 * feature deep-dives. Same tone palette as FeatureBlock so the
 * visual identity stays consistent. No mockup — these are
 * supporting proofs rather than headline features.
 */
function ExtraCard({
  icon: Icon,
  eyebrow,
  title,
  bullets,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  bullets: string[];
}) {
  return (
    <article className="bg-card group/extra relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-7">
      <div className="relative">
        <div className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-xl">
          <Icon className="size-5" />
        </div>
        <p className="text-primary mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
          {eyebrow}
        </p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight">{title}</h3>
        <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <Check className="text-primary mt-0.5 size-4 shrink-0" />
              <span className="leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/* ============================================================
   MOCK PRODUCT VISUALS
   CSS-only fake screenshots — replace with real ones later.
   ============================================================ */

function LaptopMock() {
  return (
    <div className="relative motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 motion-safe:duration-1000 motion-safe:delay-300">
      {/* Outer device frame — more refined silver/dark bezel. The
          two-tone gradient suggests a real laptop edge. */}
      <div className="from-slate-700 via-slate-800 to-slate-900 ring-slate-600/40 relative rounded-2xl bg-gradient-to-b p-2 shadow-lg ring-1">
        {/* Browser chrome — refined with URL bar + lock icon for
            "this is a real product on a real domain" credibility. */}
        <div className="bg-slate-900 ring-slate-700/40 mb-1 flex items-center gap-2 rounded-t-lg px-3 py-2 ring-1">
          <div className="flex items-center gap-1.5">
            <span className="bg-rose-500 size-2.5 rounded-full shadow-sm" />
            <span className="bg-amber-500 size-2.5 rounded-full shadow-sm" />
            <span className="bg-emerald-500 size-2.5 rounded-full shadow-sm" />
          </div>
          {/* URL bar — pills inside the chrome */}
          <div className="bg-slate-800 ring-slate-700/50 ml-2 flex flex-1 items-center gap-1.5 rounded-md px-2 py-1 ring-1">
            <svg className="text-emerald-400 size-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-slate-300 text-[10px] font-medium">
              klazly.com
            </span>
            <span className="text-slate-500 text-[10px]">/admin</span>
          </div>
          {/* LIVE chip — static success dot */}
          <span className="bg-slate-800 text-slate-300 ring-slate-700/50 inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider ring-1">
            <span className="bg-success size-1.5 rounded-full" />
            LIVE
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
                { label: "Giáo viên", value: "12" },
                { label: "Phụ huynh", value: "84" },
                { label: "Lớp", value: "18" },
                { label: "Học sinh", value: "126" },
              ].map((c) => (
                <div
                  key={c.label}
                  className="bg-card relative overflow-hidden rounded-md border p-2"
                >
                  <div className="bg-primary absolute inset-x-0 top-0 h-0.5" />
                  <div className="text-muted-foreground text-[9px] uppercase">
                    {c.label}
                  </div>
                  <div className="text-base font-bold tabular-nums">
                    {c.value}
                  </div>
                </div>
              ))}
            </div>
            {/* Recent activity — static list (3 rows). */}
            <div className="bg-card rounded-md border p-2.5">
              <div className="mb-2 flex items-center justify-between gap-1.5 text-[10px] font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <ClipboardList className="text-primary size-3" />
                  Hoạt động gần đây
                </span>
                <span className="text-muted-foreground inline-flex items-center gap-1 text-[8px] font-medium uppercase tracking-wider">
                  <span className="bg-success size-1 rounded-full" />
                  Live
                </span>
              </div>
              <div className="relative overflow-hidden">
                <div>
                  {[
                    "Cô Linh · Junior A · Unit 4 — Animals",
                    "Cô Tú · Senior B · Unit 5 — KET Practice",
                    "Cô Hà · Junior B · Unit 3 — Daily Routines",
                  ].map((line, i) => (
                    <div
                      key={i}
                      className="text-muted-foreground flex h-[1.2rem] items-center border-t text-[10px] first:border-t-0"
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

function PhoneMock() {
  return (
    <div className="from-slate-700 via-slate-800 to-slate-900 ring-slate-600/40 mx-auto w-[14rem] rounded-[2rem] bg-gradient-to-b p-2 shadow-lg ring-1">
      <div className="bg-background relative overflow-hidden rounded-[1.6rem]">
        {/* Dynamic-island style top pill */}
        <div className="bg-slate-900 absolute left-1/2 top-1.5 h-1.5 w-16 -translate-x-1/2 rounded-full" />
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
        { label: "GV", value: "12" },
        { label: "PH", value: "84" },
        { label: "Lớp", value: "18" },
        { label: "HS", value: "126" },
      ].map((c) => (
        <div
          key={c.label}
          className="bg-card relative overflow-hidden rounded-lg border p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="bg-primary absolute inset-x-0 top-0 h-0.5" />
          <div className="text-muted-foreground relative text-[10px] font-bold uppercase tracking-wider">
            {c.label}
          </div>
          <div className="text-foreground relative text-lg font-bold tabular-nums">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * Landing-page mockup of the parent PDF report.
 *
 * Hand-rendered HTML/Tailwind that mirrors the @media print
 * stylesheet in globals.css — letterhead with auto-initials tile,
 * brand accent bar, 4 pastel stat cards, an emerald Highlights
 * callout, a teacher message snippet, and a footer with the
 * branded tagline. Deliberately *not* a screenshot of the real
 * PDF: the prospect needs to scan this on a small landing-page
 * column at any viewport, and a true PDF screenshot would be
 * tiny + blurry on retina. Treat this as the marketing
 * representation; the actual PDF rendering lives in
 * /parent/students/[id] + globals.css print rules.
 */
function PdfReportMock() {
  return (
    <div className="bg-white aspect-[4/5] overflow-hidden px-5 py-5 sm:px-7 sm:py-7">
      {/* Letterhead — auto-initials tile + center info */}
      <div className="flex items-start justify-between gap-3 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary text-white inline-flex size-9 items-center justify-center rounded-lg text-xs font-bold tracking-wide">
            TT
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-900 leading-tight truncate">
              Trung Tâm Anh Ngữ Hoa Mai
            </div>
            <div className="text-slate-500 text-[8px] leading-snug truncate">
              +84 28 1234 5678 · lienhe@hoamai.test
            </div>
          </div>
        </div>
        <div className="text-slate-400 shrink-0 text-[7px] pt-1">
          16/05/2026
        </div>
      </div>
      {/* Brand accent bar */}
      <div className="bg-primary h-[2px] rounded-full" />

      {/* Headline */}
      <div className="mt-3">
        <div className="text-primary text-[7px] font-bold uppercase tracking-[0.15em]">
          Báo cáo tiến độ tháng
        </div>
        <div className="text-slate-900 mt-0.5 text-lg font-bold leading-tight">
          Phạm Minh An
        </div>
        <div className="text-slate-600 text-[9px]">
          Junior A · Cô Linh
        </div>
        <div className="text-slate-400 mt-0.5 text-[8px]">
          01/05 → 31/05/2026
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {[
          {
            label: "Buổi học",
            value: "12",
            ctx: "trong 14",
            cls: "bg-blue-50 border-blue-200 text-blue-900",
          },
          {
            label: "BTVN",
            value: "88%",
            ctx: "7/8",
            cls: "bg-emerald-50 border-emerald-200 text-emerald-900",
          },
          {
            label: "Chuyên cần",
            value: "95%",
            ctx: "Xuất sắc",
            cls: "bg-emerald-50 border-emerald-200 text-emerald-900",
          },
          {
            label: "Thái độ",
            value: "Tốt",
            ctx: "6/8 buổi",
            cls: "bg-violet-50 border-violet-200 text-violet-900",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={"rounded-md border p-1.5 " + s.cls}
          >
            <div className="text-[6px] font-semibold uppercase tracking-wider opacity-70">
              {s.label}
            </div>
            <div className="text-[13px] font-bold leading-tight tabular-nums mt-0.5">
              {s.value}
            </div>
            <div className="text-[6.5px] opacity-70 mt-0.5">{s.ctx}</div>
          </div>
        ))}
      </div>

      {/* Highlights callout */}
      <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2">
        <div className="text-emerald-900 text-[8px] font-bold">
          ★ Điểm sáng trong tháng
        </div>
        <ul className="text-emerald-900 mt-1 space-y-0.5 pl-3 text-[8px] leading-snug list-disc marker:text-emerald-600">
          <li>Đạt 95% chuyên cần</li>
          <li>Hoàn thành BTVN 7/8 buổi</li>
          <li>2 buổi đánh giá Xuất sắc</li>
        </ul>
      </div>

      {/* Lesson card with vocab chips + grammar */}
      <div className="mt-3 rounded-md border border-slate-200 p-2">
        <div className="flex items-center gap-1.5">
          <span className="bg-primary/10 text-primary rounded-full px-1.5 py-px text-[6.5px] font-bold uppercase tracking-wide">
            T5 · 14/05
          </span>
          <span className="text-slate-900 text-[9px] font-semibold leading-tight truncate">
            Unit 4 — Animals
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-0.5">
          {["family", "mother", "father", "sister", "brother"].map((v) => (
            <span
              key={v}
              className="bg-blue-50 text-blue-800 border border-blue-200 rounded-full px-1 py-[1px] text-[6.5px]"
            >
              {v}
            </span>
          ))}
        </div>
        <div className="text-slate-600 mt-1 text-[7.5px]">
          <span className="font-semibold uppercase tracking-wider opacity-70">
            Ngữ pháp:{" "}
          </span>
          Possessive adjectives
        </div>
      </div>

      {/* Teacher message snippet */}
      <div className="mt-3 rounded-md border border-slate-200 border-l-2 border-l-primary bg-slate-50/60 p-2">
        <div className="flex items-center gap-1.5">
          <span className="bg-primary text-white inline-flex size-4 items-center justify-center rounded-full text-[7px] font-bold">
            L
          </span>
          <span className="text-slate-900 text-[8px] font-semibold">
            Cô Linh
          </span>
        </div>
        <p className="text-slate-700 mt-1 text-[7.5px] leading-snug">
          Minh An tuần này tự tin phát biểu hơn, đặc biệt khi mô tả gia đình. Bài tập về nhà đều và đúng giờ.
        </p>
      </div>

      {/* Footer tagline */}
      <div className="text-slate-500 mt-3 text-center text-[7px] italic">
        Cảm ơn anh/chị đã tin tưởng Trung Tâm Anh Ngữ Hoa Mai
      </div>
    </div>
  );
}

function ParentPhoneMock() {
  return (
    <div className="bg-muted/40 relative flex items-center justify-center p-6 sm:p-10">
      <div className="relative">
        <PhoneMock />
      </div>
    </div>
  );
}

function AnalyticsMock() {
  const rows = [
    { name: "Cô Linh", week: 6, total: 24 },
    { name: "Trần Văn Tú", week: 4, total: 18 },
    { name: "Phạm Quốc Anh", week: 2, total: 9 },
    { name: "Nguyễn Thanh Hà", week: 0, total: 12 },
    { name: "Đinh Minh Đức", week: 0, total: 4 },
  ];
  const maxWeek = Math.max(...rows.map((r) => r.week), 6);
  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold">Hoạt động giáo viên</div>
          <div className="text-muted-foreground text-xs">Tuần này</div>
        </div>
        <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums">
          8/12 ghi bài
        </span>
      </div>
      <div className="mt-5 space-y-2">
        {rows.map((row) => {
          const ok = row.week > 0;
          const widthPct = Math.max(8, (row.week / maxWeek) * 100);
          return (
            <div
              key={row.name}
              className="bg-card relative flex items-center gap-3 overflow-hidden rounded-lg border p-2.5"
            >
              {/* Inline bar — width proportional to weekly count.
                  Primary = on track, warning tint = needs attention. */}
              <div
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 ${ok ? "bg-primary/10" : "bg-warning/15"}`}
                style={{ width: ok ? `${widthPct}%` : "100%" }}
              />
              <div className={`relative flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${ok ? "bg-primary/10 text-primary" : "bg-warning/20 text-foreground"}`}>
                {row.name.split(/\s+/).slice(-1)[0]?.charAt(0) ?? "?"}
              </div>
              <div className="relative flex-1 truncate text-sm font-medium">
                {row.name}
              </div>
              <div
                className={`relative text-xs font-bold tabular-nums ${ok ? "text-primary" : "text-foreground"}`}
              >
                {row.week}
              </div>
              <div className="relative text-muted-foreground text-xs tabular-nums">
                /{row.total}
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-warning/10 mt-4 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs">
        <span className="bg-warning size-1.5 rounded-full" />
        <span className="text-foreground">
          <span className="font-bold">2 giáo viên</span> chưa ghi bài tuần này — nhắc qua Zalo
        </span>
      </div>
    </div>
  );
}

function ZaloShareMock() {
  return (
    <div className="bg-muted/40 p-6 sm:p-10">
      <div className="mx-auto max-w-xs space-y-3">
        {/* Faux Zalo chat header — "Phụ huynh: Mai" so the mockup
            reads as a real conversation, not a generic share dialog. */}
        <div className="bg-card flex items-center gap-2 rounded-xl border p-2.5 shadow-sm">
          <span className="bg-primary/10 text-primary inline-flex size-7 items-center justify-center rounded-full text-[10px] font-bold">
            M
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-foreground text-xs font-semibold leading-tight truncate">
              Phụ huynh · Trần Thị Mai
            </div>
            <div className="text-emerald-600 inline-flex items-center gap-1 text-[10px]">
              <span className="bg-emerald-500 size-1.5 rounded-full" />
              Đang hoạt động
            </div>
          </div>
        </div>
        {/* PDF attachment bubble — emerald (Zalo accent) outgoing
            message style with tail */}
        <div className="ml-6 relative">
          <div className="bg-emerald-50 ring-emerald-200/60 rounded-2xl rounded-tr-sm p-3 shadow-sm ring-1">
            <div className="bg-card flex items-center gap-2 rounded-lg border p-2.5">
              <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-foreground text-[11px] font-semibold leading-tight truncate">
                  BaoCao-PhamMinhAn-Thang5.pdf
                </div>
                <div className="text-muted-foreground text-[10px]">
                  148 KB · PDF
                </div>
              </div>
            </div>
            <p className="text-emerald-900 mt-2 text-[11px] leading-snug">
              Báo cáo tháng 5 của con. Anh/chị xem qua Zalo nhé.
            </p>
            <div className="text-emerald-700/70 mt-1.5 flex items-center justify-end gap-1 text-[9px]">
              <span>20:15</span>
              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
        </div>
        {/* Reply bubble */}
        <div className="mr-6">
          <div className="bg-card border rounded-2xl rounded-tl-sm p-3 shadow-sm">
            <p className="text-foreground text-[11px] leading-snug">
              Cảm ơn cô! Em xem ngay.
            </p>
            <div className="text-muted-foreground mt-1.5 text-[9px]">20:18</div>
          </div>
        </div>
      </div>
      <div className="text-muted-foreground mt-5 text-center text-xs">
        Phụ huynh nhận trong Zalo · không cần app khác
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
