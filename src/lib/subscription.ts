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
  /**
   * 'standard' | 'founding' | 'design_partner' — when a founding-tier
   * trial reaches its end date, the lazy-expire logic converts it to
   * 'active' instead of 'expired'. Optional so older callers that
   * predate the founding-center migration still type-check.
   */
  plan_tier?: string | null;
  /**
   * Per-center locked monthly price in VND, only meaningful when
   * plan_tier='founding'. Used by MRR + display, not by the
   * conversion logic itself (the conversion just flips the status).
   */
  founding_locked_price_vnd?: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_ENDING_SOON_DAYS = 7;

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
      if (left <= 0) {
        // Founding-tier trials auto-convert to 'active' on expiry, not
        // 'expired'. We surface the converted state immediately even if
        // the bulk-UPDATE in expireOverdueTrials hasn't run yet, so a
        // founding center that just crossed trial_ends_at never flashes
        // as 'expired' in the UI.
        return c.plan_tier === "founding" ? "active" : "expired";
      }
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
 * Standard-tier trials past their end date — these become 'expired'
 * and lose access. Founding-tier trials are intentionally excluded
 * (see `findFoundingTrialsToConvert`).
 */
export function findTrialsToExpire(
  centers: CenterSubscriptionInput[],
): string[] {
  return centers
    .filter(
      (c) =>
        c.subscription_status === "trial" &&
        c.plan_tier !== "founding" &&
        c.trial_ends_at !== null &&
        new Date(c.trial_ends_at).getTime() < Date.now(),
    )
    .map((c) => c.id);
}

/**
 * Founding-tier trials past their end date — these convert to 'active'
 * at their locked monthly price (founding_locked_price_vnd), and the
 * trial→paid transition is permanent. Caller is expected to issue the
 * UPDATE and write an audit_log row for each.
 *
 * Returned as full row references (not just IDs) so the caller can
 * preserve each row's `trial_ends_at` as the new `subscription_started_at`
 * — i.e. the paid period begins exactly when the trial ended, no gap.
 */
export function findFoundingTrialsToConvert(
  centers: CenterSubscriptionInput[],
): { id: string; trial_ends_at: string }[] {
  return centers
    .filter(
      (c) =>
        c.subscription_status === "trial" &&
        c.plan_tier === "founding" &&
        c.trial_ends_at !== null &&
        new Date(c.trial_ends_at).getTime() < Date.now(),
    )
    .map((c) => ({ id: c.id, trial_ends_at: c.trial_ends_at as string }));
}

/**
 * Lazy auto-transition on every super-admin page render. Handles two
 * distinct overdue-trial transitions in one pass:
 *
 *   1. Standard trials past trial_ends_at  →  status='expired'
 *      (single bulk UPDATE — no per-row data to preserve.)
 *
 *   2. Founding trials past trial_ends_at  →  status='active', with
 *      subscription_started_at = NOW and next_billing_at = NOW + 1mo.
 *      Using "now" instead of trial_ends_at means the paid clock
 *      starts the moment the operator's first /super-admin load fires
 *      the conversion — matches the operator's intuition ("we
 *      converted them today") and the spec for the manual Convert
 *      dialog. The locked monthly price is read from
 *      founding_locked_price_vnd at display time; subscription_plan
 *      is left untouched.
 *      (Per-row UPDATE because audit metadata captures each row's
 *      previous trial_ends_at separately. Founding cohort caps at 5
 *      so the loop is trivially cheap.)
 *
 * Writes one audit_log row per transition so each conversion is
 * traceable. All Supabase calls are best-effort — a failure inside
 * this helper must NEVER block the super-admin dashboard render. The
 * caller re-fetches subscription_status after this returns, so the
 * UI is always consistent with whatever did succeed.
 *
 * Uses the service-role client; only callable from /super-admin which
 * is gated by requireSuperAdmin.
 *
 * @returns total number of rows transitioned (expired + converted).
 */
