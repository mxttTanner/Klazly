/**
 * Nav definitions shared between server (admin layout) and client
 * (sidebar / mobile drawer). We keep ICONS *out* of this file because
 * passing function components from a server layout to a client child
 * is not allowed in Next App Router.
 */

export type NavKey =
  | "overview"
  | "teachers"
  | "parents"
  | "classes"
  | "students"
  | "worksheets"
  | "settings";

export type NavItem = {
  key: NavKey;
  href: string;
  label: string;
};

// CSV import deliberately not in the sidebar — it lives inline as an
// expandable section on /admin/parents and /admin/students. The
// /admin/import route still exists as a fallback for old bookmarks.
export function buildAdminNavItems(t: (k: string) => string): NavItem[] {
  return [
    { key: "overview", href: "/admin", label: t("navOverview") },
    { key: "teachers", href: "/admin/teachers", label: t("navTeachers") },
    { key: "parents", href: "/admin/parents", label: t("navParents") },
    { key: "classes", href: "/admin/classes", label: t("navClasses") },
    { key: "students", href: "/admin/students", label: t("navStudents") },
    { key: "worksheets", href: "/admin/worksheets", label: t("navWorksheets") },
    { key: "settings", href: "/admin/settings", label: t("navSettings") },
  ];
}
