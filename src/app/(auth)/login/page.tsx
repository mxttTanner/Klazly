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
      <div className="grid min-h-dvh lg:grid-cols-[3fr_2fr]">
        {/* FORM SIDE — left (60%) */}
        <div className="relative flex flex-col">
          {/* EN/VI toggle pinned top-right of the form side */}
          <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
            <LanguageToggle />
          </div>

          <header className="px-6 pt-8 sm:px-10 sm:pt-10">
            <Link
              href="/"
              aria-label={tLanding("brandAriaLabel")}
              className="inline-flex"
            >
              <BrandLogo size="md" />
            </Link>
          </header>

          <main className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
            <div className="w-full max-w-sm space-y-7">
              <div className="space-y-1.5">
                <h1 className="text-3xl font-semibold tracking-tight">
                  {t("welcomeBack")}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {t("subtitle")}
                </p>
              </div>

              <LoginForm />

              <p className="text-muted-foreground text-center text-sm">
                {t("newHere")}{" "}
                <Link
                  href="/pricing"
                  className="text-primary hover:underline inline-flex items-center gap-0.5 font-medium"
                >
                  {t("startTrialLink")}
                  <ArrowRight className="size-3.5" />
                </Link>
              </p>

              {/* Trust signal */}
              <div className="text-muted-foreground flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed">
                <Lock className="text-emerald-600 mt-0.5 size-4 shrink-0" />
                <p>{t("trustSignal")}</p>
              </div>
            </div>
          </main>

          <footer className="text-muted-foreground px-6 pb-6 text-center text-xs sm:px-10">
            © {new Date().getFullYear()} Klazly
          </footer>
        </div>

        {/* BRAND PANEL — right (40%). Hidden on mobile (lg+ only). */}
        <LoginBrandPanel />
      </div>
    </div>
  );
}
