"use client";

import { useState, type ReactNode } from "react";
import { Building2, Plus, type LucideIcon } from "lucide-react";

type IconKey = "centers" | "new";

const ICONS: Record<IconKey, LucideIcon> = {
  centers: Building2,
  new: Plus,
};

export type SuperAdminTab = {
  id: string;
  label: string;
  iconKey: IconKey;
  badge?: string | number;
  content: ReactNode;
};

/**
 * Horizontal tab bar for the super-admin page. Only the active tab's
 * content mounts so the page doesn't feel like one long scroll. Icons
 * map via string keys because server components can't pass function
 * components across the boundary.
 */
export function SuperAdminTabs({
  tabs,
  defaultId,
}: {
  tabs: SuperAdminTab[];
  defaultId?: string;
}) {
  const [activeId, setActiveId] = useState<string>(
    defaultId ?? tabs[0]?.id ?? "",
  );
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div className="space-y-6">
      <nav
        role="tablist"
        aria-label="Super-admin sections"
        className="flex flex-wrap gap-1 border-b"
      >
        {tabs.map((tab) => {
          const Icon = ICONS[tab.iconKey];
          const isActive = tab.id === active?.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tab-${tab.id}`}
              onClick={() => setActiveId(tab.id)}
              className={
                "relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition " +
                (isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              <Icon className="size-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge !== 0 ? (
                <span
                  className={
                    "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold " +
                    (isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground")
                  }
                >
                  {tab.badge}
                </span>
              ) : null}
              {isActive ? (
                <span className="bg-primary absolute inset-x-0 -bottom-px h-0.5" />
              ) : null}
            </button>
          );
        })}
      </nav>

      <div id={`tab-${active?.id}`} role="tabpanel">
        {active?.content}
      </div>
    </div>
  );
}
