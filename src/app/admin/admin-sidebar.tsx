"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  FileText,
  GraduationCap,
  Heart,
  Settings,
  Upload,
  UserSquare2,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function buildAdminNavItems(t: (k: string) => string): NavItem[] {
  return [
    { href: "/admin", label: t("navOverview"), icon: BarChart3 },
    { href: "/admin/teachers", label: t("navTeachers"), icon: UserSquare2 },
    { href: "/admin/parents", label: t("navParents"), icon: Heart },
    { href: "/admin/classes", label: t("navClasses"), icon: BookOpen },
    { href: "/admin/students", label: t("navStudents"), icon: GraduationCap },
    { href: "/admin/worksheets", label: t("navWorksheets"), icon: FileText },
    { href: "/admin/import", label: t("navImport"), icon: Upload },
    { href: "/admin/settings", label: t("navSettings"), icon: Settings },
  ];
}

export function AdminSidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              "inline-flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition " +
              (active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground")
            }
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
