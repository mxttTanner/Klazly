import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BookOpen, GraduationCap, Heart, UserSquare2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { LanguageToggle } from "@/components/language-toggle";
import { DemoBanner } from "@/components/demo-banner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("admin");
  const t = await getTranslations("admin");

  const navLinks = [
    { href: "/admin/teachers", label: t("navTeachers"), icon: UserSquare2 },
    { href: "/admin/parents", label: t("navParents"), icon: Heart },
    { href: "/admin/classes", label: t("navClasses"), icon: BookOpen },
    { href: "/admin/students", label: t("navStudents"), icon: GraduationCap },
  ];

  return (
    <div className="min-h-dvh">
      <DemoBanner email={user.email} />
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-semibold">
              {t("navTitle")}
            </Link>
            <nav className="hidden gap-4 text-sm md:flex">
              {navLinks.map((l) => {
                const Icon = l.icon;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
                  >
                    <Icon className="size-3.5" />
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {user.full_name}
            </span>
            <LanguageToggle />
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-6 pb-3 text-sm md:hidden">
          {navLinks.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Icon className="size-3.5" />
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
