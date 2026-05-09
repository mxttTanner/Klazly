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
