import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { LanguageToggle } from "@/components/language-toggle";
import { DemoBanner } from "@/components/demo-banner";
import { BrandLogo } from "@/components/brand-logo";
import {
  AdminSidebarNav,
  buildAdminNavItems,
} from "./admin-sidebar";
import { AdminMobileSidebar } from "./mobile-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("admin");
  const t = await getTranslations("admin");
  const items = buildAdminNavItems((k) => t(k));

  return (
    <div className="bg-muted/20 min-h-dvh">
      <DemoBanner email={user.email} />

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="bg-background sticky top-0 hidden h-dvh w-60 shrink-0 border-r md:flex md:flex-col">
          <div className="border-b p-4">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2.5"
              aria-label={t("navTitle")}
            >
              <BrandLogo size="sm" showText={false} />
              <span className="text-sm font-semibold">{t("navTitle")}</span>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <AdminSidebarNav items={items} />
          </div>
        </aside>

        {/* Main column */}
        <div className="min-w-0 flex-1">
          {/* Top bar */}
          <header className="bg-background sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2 md:hidden">
              <AdminMobileSidebar
                items={items}
                brandLabel={t("navTitle")}
                triggerLabel={t("openMenu")}
              />
              <Link href="/admin" className="inline-flex items-center gap-2">
                <BrandLogo size="sm" showText={false} />
                <span className="text-sm font-semibold">{t("navTitle")}</span>
              </Link>
            </div>
            <div className="hidden md:block" />
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground hidden text-sm sm:inline">
                {user.full_name}
              </span>
              <LanguageToggle />
              <LogoutButton />
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
