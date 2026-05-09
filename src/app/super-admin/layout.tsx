import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireSuperAdmin } from "@/lib/super-admin";
import { LogoutButton } from "@/components/logout-button";
import { LanguageToggle } from "@/components/language-toggle";
import { BrandLogo } from "@/components/brand-logo";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const owner = await requireSuperAdmin();
  const t = await getTranslations("superAdmin");

  return (
    <div className="min-h-dvh">
      <div className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-6 py-2 text-center text-xs font-medium uppercase tracking-wide">
          {t("ownerStrip", { email: owner.email })}
        </div>
      </div>
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/super-admin"
            className="inline-flex items-center gap-2.5"
            aria-label={t("navTitle")}
          >
            <BrandLogo size="sm" showText={false} />
            <span className="text-base font-semibold">{t("navTitle")}</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
