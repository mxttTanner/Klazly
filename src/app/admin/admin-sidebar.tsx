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
  UserSquare2,
  type LucideIcon,
} from "lucide-react";
import type { NavItem, NavKey } from "./nav-config";

const ICONS: Record<NavKey, LucideIcon> = {
  overview: BarChart3,
  teachers: UserSquare2,
  parents: Heart,
  classes: BookOpen,
  students: GraduationCap,
  worksheets: FileText,
  settings: Settings,
};

export function AdminSidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = ICONS[item.key];
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
