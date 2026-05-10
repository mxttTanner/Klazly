"use client";

import { useState, type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

export type SettingsTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  content: ReactNode;
};

/**
 * Simple tab switcher for the settings page. Only the active tab's content
 * mounts in the DOM, so it feels like distinct pages instead of a long
 * scroll. We keep state on the client (no URL query) since the choice is
 * cosmetic and we don't want a server roundtrip per click.
 */
export function SettingsTabs({
  tabs,
  defaultId,
}: {
  tabs: SettingsTab[];
  defaultId?: string;
}) {
  const [activeId, setActiveId] = useState<string>(
    defaultId ?? tabs[0]?.id ?? "",
  );
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div className="lg:grid lg:grid-cols-[14rem_1fr] lg:gap-8">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <nav
          role="tablist"
          aria-label="Settings sections"
          className="flex flex-wrap gap-1 lg:flex-col"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
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
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition " +
                  (isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground")
                }
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div
        id={`tab-${active?.id}`}
        role="tabpanel"
        className="mt-6 lg:mt-0"
      >
        {active?.content}
      </div>
    </div>
  );
}
