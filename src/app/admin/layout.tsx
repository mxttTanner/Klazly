import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { LanguageToggle } from "@/components/language-toggle";
import { DemoBanner } from "@/components/demo-banner";
import { BrandWordmark } from "@/components/brand-wordmark";
import { Avatar } from "@/components/ui/avatar";
import { SubscriptionBanner } from "@/components/subscription-banner";
import { FeedbackWidget } from "@/components/feedback-widget";
import { AdminTopNav } from "./admin-top-nav";
import { buildAdminNavItems } from "./nav-config";

/**
 * Admin shell — dark navy top bar + horizontal sub-nav (matches
 * admin.png). The content area below stays light so non-dashboard
 * sub-pages keep their existing readable cards; the dashboard page
 * paints its own full-bleed dark canvas.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("admin");
  const t = await getTranslations("admin");
  const items = buildAdminNavItems((k) => t(k));

  const supabase = createClient();
  const { data: center } = await supabase
    .from("centers")
    .select("name, logo_url")
    .eq("id", user.center_id)
    .single();
  const centerName = center?.name ?? t("navTitle");

  return (
    <div className="min-h-dvh bg-background">
      <DemoBanner email={user.email} />
      <SubscriptionBanner centerId={user.center_id} userEmail={user.email} />

      {/* Dark app chrome */}
      <header className="sticky top-0 z-30 border-b border-brand-line-dark bg-navy text-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/admin" aria-label={t("navTitle")}>
              <BrandWordmark className="text-[20px]" />
            </Link>
            <span className="hidden text-sm text-brand-mut lg:inline">
              klazly.com/admin
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald/15 px-2.5 py-1 text-[11px] font-bold tracking-wide text-emerald-light">
              <span className="size-1.5 rounded-full bg-emerald-light" />
              {t("live")}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden max-w-[12rem] truncate text-sm font-bold text-white sm:inline">
              {centerName}
            </span>
            <span className="hidden h-5 w-px bg-brand-line-dark sm:block" />
            <Link
              href="/profile"
              className="inline-flex min-h-11 items-center gap-2 rounded-md px-1.5 py-1 transition hover:bg-white/5"
              aria-label={user.full_name}
            >
              <Avatar name={user.full_name} seed={user.id} size="sm" />
            </Link>
            <LanguageToggle />
            <LogoutButton />
          </div>
        </div>
        <div className="border-t border-brand-line-dark/60">
          <div className="mx-auto max-w-[1400px] px-4 py-2 sm:px-6">
            <AdminTopNav items={items} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      <FeedbackWidget />
    </div>
  );
}
