import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { LanguageToggle } from "@/components/language-toggle";
import { DemoBanner } from "@/components/demo-banner";
import { CenterLogo } from "@/components/center-logo";
import { Avatar } from "@/components/ui/avatar";
import { FeedbackWidget } from "@/components/feedback-widget";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("parent");
  const t = await getTranslations("parent");

  const supabase = createClient();
  const { data: center } = await supabase
    .from("centers")
    .select("name, logo_url")
    .eq("id", user.center_id)
    .single();

  return (
    <div className="min-h-dvh bg-background print:bg-white">
      <DemoBanner email={user.email} />
      {/* Sticky header — single hairline border, no role-colored accent.
          Wayfinding between areas is by text label, not hue. */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/70 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 print:static print:border-0 print:bg-transparent print:shadow-none print:backdrop-blur-none print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <Link
            href="/parent"
            className="flex min-w-0 flex-1 items-center gap-2.5"
            aria-label={t("navTitle")}
          >
            <CenterLogo
              centerName={center?.name ?? t("navTitle")}
              logoUrl={center?.logo_url ?? null}
              size="sm"
            />
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/profile"
              className="hover:bg-muted inline-flex min-h-11 items-center gap-2 rounded-md px-1.5 py-1 transition"
              aria-label={user.full_name}
            >
              <Avatar name={user.full_name} seed={user.id} size="sm" />
              <span className="text-foreground hidden max-w-[10rem] truncate text-sm font-medium sm:inline">
                {user.full_name}
              </span>
            </Link>
            <div className="bg-border hidden h-5 w-px sm:block" />
            <LanguageToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 print:max-w-full print:p-0">
        {children}
      </div>
      <FeedbackWidget />
    </div>
  );
}
