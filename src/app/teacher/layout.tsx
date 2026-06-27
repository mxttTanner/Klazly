import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { LanguageToggle } from "@/components/language-toggle";
import { DemoBanner } from "@/components/demo-banner";
import { BrandWordmark } from "@/components/brand-wordmark";
import { Avatar } from "@/components/ui/avatar";
import { FeedbackWidget } from "@/components/feedback-widget";

/**
 * Teacher shell — dark navy app bar (matches teacher.png): Klazly
 * wordmark left, "Giáo viên · {name}" right. Phone-first; the content
 * area is a dark canvas the lesson-log and class screens paint on.
 */
export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["teacher", "admin"]);
  const t = await getTranslations("teacher");

  return (
    <div className="min-h-dvh bg-background">
      <DemoBanner email={user.email} />
      <header className="sticky top-0 z-20 border-b border-brand-line-dark bg-navy/95 backdrop-blur-md supports-[backdrop-filter]:bg-navy/85">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/teacher" aria-label={t("navTitle")}>
            <BrandWordmark className="text-[20px]" />
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/profile"
              className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 transition hover:bg-white/5"
              aria-label={user.full_name}
            >
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-[11px] text-brand-mut">{t("roleLabel")}</p>
                <p className="max-w-[10rem] truncate text-sm font-bold text-white">
                  {user.full_name}
                </p>
              </div>
              <Avatar name={user.full_name} seed={user.id} size="sm" />
            </Link>
            <LanguageToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      <FeedbackWidget />
    </div>
  );
}
