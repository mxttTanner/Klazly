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
    <div className="bg-muted/20 min-h-dvh">
      <DemoBanner email={user.email} />
      <SubscriptionBanner centerId={user.center_id} userEmail={user.email} />

      <div className="flex">
        {/* Desktop sidebar — uses bg-card so the panel reads as its own
            surface against the bg-muted/20 page background. Border is the
            same token as the topbar; together they form a coherent frame
            around the content. */}
        <aside className="bg-card sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-border md:flex md:flex-col">
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
          {/* Top bar — frosted-glass effect: semi-transparent background +
              backdrop-blur so scrolled content faintly bleeds through,
              giving the bar visual depth instead of looking like a flat
              divider line. */}
          <header className="bg-background/85 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border px-4 py-3 backdrop-blur-md sm:px-6">
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
