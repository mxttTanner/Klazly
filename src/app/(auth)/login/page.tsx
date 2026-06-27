import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Lock } from "lucide-react";
import { LoginForm } from "./login-form";
import { getCurrentUser, dashboardPathFor } from "@/lib/auth";
import { LanguageToggle } from "@/components/language-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { LoginBrandPanel } from "./brand-panel";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(dashboardPathFor(user.role));

  const t = await getTranslations("login");
  const tLanding = await getTranslations("landing");

  return (
    <div className="min-h-dvh bg-background">
      {/* Gradient hairline at the very top — bookends the brand
          identity used across landing + portals. */}
      <div
        aria-hidden="true"
        className="from-sky-400 via-primary to-amber-400 absolute inset-x-0 top-0 z-30 h-px bg-gradient-to-r"
      />
      <div className="grid min-h-dvh lg:grid-cols-[3fr_2fr]">
        {/* FORM SIDE — left (60%) */}
        <div className="relative flex flex-col">
          {/* Mobile-only branded hero strip. Now richer: animated
              gradient orbs, pulsing amber dot eyebrow, "Welcome back"
              register tied to the rest of the brand. */}
          <div
            className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 pt-safe pb-8 pt-10 text-white sm:px-10 sm:pb-10 lg:hidden"
          >
            {/* Floating mesh — primary + amber orbs that drift */}
            <div
              aria-hidden="true"
              className="klazly-drift-a pointer-events-none absolute -top-20 left-1/2 size-[24rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/30 to-transparent blur-3xl"
            />
            <div
              aria-hidden="true"
              className="klazly-drift-b pointer-events-none absolute bottom-0 right-0 size-[18rem] rounded-full bg-amber-500/15 blur-3xl"
            />
            {/* Dot grid texture */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center_top,black_30%,transparent_75%)]"
            />
            <div className="relative flex items-center justify-between gap-3">
              <Link
                href="/"
                aria-label={tLanding("brandAriaLabel")}
                className="inline-flex text-white transition hover:opacity-80"
              >
                <BrandLogo size="md" />
              </Link>
              <div className="[&_button]:bg-white/5 [&_button]:text-white [&_button]:border-white/15 [&_button:hover]:bg-white/10">
                <LanguageToggle />
              </div>
            </div>
            <p className="text-amber-300 relative mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              <span className="relative inline-flex size-1.5">
                <span className="bg-amber-400 absolute inset-0 rounded-full motion-safe:animate-ping motion-safe:opacity-75" />
                <span className="bg-amber-400 relative inline-block size-1.5 rounded-full" />
              </span>
              {t("welcomeBack")}
            </p>
            <p className="text-slate-300 relative mt-2 max-w-xs text-sm leading-relaxed">
              {t("subtitle")}
            </p>
          </div>

          {/* Desktop EN/VI toggle pinned top-right of the form side */}
          <div className="absolute right-4 top-4 z-10 hidden lg:block">
            <LanguageToggle />
          </div>

          <header className="hidden px-6 pt-10 sm:px-10 sm:pt-12 lg:block">
            <Link
              href="/"
              aria-label={tLanding("brandAriaLabel")}
              className="inline-flex transition hover:opacity-80"
            >
              <BrandLogo size="md" />
            </Link>
          </header>

          <main className="relative flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:py-16">
            {/* Subtle bg orb on desktop for depth */}
            <div
              aria-hidden="true"
              className="bg-primary/[0.04] pointer-events-none absolute right-0 top-1/3 hidden size-[24rem] rounded-full blur-3xl lg:block"
            />
            <div className="relative w-full max-w-sm space-y-7">
              {/* Desktop welcome block — bigger headline + amber dot
                  eyebrow matching the mobile hero strip. */}
              <div className="hidden space-y-3 lg:block">
                <span className="text-amber-700 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
                  <span className="relative inline-flex size-1.5">
                    <span className="bg-amber-500 absolute inset-0 rounded-full motion-safe:animate-ping motion-safe:opacity-75" />
                    <span className="bg-amber-500 relative inline-block size-1.5 rounded-full" />
                  </span>
                  Klazly
                </span>
                <h1 className="text-balance text-4xl font-bold tracking-tight">
                  {t("welcomeBack")}
                </h1>
                <p className="text-muted-foreground text-base">
                  {t("subtitle")}
                </p>
              </div>

              {/* Mobile shows just "Welcome back" since the eyebrow +
                  subtitle are already in the hero strip above. */}
              <div className="space-y-1.5 lg:hidden">
                <h1 className="text-3xl font-bold tracking-tight">
                  {t("welcomeBack")}
                </h1>
              </div>

              {/* Form card — lifted into a real card with shadow + ring
                  + subtle gradient top accent so the login isn't a
                  naked form on flat background. */}
              <div className="bg-card relative overflow-hidden rounded-2xl border p-6 shadow-xl shadow-primary/[0.04] ring-1 ring-black/[0.03] sm:p-7">
                <div
                  aria-hidden="true"
                  className="from-sky-400 via-primary to-amber-400 absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r"
                />
                <LoginForm />
              </div>

              <p className="text-muted-foreground text-center text-sm">
                {t("newHere")}{" "}
                <Link
                  href="/pricing"
                  className="text-primary hover:text-primary/80 inline-flex items-center gap-0.5 font-bold underline underline-offset-4 hover:underline-offset-2 transition-all"
                >
                  {t("startTrialLink")}
                  <ArrowRight className="size-3.5" />
                </Link>
              </p>

              {/* Trust signal — warmer treatment with emerald-tinted
                  background + emerald icon chip + bolder text */}
              <div className="border-emerald-200/60 bg-emerald-50/40 text-emerald-900 flex items-start gap-2.5 rounded-xl border p-3.5 text-xs leading-relaxed">
                <span className="bg-emerald-100 text-emerald-700 ring-emerald-200 mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md ring-1">
                  <Lock className="size-3.5" />
                </span>
                <p className="leading-relaxed">{t("trustSignal")}</p>
              </div>
            </div>
          </main>

          <footer className="text-muted-foreground relative flex items-center justify-center gap-2 px-6 pb-6 text-center text-xs sm:px-10">
            <span>© {new Date().getFullYear()} Klazly</span>
            <span className="bg-muted-foreground/30 size-0.5 rounded-full" />
            <span>Hải Phòng, Việt Nam</span>
          </footer>
        </div>

        {/* BRAND PANEL — right (40%). Hidden on mobile (lg+ only). */}
        <LoginBrandPanel />
      </div>
    </div>
  );
}
