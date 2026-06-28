import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Lock } from "lucide-react";
import { LoginForm } from "./login-form";
import { getCurrentUser, dashboardPathFor } from "@/lib/auth";
import { LanguageToggle } from "@/components/language-toggle";
import { BrandWordmark } from "@/components/brand-wordmark";
import { LoginBrandPanel } from "./brand-panel";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(dashboardPathFor(user.role));

  const t = await getTranslations("login");
  const tLanding = await getTranslations("landing");

  return (
    <div
      className="min-h-dvh bg-background"
      // Scope the brand accent to emerald so the shared LoginForm submit
      // button (and any primary element) matches the new theme instead
      // of the app's blue --primary.
      style={
        {
          "--primary": "oklch(0.54 0.12 162)",
          "--primary-foreground": "oklch(0.99 0 0)",
          "--ring": "oklch(0.54 0.12 162)",
        } as React.CSSProperties
      }
    >
      <div className="grid min-h-dvh lg:grid-cols-[3fr_2fr]">
        {/* FORM SIDE — left (60%) */}
        <div className="relative flex flex-col">
          {/* Mobile-only brand strip. Simplified navy header so the
              login keeps its identity without flashy motion. */}
          <div className="bg-navy px-6 pt-safe pb-8 pt-10 text-white sm:px-10 sm:pb-10 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/"
                aria-label={tLanding("brandAriaLabel")}
                className="inline-flex transition-opacity hover:opacity-80"
              >
                <BrandWordmark className="text-[22px]" />
              </Link>
              <LanguageToggle tone="dark" />
            </div>
            <p className="text-slate-400 mt-5 text-xs font-semibold uppercase tracking-widest">
              {t("welcomeBack")}
            </p>
            <p className="text-slate-300 mt-2 max-w-xs text-sm leading-relaxed">
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
              className="inline-flex transition-opacity hover:opacity-80"
            >
              <BrandWordmark tone="light" className="text-[22px]" />
            </Link>
          </header>

          <main className="relative flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:py-16">
            <div className="w-full max-w-sm space-y-7">
              {/* Desktop welcome block */}
              <div className="hidden space-y-3 lg:block">
                <span className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                  Klazly
                </span>
                <h1 className="text-balance text-4xl font-bold tracking-tight">
                  {t("welcomeBack")}
                </h1>
                <p className="text-muted-foreground text-base">
                  {t("subtitle")}
                </p>
              </div>

              {/* Mobile shows just "Welcome back" since the subtitle is
                  already in the strip above. */}
              <div className="space-y-1.5 lg:hidden">
                <h1 className="text-3xl font-bold tracking-tight">
                  {t("welcomeBack")}
                </h1>
              </div>

              {/* Form card — white card on off-white, hairline border +
                  resting shadow. */}
              <div className="bg-card rounded-xl border p-6 shadow-sm sm:p-7">
                <LoginForm />
              </div>

              <p className="text-muted-foreground text-center text-sm">
                {t("newHere")}{" "}
                <Link
                  href="/pricing"
                  className="text-emerald-dark hover:text-emerald-dark/80 inline-flex items-center gap-0.5 font-semibold underline underline-offset-4 transition-colors"
                >
                  {t("startTrialLink")}
                  <ArrowRight className="size-3.5" />
                </Link>
              </p>

              {/* Trust signal — neutral treatment. */}
              <div className="text-muted-foreground flex items-start gap-2.5 rounded-lg border bg-muted/40 p-3.5 text-xs leading-relaxed">
                <span className="bg-background text-muted-foreground mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md border">
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
