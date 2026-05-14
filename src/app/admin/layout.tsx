import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { LanguageToggle } from "@/components/language-toggle";
import { DemoBanner } from "@/components/demo-banner";
import { CenterLogo } from "@/components/center-logo";
import { SubscriptionBanner } from "@/components/subscription-banner";
import { AdminSidebarNav } from "./admin-sidebar";
import { buildAdminNavItems } from "./nav-config";
import { AdminMobileSidebar } from "./mobile-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("admin");
  const t = await getTranslations("admin");
  const items = buildAdminNavItems((k) => t(k));

  // Center identity for the topbar logo (uploaded logo + name if set).
  const supabase = createClient();
  const { data: center } = await supabase
    .from("centers")
    .select("name, logo_url")
    .eq("id", user.center_id)
    .single();

  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950/40">
      <DemoBanner email={user.email} />
      <SubscriptionBanner centerId={user.center_id} userEmail={user.email} />

      <div className="flex">
        {/* Desktop sidebar — pure white panel sitting on the cool-gray page
            background so the separation is visible without depending on
            theme tokens that happen to share a value. Right edge gets a
            soft shadow in addition to the hairline border so the panel
            feels lifted instead of stencil-cut. */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-border bg-background shadow-[1px_0_4px_-2px_rgb(0_0_0/0.06)] md:flex md:flex-col dark:bg-zinc-900">
          <div className="border-b border-border p-4">
            <Link
              href="/admin"
              className="flex min-w-0 max-w-full items-center gap-2.5"
              aria-label={t("navTitle")}
            >
              <CenterLogo
                centerName={center?.name ?? t("navTitle")}
                logoUrl={center?.logo_url ?? null}
                size="sm"
              />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <AdminSidebarNav items={items} />
          </div>
        </aside>

        {/* Main column */}
        <div className="min-w-0 flex-1">
          {/* Top bar — sticky frosted-glass when content scrolls under,
              plus a soft drop shadow so even with nothing scrolling the
              bar has visible depth instead of looking like a flat 1px
              hairline. */}
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-4 py-3 shadow-[0_1px_3px_-1px_rgb(0_0_0/0.06)] backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
              <AdminMobileSidebar
                items={items}
                brandLabel={t("navTitle")}
                triggerLabel={t("openMenu")}
              />
              <Link
                href="/admin"
                className="flex min-w-0 items-center gap-2"
              >
                <CenterLogo
                  centerName={center?.name ?? t("navTitle")}
                  logoUrl={center?.logo_url ?? null}
                  size="sm"
                />
              </Link>
            </div>
            <div className="hidden md:block md:flex-1" />
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-muted-foreground hidden max-w-[10rem] truncate text-sm sm:inline">
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
