/**
 * Subscription lifecycle helper.
 *
 * The DB stores a coarse `subscription_status` on `public.centers`:
 *   'trial' | 'active' | 'past_due' | 'canceled' | 'expired'
 *
 * The UI displays a finer-grained *derived* status that adds:
 *   'trial_ending_soon' — DB says 'trial' but trial_ends_at is ≤3 days
 *                         out. Lets the super-admin see urgency at a
 *                         glance without bumping the DB on every read.
 *
 * Status auto-transitions don't run on a cron — instead, the super-admin
 * page calls `findTrialsToExpire(centers)` on every render and issues a
 * single bulk UPDATE for any trials whose trial_ends_at is in the past.
 * Cheaper than a cron and always accurate when a human is actually
 * looking at the data.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type RawStatus =
  | "trial"
  | "active"
  | "past_due"
  | "canceled"
  | "expired";

export type DerivedStatus = RawStatus | "trial_ending_soon";

export type CenterSubscriptionInput = {
  id: string;
  subscription_status: string;
  subscription_plan: string | null;
  trial_ends_at: string | null;
  subscription_ends_at?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_ENDING_SOON_DAYS = 3;

/**
 * Compute the display status from raw DB columns.
 *
 * - If DB says 'trial' and trial_ends_at is in the past → 'expired'
 *   (the lazy-expire UPDATE will catch up on the next page load, but
 *    the display should match reality immediately).
 * - If DB says 'trial' and trial_ends_at is within 3 days → 'trial_ending_soon'.
 * - Otherwise pass the DB status through.
 */
export function deriveStatus(c: CenterSubscriptionInput): DerivedStatus {
  const raw = c.subscription_status;

  if (raw === "trial") {
    if (c.trial_ends_at) {
      const left = new Date(c.trial_ends_at).getTime() - Date.now();
      if (left <= 0) return "expired";
      if (left <= TRIAL_ENDING_SOON_DAYS * DAY_MS) return "trial_ending_soon";
    }
    return "trial";
  }

  if (
    raw === "active" ||
    raw === "past_due" ||
    raw === "canceled" ||
    raw === "expired"
  ) {
    return raw;
  }

  return "trial";
}

/** Days remaining on the trial. Negative if expired, null if not on trial. */
export function trialDaysLeft(
  trial_ends_at: string | null | undefined,
): number | null {
  if (!trial_ends_at) return null;
  const ms = new Date(trial_ends_at).getTime() - Date.now();
  return Math.ceil(ms / DAY_MS);
}

/** Days until the paid subscription period ends. Null if not applicable. */
export function subscriptionDaysLeft(
  subscription_ends_at: string | null | undefined,
): number | null {
  if (!subscription_ends_at) return null;
  const ms = new Date(subscription_ends_at).getTime() - Date.now();
  return Math.ceil(ms / DAY_MS);
}

/**
 * Find center IDs that should be auto-transitioned from 'trial' →
 * 'expired'. Caller is expected to issue an UPDATE and write an
 * audit_log row for each.
 */
export function findTrialsToExpire(
  centers: CenterSubscriptionInput[],
): string[] {
  return centers
    .filter(
      (c) =>
        c.subscription_status === "trial" &&
        c.trial_ends_at !== null &&
        new Date(c.trial_ends_at).getTime() < Date.now(),
    )
    .map((c) => c.id);
}

/**
 * Issue a bulk lazy-expire on the super-admin page. Writes one
 * audit_log row per transition so the history is preserved.
 *
 * Uses the service-role client; only callable from /super-admin which
 * is gated by requireSuperAdmin.
 */
export async function expireOverdueTrials(
  supabase: SupabaseClient,
  centers: CenterSubscriptionInput[],
): Promise<number> {
  const ids = findTrialsToExpire(centers);
  if (ids.length === 0) return 0;

  const { error } = await supabase
    .from("centers")
    .update({ subscription_status: "expired" })
    .in("id", ids);
  if (error) {
    // Don't crash the dashboard render if the audit update fails; the
    // derived status will still display correctly. Log via Sentry up
    // the call stack.
    return 0;
  }

  // Write audit_log entries (best-effort; failure here doesn't block
  // the visible state).
  const rows = ids.map((centerId) => ({
    user_id: null,
    center_id: centerId,
    action: "subscription_status_change",
    entity_type: "center",
    entity_id: centerId,
    metadata: {
      from: "trial",
      to: "expired",
      reason: "trial_expired",
      auto: true,
    },
  }));
  await supabase.from("audit_log").insert(rows);

  return ids.length;
}

/** Tailwind classes for the status badge, keyed off DerivedStatus. */
export function statusTone(s: DerivedStatus): string {
  switch (s) {
    case "trial":
      return "bg-sky-50 text-sky-800 ring-sky-200";
    case "trial_ending_soon":
      return "bg-amber-50 text-amber-800 ring-amber-300";
    case "active":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "past_due":
      return "bg-rose-50 text-rose-800 ring-rose-300";
    case "canceled":
      return "bg-slate-100 text-slate-700 ring-slate-300";
    case "expired":
      return "bg-slate-200 text-slate-900 ring-slate-400";
  }
}

/** i18n key for the status label. Caller translates via t(). */
export function statusLabelKey(s: DerivedStatus): string {
  switch (s) {
    case "trial":
      return "statusTrial";
    case "trial_ending_soon":
      return "statusTrialEndingSoon";
    case "active":
      return "statusActive";
    case "past_due":
      return "statusPastDue";
    case "canceled":
      return "statusCanceled";
    case "expired":
      return "statusExpired";
  }
}

/** i18n key for the plan label. Trial is rendered separately. */
export function planLabelKey(plan: string | null): string | null {
  if (!plan) return null;
  if (plan === "monthly") return "planMonthly";
  if (plan === "six_months") return "planSixMonths";
  if (plan === "annual") return "planAnnual";
  return null;
}
