import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireSuperAdmin } from "@/lib/super-admin";
import { LogoutButton } from "@/components/logout-button";
import { LanguageToggle } from "@/components/language-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { Avatar } from "@/components/ui/avatar";
import { FeedbackWidget } from "@/components/feedback-widget";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const owner = await requireSuperAdmin();
  const t = await getTranslations("superAdmin");

  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950/40">
      {/* Owner strip — neutral dark band marks the internal platform-
          owner console. A single primary dot is the only accent; the
          old amber role-color treatment is retired. */}
      <div className="bg-foreground text-background">
        <div className="mx-auto max-w-5xl px-4 py-2 sm:px-6">
          <p className="inline-flex w-full items-center justify-center gap-2 text-center text-xs font-medium uppercase tracking-wide">
            <span className="bg-primary inline-block size-1.5 shrink-0 rounded-full" />
            <span className="truncate">{t("ownerStrip", { email: owner.email })}</span>
          </p>
        </div>
      </div>
      <header className="sticky top-0 z-20 border-b border-border bg-background/70 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <Link
            href="/super-admin"
            className="flex min-w-0 flex-1 items-center gap-2.5"
            aria-label={t("navTitle")}
          >
            <BrandLogo size="sm" showText={false} />
            <span className="min-w-0 truncate text-base font-semibold">
              {t("navTitle")}
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="inline-flex min-h-11 items-center gap-2 px-1.5 py-1">
              <Avatar name={owner.email ?? "?"} seed={owner.id} size="sm" />
              <span className="text-foreground hidden max-w-[12rem] truncate text-sm font-medium sm:inline">
                {owner.email}
              </span>
            </div>
            <div className="bg-border hidden h-5 w-px sm:block" />
            <LanguageToggle />
            <LogoutButton tone="light" />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      <FeedbackWidget />
    </div>
  );
}
