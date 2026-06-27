import { Compass } from "lucide-react";

/**
 * Where centers came from. Simple counts-by-source breakdown rendered
 * on the super-admin overview. Server component — takes pre-counted
 * data so we don't re-query inside.
 *
 * Hidden when there's no signup_source data at all (older centers
 * that pre-date the migration won't have any).
 */
export function SourceAnalytics({
  counts,
  total,
  labels,
}: {
  counts: Record<string, number>;
  total: number;
  labels: Record<string, string>;
}) {
  if (total === 0) return null;

  const SOURCES = [
    "zalo_cold",
    "landing_cta",
    "referral",
    "in_person",
    "other",
  ];
  // Don't render sources that have zero entries — keeps the panel
  // tight on a brand-new account.
  const present = SOURCES.filter((s) => (counts[s] ?? 0) > 0);

  return (
    <section className="bg-card rounded-xl border p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Compass className="text-muted-foreground size-4" />
        <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
          Where customers come from
        </h2>
      </div>
      <ul className="mt-4 space-y-2.5">
        {present.map((s) => {
          const n = counts[s] ?? 0;
          const pct = total > 0 ? Math.round((n / total) * 100) : 0;
          return (
            <li key={s} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-foreground font-medium">
                  {labels[s] ?? s}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {n} · {pct}%
                </span>
              </div>
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
