"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "./nav-config";

/**
 * Horizontal sub-nav for the dark admin shell (matches admin.png).
 * Active route renders as an emerald-tinted pill; the rest are quiet
 * muted links. Scrolls horizontally on narrow viewports.
 */
export function AdminTopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((it) => {
        const active =
          it.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(it.href);
        return (
          <Link
            key={it.key}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "whitespace-nowrap rounded-full bg-emerald/15 px-4 py-2 text-sm font-semibold text-emerald-light"
                : "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-brand-mut-2 transition hover:bg-white/5 hover:text-white"
            }
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
