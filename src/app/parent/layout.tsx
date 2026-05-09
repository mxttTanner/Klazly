import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { LanguageToggle } from "@/components/language-toggle";
import { DemoBanner } from "@/components/demo-banner";
import { BrandLogo } from "@/components/brand-logo";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("parent");
  const t = await getTranslations("parent");

  return (
    <div className="min-h-dvh">
      <DemoBanner email={user.email} />
      <header className="border-b print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/parent"
            className="inline-flex items-center gap-2.5"
            aria-label={t("navTitle")}
          >
            <BrandLogo size="sm" showText={false} />
            <span className="text-base font-semibold">{t("navTitle")}</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {user.full_name}
            </span>
            <LanguageToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 print:max-w-full print:p-0">
        {children}
      </div>
    </div>
  );
}
