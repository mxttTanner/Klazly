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
  | "expired"
  | "paused"
  | "pending_renewal";

export type DerivedStatus = RawStatus | "trial_ending_soon";

export type CenterSubscriptionInput = {
  id: string;
  subscription_status: string;
  subscription_plan: string | null;
  trial_ends_at: string | null;
  subscription_ends_at?: string | null;
  /**
   * 'standard' | 'design_partner'. Design partners are free-forever
   * internal partners (they don't contribute to MRR). Optional so older
   * callers still type-check.
   */
  plan_tier?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_ENDING_SOON_DAYS = 7;

/**
 * The one and only trial length: a 6-month free period. Every trial uses
 * this — new centers, revert-to-trial, and reactivation — so there is a
 * single number to reason about. When it lapses the center expires and
 * loses access until they pay.
 */
export const TRIAL_DAYS = 180;

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
    raw === "expired" ||
    raw === "paused" ||
    raw === "pending_renewal"
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
 * Trials past their end date — these become 'expired' and lose access
 * until the center pays.
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
 * Active centers past their subscription_ends_at — flipped to
 * 'pending_renewal' so the operator gets a visible nudge to collect
 * payment manually and re-extend the cycle.
 *
 * We deliberately do NOT auto-charge or auto-expire paid centers —
 * payments at Klazly are via bank transfer / Momo / ZaloPay through
 * a Zalo conversation, never via a stored card. 'pending_renewal' is
 * the "needs human attention" bucket between an ended cycle and
 * either a renewed-active row or a canceled row.
 *
 * Skips rows missing subscription_ends_at (e.g. design-partner free-
 * forever, or older rows that predate the lifecycle migration).
 */
export function findActiveSubsToMarkRenewal(
  centers: CenterSubscriptionInput[],
): string[] {
  return centers
    .filter(
      (c) =>
        c.subscription_status === "active" &&
        c.subscription_ends_at !== null &&
        c.subscription_ends_at !== undefined &&
        new Date(c.subscription_ends_at).getTime() < Date.now(),
    )
    .map((c) => c.id);
}

/**
 * Lazy auto-transition on every super-admin page render. Two passes:
 *
 *   1. Trials past trial_ends_at  →  status='expired'
 *      (single bulk UPDATE — no per-row data to preserve.)
 *
 *   2. Active centers past subscription_ends_at  →  'pending_renewal'.
 *      Klazly never auto-charges; this just flips the status so the
 *      operator's dashboard shows a "Renewal due" amber row. The
 *      actual renewal collection happens out of band over Zalo.
 *
 * Writes one audit_log row per transition so each is traceable. All
 * Supabase calls are best-effort — a failure inside this helper must
 * NEVER block the super-admin dashboard render. The caller re-fetches
 * subscription_status after this returns, so the UI is always
 * consistent with whatever did succeed.
 *
 * Uses the service-role client; only callable from /super-admin which
 * is gated by requireSuperAdmin.
 *
 * @returns total number of rows transitioned.
 */
export async function expireOverdueTrials(
  supabase: SupabaseClient,
  centers: CenterSubscriptionInput[],
): Promise<number> {
  let touched = 0;

  // ----- 1. Trials → 'expired' (single bulk UPDATE) -----
  const expireIds = findTrialsToExpire(centers);
  if (expireIds.length > 0) {
    const { error } = await supabase
      .from("centers")
      .update({ subscription_status: "expired" })
      .in("id", expireIds);
    if (!error) {
      touched += expireIds.length;
      const rows = expireIds.map((centerId) => ({
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
    }
  }

  // ----- 2. Active subs past subscription_ends_at → 'pending_renewal' -----
  // Bulk UPDATE — every row gets the same status, no per-row data
  // to preserve.
  const renewalIds = findActiveSubsToMarkRenewal(centers);
  if (renewalIds.length > 0) {
    const { error } = await supabase
      .from("centers")
      .update({ subscription_status: "pending_renewal" })
      .in("id", renewalIds);
    if (!error) {
      touched += renewalIds.length;
      const rows = renewalIds.map((centerId) => ({
        user_id: null,
        center_id: centerId,
        action: "subscription_status_change",
        entity_type: "center",
        entity_id: centerId,
        metadata: {
          from: "active",
          to: "pending_renewal",
          reason: "renewal_due",
          auto: true,
        },
      }));
      await supabase.from("audit_log").insert(rows);
    } else if (
      /invalid input value for enum subscription_status.*pending_renewal/i.test(
        error.message,
      )
    ) {
      // 'pending_renewal' enum value not migrated yet — silently skip
      // this pass so the rest of the dashboard still renders. Operator
      // needs to run db/pending-renewal.sql.
    }
  }

  return touched;
}

/**
 * Per-month VND contribution for the paid plans. Six-month and annual
 * amortise to a monthly figure so MRR is comparable across plans.
 */
export const STANDARD_PLAN_MONTHLY_VND: Record<string, number> = {
  monthly: 1_200_000,
  six_months: 900_000,
  annual: 825_000,
};

/**
 * Monthly VND contribution of a single center, used by both the org-
 * wide MRR widget on /super-admin and the per-center MRR card. Paid
 * plans amortise to a monthly figure; everything else (trial, expired,
 * design-partner free-forever, no plan) contributes 0.
 *
 * Returns 0 (not null) for centers that don't contribute — caller sums
 * these directly. Inactive centers should be filtered out before
 * calling; this helper does not gate on subscription_status.
 */
export function monthlyMrrVnd(c: {
  subscription_plan: string | null;
  plan_tier?: string | null;
}): number {
  if (c.subscription_plan && STANDARD_PLAN_MONTHLY_VND[c.subscription_plan]) {
    return STANDARD_PLAN_MONTHLY_VND[c.subscription_plan];
  }
  return 0;
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
      return "bg-slate-200 text-slate-700 ring-slate-400";
    case "expired":
      return "bg-slate-100 text-rose-700 ring-rose-300";
    // Paused = "pressed pause, will return". Visually distinct from
    // canceled (permanent archive) and expired (trial ran out). Indigo
    // reads as "intentional, reversible" against the existing palette.
    case "paused":
      return "bg-indigo-50 text-indigo-800 ring-indigo-200";
    // Renewal due = subscription_ends_at has passed. Amber/orange so
    // the operator's eye is drawn to it but it doesn't read as
    // urgent-failure like rose. Distinct from trial_ending_soon
    // (which is "almost out of trial"); this is "paid term ended,
    // collect payment + renew".
    case "pending_renewal":
      return "bg-orange-50 text-orange-800 ring-orange-300";
  }
}

/**
 * Refined trial-day tone: when the badge has a "X days left" tail, the
 * tail itself can be coloured to indicate urgency. Spec:
 *   8+      → blue/neutral (matches the base trial tone)
 *   4–7     → amber (matches trial_ending_soon)
 *   1–3     → red
 *   ≤0      → dark red bold (expired)
 */
export function trialDaysToneAndUrgency(days: number | null): {
  tone: string;
  urgent: boolean;
} {
  if (days === null) return { tone: "text-muted-foreground", urgent: false };
  if (days <= 0) return { tone: "text-rose-700 font-bold", urgent: true };
  if (days <= 3) return { tone: "text-rose-600 font-semibold", urgent: true };
  if (days <= 7) return { tone: "text-amber-700 font-medium", urgent: true };
  return { tone: "text-sky-700", urgent: false };
}

/**
 * Days since a center's trial expired (or null if it doesn't look like
 * a recently-expired trial). Used to surface "recently expired" follow-up
 * candidates for the super-admin to chase. Returns a positive number
 * when the trial_ends_at is in the past.
 */
export function trialDaysSinceExpiry(
  trial_ends_at: string | null | undefined,
): number | null {
  if (!trial_ends_at) return null;
  const ms = Date.now() - new Date(trial_ends_at).getTime();
  if (ms <= 0) return null;
  return Math.floor(ms / DAY_MS);
}

/** Strip a canonical VN phone ("+84...") to the form Zalo deep-links
 *  expect (no leading "+"). Falls back to the raw input minus any
 *  non-digits if it doesn't look canonical, so a sloppy entry still
 *  produces a clickable link. Returns null if there's nothing usable. */
export function zaloDeeplinkFromPhone(
  phone: string | null | undefined,
): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://zalo.me/${digits}`;
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
    case "paused":
      return "statusPaused";
    case "pending_renewal":
      return "statusPendingRenewal";
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
