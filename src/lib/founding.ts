import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type FoundingStatus = {
  filled: number;
  cap: number;
  remaining: number;
  /** true when filled >= cap — the public CTAs flip to "join waitlist". */
  isFull: boolean;
};

const DEFAULT_CAP = 5;

/**
 * Public-side read of the Founding Center cohort state. Used by the
 * landing / login / pricing / demo pages to render the live "X of N
 * spots filled" widget — same source of truth as the super-admin
 * dashboard, so the public counter ticks up the moment a new
 * Founding Center is added.
 *
 * Uses the service-role client because RLS would hide the centers
 * table from an anonymous visitor. Only reads two aggregates: a count
 * of trial/active centers on plan_tier='founding' and the configured
 * cap. No PII ever leaves the database.
 *
 * Caller-side caching is handled per page via Next's revalidate
 * directives; this helper just queries.
 *
 * Failure modes are silent — if either query errors (migration not
 * applied, db blip), we fall back to (filled=0, cap=DEFAULT_CAP) so
 * the public page still renders a sensible card instead of 500ing.
 */
export async function getFoundingStatus(): Promise<FoundingStatus> {
  let filled = 0;
  let cap = DEFAULT_CAP;
  try {
    const supabase = createAdminClient();
    const [filledRes, capRes] = await Promise.all([
      supabase
        .from("centers")
        .select("id", { count: "exact", head: true })
        .eq("plan_tier", "founding")
        .in("subscription_status", ["trial", "active"]),
      supabase
        .from("app_settings")
        .select("value")
        .eq("key", "founding_center_cap")
        .maybeSingle(),
    ]);
    if (!filledRes.error && filledRes.count !== null) {
      filled = filledRes.count;
    }
    if (!capRes.error && capRes.data) {
      const v = (capRes.data as { value: unknown }).value;
      if (typeof v === "number") cap = v;
      else if (typeof v === "string") cap = Number(v) || DEFAULT_CAP;
    }
  } catch {
    // founding-center migration may not be applied yet — keep
    // defaults so the page still renders.
  }
  const remaining = Math.max(0, cap - filled);
  return { filled, cap, remaining, isFull: filled >= cap };
}
