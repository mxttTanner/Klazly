import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Eye,
  GraduationCap,
  Heart,
  MessageCircle,
  Sparkles,
  UserSquare2,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ZALO_URL } from "@/lib/zalo";

/**
 * Public demo chooser. Visitors land here from the marketing page,
 * pick a role, and get dropped into a read-only demo session for that
 * role. The Center Admin role is recommended because that's the
 * audience the marketing site targets — owners.
 *
 * Wayfinding between the three roles is by label + icon, not hue: the
 * cards are visually identical neutrals. The one recommended card is
 * marked with the single primary accent.
 *
 * The floating bottom CTA bar nudges visitors toward signup without
 * interrupting the role exploration.
 */
export default async function DemoChooserPage() {
  const t = await getTranslations("demo");
  const tLanding = await getTranslations("landing");

  const roles = [
    {
      key: "admin",
      icon: UserSquare2,
      title: t("roleAdminTitle"),
      desc: t("roleAdminDesc"),
      href: "/demo/admin",
      recommended: true,
    },
    {
      key: "teacher",
      icon: GraduationCap,
      title: t("roleTeacherTitle"),
      desc: t("roleTeacherDesc"),
      href: "/demo/teacher",
      recommended: false,
    },
    {
      key: "parent",
      icon: Heart,
      title: t("roleParentTitle"),
      desc: t("roleParentDesc"),
      href: "/demo/parent",
      recommended: false,
    },
  ];

  return (
    <div className="relative min-h-dvh bg-background pb-40 sm:pb-32">
      {/* Top nav — matches the landing page treatment so clicking
          "Demo" from the landing doesn't lose the page chrome. The
          active "Demo" pill gets a white background + primary text +
          shadow so the user knows where they are. */}
      <header className="relative border-b border-border bg-background/70 sticky top-0 z-20 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link
            href="/"
            aria-label={tLanding("brandAriaLabel")}
            className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <BrandLogo size="md" />
            <span className="text-muted-foreground hidden items-center gap-1 rounded-full border bg-muted/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest sm:inline-flex">
              <span className="bg-success size-1 rounded-full" />
              Live
            </span>
          </Link>
          <nav className="hidden items-center rounded-full border bg-muted/40 p-1 md:flex">
            <Link
              href="/#features"
              className="text-muted-foreground hover:bg-background hover:text-foreground rounded-full px-3.5 py-1.5 text-sm font-medium transition hover:shadow-sm"
            >
              {tLanding("navFeatures")}
            </Link>
            <Link
              href="/pricing"
              className="text-muted-foreground hover:bg-background hover:text-foreground rounded-full px-3.5 py-1.5 text-sm font-medium transition hover:shadow-sm"
            >
              {tLanding("navPricing")}
            </Link>
            <Link
              href="/demo"
              aria-current="page"
              className="bg-background text-primary rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-sm"
            >
              {tLanding("navDemo")}
            </Link>
            <Link
              href="/#contact"
              className="text-muted-foreground hover:bg-background hover:text-foreground rounded-full px-3.5 py-1.5 text-sm font-medium transition hover:shadow-sm"
            >
              {tLanding("navContact")}
            </Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <div className="bg-border hidden h-5 w-px sm:block" />
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            >
              {tLanding("heroLoginCta")}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 sm:px-6">
        {/* HERO */}
        <ScrollReveal as="section" className="mx-auto max-w-3xl pb-12 pt-12 text-center sm:pb-16 sm:pt-20">
          <span className="text-muted-foreground inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
            <Eye className="size-3.5" />
            {t("heroBannerLabel")}
            <span className="text-muted-foreground/70 normal-case font-normal tracking-normal">
              · {t("heroBannerNote")}
            </span>
          </span>
          <h1 className="mt-6 text-balance text-2xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-balance text-base sm:text-lg">
            {t("heroSubtitle")}
          </p>
        </ScrollReveal>

        {/* ROLE SWITCHER — neutral cards, identical hue. The
            recommended card carries the single primary accent (ring +
            badge). Hover lift via shadow + 0.5px rise, no scale. */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((r, i) => {
            const Icon = r.icon;
            const isPrimary = r.recommended;
            return (
              <ScrollReveal key={r.key} delay={i * 80} className="flex">
                <Link
                  href={r.href}
                  className={
                    "group bg-card relative flex w-full flex-col rounded-xl border shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md " +
                    (isPrimary ? "ring-primary/40 ring-2" : "")
                  }
                >
                  {/* Recommended marker — single primary accent. */}
                  {isPrimary ? (
                    <span className="bg-primary text-primary-foreground absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest shadow-sm">
                      <Sparkles className="size-3" />
                      {t("recommended")}
                    </span>
                  ) : null}

                  <div className="relative flex flex-1 flex-col p-5 sm:p-7">
                    {/* Neutral icon chip; accent appears on hover. */}
                    <div className="bg-muted text-muted-foreground group-hover:text-primary flex size-12 items-center justify-center rounded-xl border transition-colors sm:size-14">
                      <Icon className="size-6 sm:size-7" />
                    </div>
                    <h2 className="mt-4 text-lg font-bold tracking-tight sm:mt-5 sm:text-xl">
                      {r.title}
                    </h2>
                    <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
                      {r.desc}
                    </p>
                    {isPrimary ? (
                      <p className="text-primary mt-3 inline-flex items-center gap-1.5 text-xs font-semibold">
                        <Sparkles className="size-3" />
                        {t("roleAdminRecommendedHint")}
                      </p>
                    ) : null}
                    {/* Enter button — primary tier uses solid CTA so
                        the eye lands here first. */}
                    <span
                      className={`mt-6 inline-flex items-center gap-1.5 self-start transition-transform group-hover:translate-x-0.5 ${
                        isPrimary
                          ? buttonVariants({ size: "default" })
                          : buttonVariants({ variant: "outline", size: "default" })
                      }`}
                    >
                      {t("enterAs")} {r.title}
                      <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </Link>
              </ScrollReveal>
            );
          })}
        </section>

        <p className="text-muted-foreground mt-14 text-center text-sm">
          {t("chooserHint")}{" "}
          <Link href="/" className="text-foreground font-medium underline underline-offset-4 hover:text-primary">
            {t("backHome")}
          </Link>
        </p>
      </main>

      {/* ============================================================
          FLOATING BOTTOM CTA BAR — quiet navy surface. Respects iOS
          safe-area inset.
          ============================================================ */}
      <div className="fixed inset-x-0 bottom-0 z-30 print:hidden">
        <div className="relative border-t border-white/10 bg-slate-950 text-white shadow-lg pb-safe">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:flex-wrap sm:px-6 sm:py-4">
            <div className="min-w-0 flex-1">
              {/* Eyebrow hidden on mobile to keep the bar two-line max */}
              <p className="text-slate-400 hidden text-[10px] font-semibold uppercase tracking-widest sm:block">
                Klazly
              </p>
              <p className="text-sm font-semibold sm:text-base">
                {t("ctaBarHeadline")}
              </p>
              {/* Body line hidden on mobile so the bar fits two CTAs +
                  one headline line — total 2 rows max. */}
              <p className="text-slate-300 hidden text-xs sm:block sm:text-sm">
                {t("ctaBarBody")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/pricing"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors"
              >
                {t("ctaBarPrimary")}
                <ArrowRight className="size-3.5" />
              </Link>
              <a
                href={ZALO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="border-white/20 bg-white/5 hover:bg-white/10 hidden items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors sm:inline-flex"
              >
                <MessageCircle className="size-3.5" />
                {t("ctaBarZalo")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