export async function expireOverdueTrials(
  supabase: SupabaseClient,
  centers: CenterSubscriptionInput[],
): Promise<number> {
  let touched = 0;

  // ----- 1. Standard trials → 'expired' (single bulk UPDATE) -----
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

  // ----- 2. Founding trials → 'active' (per-row UPDATE) -----
  // We need each row's own trial_ends_at to set subscription_started_at,
  // so this can't collapse into one bulk statement. The founding cohort
  // caps at 5 rows globally, so N tiny UPDATEs is fine.
  const founding = findFoundingTrialsToConvert(centers);
  if (founding.length > 0) {
    const now = new Date();
    const nowIso = now.toISOString();
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    const nextBillingIso = nextBillingDate.toISOString();
    for (const row of founding) {
      const { error } = await supabase
        .from("centers")
        .update({
          subscription_status: "active",
          // Set the billing cadence so dashboards reading
          // subscription_plan render "1 month" instead of an empty
          // label. The actual ₫ contribution is read from
          // founding_locked_price_vnd by monthlyMrrVnd() below.
          subscription_plan: "monthly",
          subscription_started_at: nowIso,
          next_billing_at: nextBillingIso,
        })
        .eq("id", row.id);
      if (!error) {
        touched += 1;
        await supabase.from("audit_log").insert({
          user_id: null,
          center_id: row.id,
          action: "subscription_status_change",
          entity_type: "center",
          entity_id: row.id,
          metadata: {
            from: "trial",
            to: "active",
            reason: "founding_trial_converted",
            auto: true,
            previous_trial_ends_at: row.trial_ends_at,
            subscription_started_at: nowIso,
            next_billing_at: nextBillingIso,
          },
        });
      } else if (
        /subscription_started_at|next_billing_at|subscription_plan/i.test(error.message)
      ) {
        // Lifecycle / plan columns missing — fall back to a status-only
        // flip so the founding center still moves out of 'trial' and
        // never lands in the 'expired' bucket. Dates + plan can be
        // backfilled once the migration runs.
        const retry = await supabase
          .from("centers")
          .update({ subscription_status: "active" })
          .eq("id", row.id);
        if (!retry.error) {
          touched += 1;
          await supabase.from("audit_log").insert({
            user_id: null,
            center_id: row.id,
            action: "subscription_status_change",
            entity_type: "center",
            entity_id: row.id,
            metadata: {
              from: "trial",
              to: "active",
              reason: "founding_trial_converted",
              auto: true,
              degraded: true,
            },
          });
        }
      }
    }
  }

  return touched;
}

/**
 * Per-month VND contribution for the standard paid plans. Six-month
 * and annual amortise to a monthly figure so MRR is comparable across
 * tiers. Founding/Design-Partner pricing does NOT live here — those
 * are read per-row from founding_locked_price_vnd in `monthlyMrrVnd`.
 */
export const STANDARD_PLAN_MONTHLY_VND: Record<string, number> = {
  monthly: 1_200_000,
  six_months: 900_000,
  annual: 825_000,
};

/** Canonical fallback for a Founding Center whose locked price column
 *  is null (e.g. row predates the slot migration). Keeps MRR
 *  computations sane while we wait for someone to set the real number. */
const FOUNDING_FALLBACK_MONTHLY_VND = 600_000;

/**
 * Monthly VND contribution of a single center, used by both the org-
 * wide MRR widget on /super-admin and the per-center MRR card on
 * /super-admin/centers/[id]. Branching rule:
 *
 *   plan_tier='founding'        → founding_locked_price_vnd
 *                                  (or 600,000 if column null/missing)
 *   subscription_plan ∈ standard → amortised standard price
 *   otherwise                    → 0
 *
 * Returns 0 (not null) for centers that don't contribute — caller
 * sums these directly. Inactive centers should be filtered out before
 * calling; this helper does not gate on subscription_status.
 */
export function monthlyMrrVnd(c: {
  subscription_plan: string | null;
  plan_tier?: string | null;
  founding_locked_price_vnd?: number | null;
}): number {
  if (c.plan_tier === "founding") {
    return c.founding_locked_price_vnd ?? FOUNDING_FALLBACK_MONTHLY_VND;
  }
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
