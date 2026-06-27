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
import { ZALO_URL } from "@/lib/zalo";

/**
 * Public demo chooser. Visitors land here from the marketing page,
 * pick a role, and get dropped into a read-only demo session for that
 * role. The Center Admin role is visually emphasised because that's
 * the audience the marketing site targets — owners.
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
      tone: "bg-sky-50 text-sky-700",
      accent: "bg-sky-500",
      // Soft gradient wash so each card reads as the role it represents
      // at a glance — same role palette as the portal headers.
      wash: "from-sky-50/80 via-background to-background",
      href: "/demo/admin",
      recommended: true,
    },
    {
      key: "teacher",
      icon: GraduationCap,
      title: t("roleTeacherTitle"),
      desc: t("roleTeacherDesc"),
      tone: "bg-violet-50 text-violet-700",
      accent: "bg-violet-500",
      wash: "from-violet-50/80 via-background to-background",
      href: "/demo/teacher",
      recommended: false,
    },
    {
      key: "parent",
      icon: Heart,
      title: t("roleParentTitle"),
      desc: t("roleParentDesc"),
      tone: "bg-rose-50 text-rose-700",
      accent: "bg-rose-500",
      wash: "from-rose-50/80 via-background to-background",
      href: "/demo/parent",
      recommended: false,
    },
  ];

  // Per-role visual treatment for the tiles. Gradient washes + orb
  // colors + ring tones tie back to the role-color system used on
  // the portal headers (sky=admin, violet=teacher, rose=parent).
  const roleVisuals: Record<
    string,
    { wash: string; orb: string; iconBg: string; iconRing: string; ringGlow: string }
  > = {
    admin: {
      wash: "from-sky-50/70 via-card to-card",
      orb: "bg-sky-200/40",
      iconBg: "bg-gradient-to-br from-sky-400 to-sky-600 text-white",
      iconRing: "ring-sky-200",
      ringGlow: "ring-sky-300/30",
    },
    teacher: {
      wash: "from-violet-50/70 via-card to-card",
      orb: "bg-violet-200/40",
      iconBg: "bg-gradient-to-br from-violet-400 to-violet-600 text-white",
      iconRing: "ring-violet-200",
      ringGlow: "ring-violet-300/30",
    },
    parent: {
      wash: "from-rose-50/70 via-card to-card",
      orb: "bg-rose-200/40",
      iconBg: "bg-gradient-to-br from-rose-400 to-rose-600 text-white",
      iconRing: "ring-rose-200",
      ringGlow: "ring-rose-300/30",
    },
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background pb-40 sm:pb-32">
      {/* Section-wide ambient orbs to give the page depth — matches
          the landing's three-role-orb treatment in the audience
          section. */}
      <div
        aria-hidden="true"
        className="bg-sky-100/40 pointer-events-none absolute -top-32 -left-32 size-[28rem] rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="bg-violet-100/30 pointer-events-none absolute top-1/3 right-0 size-[24rem] rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="bg-rose-100/30 pointer-events-none absolute bottom-40 left-1/4 size-[20rem] rounded-full blur-3xl"
      />

      {/* Top nav — matches the landing page treatment exactly so
          clicking "Demo" from the landing doesn't lose the page
          chrome. Features/Pricing/Demo/Contact stay visible; the
          active "Demo" pill gets a white background + primary text
          + shadow so the user knows where they are. */}
      <header className="relative border-b border-border bg-background/70 sticky top-0 z-20 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div
          aria-hidden="true"
          className="from-sky-400 via-primary to-amber-400 absolute inset-x-0 top-0 h-px bg-gradient-to-r"
        />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link
            href="/"
            aria-label={tLanding("brandAriaLabel")}
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
              className="text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition"
            >
              {tLanding("heroLoginCta")}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 sm:px-6">
        {/* HERO — bigger headline + amber pulsing dot eyebrow ties
            it to the landing's hero language. */}
        <section className="mx-auto max-w-3xl pb-12 pt-12 text-center sm:pb-16 sm:pt-20">
          <span className="border-amber-200/60 bg-amber-50/80 text-amber-800 ring-amber-200/60 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest shadow-sm ring-1">
            <span className="relative inline-flex size-1.5">
              <span className="bg-amber-500 absolute inset-0 rounded-full motion-safe:animate-ping motion-safe:opacity-75" />
              <span className="bg-amber-500 relative inline-block size-1.5 rounded-full" />
            </span>
            <Eye className="size-3.5" />
            {t("heroBannerLabel")}
            <span className="text-amber-700/70 normal-case font-normal tracking-normal">
              · {t("heroBannerNote")}
            </span>
          </span>
          <h1 className="mt-6 text-balance text-2xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-balance text-base sm:text-lg">
            {t("heroSubtitle")}
          </p>
        </section>

        {/* ROLE SWITCHER — premium tile treatment: gradient avatar
            chips with white initials, decorative corner orb in role
            color, floating "Recommended" ribbon at the top of the
            primary card, hover lift + scale + bigger shadow. */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => {
            const Icon = r.icon;
            const isPrimary = r.recommended;
            const visual = roleVisuals[r.key];
            return (
              <Link
                key={r.key}
                href={r.href}
                className={
                  "group relative flex flex-col overflow-visible rounded-2xl border bg-gradient-to-br shadow-md transition-all hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-2xl " +
                  visual.wash +
                  " " +
                  (isPrimary
                    ? "ring-primary/30 ring-2 shadow-primary/10 lg:scale-[1.03] lg:-mt-2"
                    : "ring-1 ring-black/[0.04]")
                }
              >
                <div className={`absolute inset-x-0 top-0 h-1 ${r.accent} rounded-t-2xl`} />
                {/* Corner orb in the role color — extends past the
                    card border to give the tile dimensionality. */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -top-4 -right-4 size-32 rounded-full ${visual.orb} blur-3xl`}
                />

                {/* Floating "Recommended" ribbon on the primary tile —
                    sits above the top edge to feel like a tag rather
                    than a corner pill. */}
                {isPrimary ? (
                  <span className="bg-primary text-primary-foreground absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/30 ring-2 ring-primary/40">
                    <Sparkles className="size-3 motion-safe:animate-pulse" />
                    {t("recommended")}
                  </span>
                ) : null}

                <div className="relative flex flex-1 flex-col p-5 sm:p-7">
                  {/* Gradient avatar chip — slightly smaller on mobile
                      so the tile content has more breathing room. */}
                  <div
                    className={`flex size-12 items-center justify-center rounded-2xl shadow-lg ring-4 transition-transform group-hover:scale-110 group-hover:rotate-3 sm:size-14 ${visual.iconBg} ${visual.iconRing}`}
                  >
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
                    className={`mt-6 inline-flex items-center gap-1.5 self-start transition-transform group-hover:translate-x-1 ${
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
          FLOATING BOTTOM CTA BAR — polished navy gradient with
          gradient hairline + pulsing amber dot eyebrow + scale-on-
          hover CTAs. Respects iOS safe-area inset.
          ============================================================ */}
      <div className="fixed inset-x-0 bottom-0 z-30 print:hidden">
        <div className="from-slate-950/95 via-slate-900/95 to-slate-950/95 relative border-t border-white/10 bg-gradient-to-r text-white shadow-[0_-8px_32px_-8px_rgb(0_0_0/0.5)] backdrop-blur-xl pb-safe">
          {/* Gradient hairline at the very top of the bar — bookends
              the page chrome that started with the landing nav hairline. */}
          <div
            aria-hidden="true"
            className="from-sky-400 via-primary to-amber-400 absolute inset-x-0 top-0 h-px bg-gradient-to-r"
          />
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:flex-wrap sm:px-6 sm:py-4">
            <div className="min-w-0 flex-1">
              {/* Eyebrow hidden on mobile to keep the bar two-line max */}
              <p className="text-amber-300 hidden items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest sm:inline-flex">
                <span className="relative inline-flex size-1.5">
                  <span className="bg-amber-400 absolute inset-0 rounded-full motion-safe:animate-ping motion-safe:opacity-75" />
                  <span className="bg-amber-400 relative inline-block size-1.5 rounded-full" />
                </span>
                Klazly
              </p>
              <p className="text-sm font-bold sm:text-base">
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
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold shadow-lg shadow-primary/30 ring-1 ring-primary/40 transition hover:scale-[1.03]"
              >
                {t("ctaBarPrimary")}
                <ArrowRight className="size-3.5" />
              </Link>
              <a
                href={ZALO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="border-white/20 bg-white/5 hover:bg-white/10 hidden items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-semibold backdrop-blur-sm transition sm:inline-flex"
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
