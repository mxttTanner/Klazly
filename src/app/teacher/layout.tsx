import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { LanguageToggle } from "@/components/language-toggle";
import { DemoBanner } from "@/components/demo-banner";
import { CenterLogo } from "@/components/center-logo";
import { Avatar } from "@/components/ui/avatar";

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
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950/40">
      <DemoBanner email={user.email} />
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 shadow-[0_1px_3px_-1px_rgb(0_0_0/0.06)] backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/teacher"
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
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar name={user.full_name} seed={user.id} size="sm" />
              <span className="text-foreground max-w-[10rem] truncate text-sm font-medium">
                {user.full_name}
              </span>
            </div>
            <div className="bg-border hidden h-5 w-px sm:block" />
            <LanguageToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
