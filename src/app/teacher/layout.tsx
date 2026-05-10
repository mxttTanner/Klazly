import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { LanguageToggle } from "@/components/language-toggle";
import { DemoBanner } from "@/components/demo-banner";
import { CenterLogo } from "@/components/center-logo";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["teacher", "admin"]);
  const t = await getTranslations("teacher");

  const supabase = createClient();
  const { data: center } = await supabase
    .from("centers")
    .select("name, logo_url")
    .eq("id", user.center_id)
    .single();

  return (
    <div className="min-h-dvh">
      <DemoBanner email={user.email} />
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/teacher"
            className="inline-flex items-center gap-2.5"
            aria-label={t("navTitle")}
          >
            <CenterLogo
              centerName={center?.name ?? t("navTitle")}
              logoUrl={center?.logo_url ?? null}
              size="sm"
            />
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
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
