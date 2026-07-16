import { Gem } from "lucide-react";

/**
 * Internal-only tier badge — never shown to tenant users (the
 * super-admin layout is gated by requireSuperAdmin, and these badges
 * only render from super-admin pages).
 *
 * Visual contract:
 *   design_partner  violet/purple, "DP"
 *   standard        nothing — most centers; we don't need to label them
 *
 * `size="full"` uses the long label ("Design Partner") for prominent
 * surfaces like the detail page header. `size="compact"` uses the
 * two-letter shorthand for table rows and action-panel chips.
 */
export function TierBadge({
  tier,
  size = "compact",
}: {
  tier: string | null | undefined;
  size?: "compact" | "full";
}) {
  if (tier !== "design_partner") return null;

  const compact = size === "compact";
  return (
    <span
      className={
        "ring-violet-200 inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 text-violet-800 ring-1 " +
        (compact
          ? "py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          : "py-1 text-xs font-semibold")
      }
      title="Design Partner — free-forever, internal use"
    >
      <Gem className={compact ? "size-2.5" : "size-3"} />
      {compact ? "DP" : "Design Partner"}
    </span>
  );
}
