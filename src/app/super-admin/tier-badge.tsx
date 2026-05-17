import { Gem, Sparkles } from "lucide-react";

/**
 * Internal-only tier badge — never shown to tenant users (the
 * super-admin layout is gated by requireSuperAdmin, and these badges
 * only render from super-admin pages).
 *
 * Visual contract:
 *   founding        amber/gold,    "FC" (+ "#N" when slotNumber set)
 *   design_partner  violet/purple, "DP"
 *   standard        nothing — most centers; we don't need to label them
 *
 * `size="full"` uses the long label ("Founding Center #1" / "Design
 * Partner") for prominent surfaces like the detail page header.
 * `size="compact"` uses the two-letter shorthand for table rows and
 * action-panel chips, with the slot tucked in as " #N".
 *
 * slotNumber appends the founding slot number when provided (1..N).
 * Null/undefined means "show the badge without a slot" — useful for
 * historical rows where the slot wasn't recorded.
 */
export function TierBadge({
  tier,
  size = "compact",
  slotNumber,
}: {
  tier: string | null | undefined;
  size?: "compact" | "full";
  slotNumber?: number | null;
}) {
  if (tier !== "founding" && tier !== "design_partner") return null;

  const compact = size === "compact";
  if (tier === "founding") {
    const slotSuffix =
      typeof slotNumber === "number" && slotNumber > 0 ? ` #${slotNumber}` : "";
    return (
      <span
        className={
          "ring-amber-300 inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-amber-50 to-amber-100 px-2 text-amber-800 ring-1 " +
          (compact
            ? "py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            : "py-1 text-xs font-semibold")
        }
        title="Founding Center — pilot cohort with locked discounted rate"
      >
        <Sparkles className={compact ? "size-2.5" : "size-3"} />
        {compact ? `FC${slotSuffix}` : `Founding Center${slotSuffix}`}
      </span>
    );
  }
  return (
    <span
      className={
        "ring-violet-300 inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 text-violet-800 ring-1 " +
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
