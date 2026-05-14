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
      href: "/demo/parent",
      recommended: false,
    },
  ];

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="border-b border-border bg-background/85 sticky top-0 z-20 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            aria-label={tLanding("brandAriaLabel")}
            className="inline-flex"
          >
            <BrandLogo size="md" />
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* HERO */}
        <section className="mx-auto max-w-3xl pb-10 pt-12 text-center sm:pb-14 sm:pt-16">
          {/* Softer DEMO banner */}
          <span className="border-amber-200/60 bg-amber-50/70 text-amber-800 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            <Eye className="size-3.5" />
            {t("heroBannerLabel")}
            <span className="text-amber-700/70 normal-case font-normal tracking-normal">
              · {t("heroBannerNote")}
            </span>
          </span>
          <h1 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-balance text-lg">
            {t("heroSubtitle")}
          </p>
        </section>

        {/* ROLE SWITCHER — Center Admin emphasised */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => {
            const Icon = r.icon;
            const isPrimary = r.recommended;
            return (
              <Link
                key={r.key}
                href={r.href}
                className={
                  "group relative flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg " +
                  (isPrimary
                    ? "bg-card ring-primary/30 ring-2 lg:scale-[1.02]"
                    : "bg-card opacity-95 hover:opacity-100")
                }
              >
                {/* Top accent stripe per role */}
                <div className={`absolute inset-x-0 top-0 h-1 ${r.accent}`} />

                {isPrimary ? (
                  <span className="bg-primary text-primary-foreground absolute right-4 top-4 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                    <Sparkles className="size-3" />
                    {t("recommended")}
                  </span>
                ) : null}

                <div className="flex flex-1 flex-col p-6">
                  <div
                    className={`flex size-12 items-center justify-center rounded-xl ${r.tone}`}
                  >
                    <Icon className="size-6" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold tracking-tight">
                    {r.title}
                  </h2>
                  <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
                    {r.desc}
                  </p>
                  {isPrimary ? (
                    <p className="text-primary mt-3 text-xs font-medium">
                      {t("roleAdminRecommendedHint")}
                    </p>
                  ) : null}
                  <span
                    className={`mt-5 inline-flex items-center gap-1.5 self-start ${
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

        <p className="text-muted-foreground mt-12 text-center text-sm">
          {t("chooserHint")}{" "}
          <Link href="/" className="text-foreground underline">
            {t("backHome")}
          </Link>
        </p>
      </main>

      {/* ============================================================
          FLOATING BOTTOM CTA BAR
          ============================================================ */}
      <div className="fixed inset-x-0 bottom-0 z-30 print:hidden">
        <div className="from-slate-950/95 to-slate-900/90 border-t border-white/10 bg-gradient-to-r text-white shadow-[0_-4px_24px_-8px_rgb(0_0_0/0.3)] backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold sm:text-base">
                {t("ctaBarHeadline")}
              </p>
              <p className="text-slate-300 text-xs sm:text-sm">
                {t("ctaBarBody")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/pricing"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold shadow-md transition"
              >
                {t("ctaBarPrimary")}
                <ArrowRight className="size-3.5" />
              </Link>
              <a
                href="https://zalo.me/84862404036"
                target="_blank"
                rel="noopener noreferrer"
                className="border-white/20 bg-white/5 hover:bg-white/10 hidden items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium backdrop-blur-sm transition sm:inline-flex"
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
