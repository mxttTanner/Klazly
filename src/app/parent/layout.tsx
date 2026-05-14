import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { LanguageToggle } from "@/components/language-toggle";
import { DemoBanner } from "@/components/demo-banner";
import { CenterLogo } from "@/components/center-logo";

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
    <div className="min-h-dvh">
      <DemoBanner email={user.email} />
      <header className="bg-background/85 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-20 border-b border-border backdrop-blur-md print:static print:border-0 print:bg-transparent print:backdrop-blur-none print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
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
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-muted-foreground hidden max-w-[10rem] truncate text-sm sm:inline">
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
