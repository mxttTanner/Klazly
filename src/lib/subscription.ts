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
 * Add N calendar months to a date, clamping to the last valid day of
 * the target month.
 *
 * Plain `d.setMonth(d.getMonth() + N)` overflows at month boundaries:
 * Jan 31 + 1mo lands on Mar 2/3 because February has no 31st, so JS
 * silently rolls the surplus days into the next month. That corrupts
 * billing anchors (a center billed on the 31st would drift a whole
 * month forward). This clamps instead — Jan 31 + 1mo → Feb 28 (or
 * Feb 29 in a leap year) — matching how a human reads "one month
 * later" for a renewal date. Handles the +6 / +12 cases the same way
 * (annual on Feb 29 → Feb 28 the following year rather than Mar 1).
 *
 * Time-of-day is preserved. Does not mutate the input; returns a new
 * Date. N may be any integer.
 */
export function addMonthsClamped(date: Date, n: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  // Move to the 1st before shifting the month so the intermediate
  // value can't itself overflow, then clamp the day back to whatever
  // the target month can actually hold.
  result.setDate(1);
  result.setMonth(result.getMonth() + n);
  const lastDayOfTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();
  result.setDate(Math.min(day, lastDayOfTargetMonth));
  return result;
}

/**
 * Compute the paid-period end date for a standard plan, measured from
 * `from`. Single source of truth for the "plan → period length"
 * mapping so createCenter / convertCenterToPaid / the status + plan
 * status flips all agree:
 *
 *   monthly     → +1 month
 *   six_months  → +6 months
 *   annual      → +12 months
 *
 * Returns null for plans without a fixed billing cycle (design-partner,
 * or an unrecognised / absent plan) — the caller leaves the period
 * anchors untouched in that case. Uses addMonthsClamped so month-end
 * anchors don't overflow.
 */
export function computePaidPeriodEnd(
  plan: string | null,
  from: Date,
): Date | null {
  if (plan === "monthly") return addMonthsClamped(from, 1);
  if (plan === "six_months") return addMonthsClamped(from, 6);
  if (plan === "annual") return addMonthsClamped(from, 12);
  return null;
}

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
 *   3. Active centers past subscription_ends_at  →  'pending_renewal'.
 *      Klazly never auto-charges; this just flips the status so the
 *      operator's dashboard shows a "Renewal due" amber row. The
 *      actual renewal collection happens out of band over Zalo.
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
    // Month-end-safe (see addMonthsClamped): a founding trial that ends
    // on e.g. Jan 31 converts with a Feb-28 billing anchor, not a
    // drifted Mar 2/3.
    const nextBillingIso = addMonthsClamped(now, 1).toISOString();
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
          // Mirror next_billing_at into subscription_ends_at: the
          // renewal detector (findActiveSubsToMarkRenewal) keys off
          // subscription_ends_at, so without this the auto-converted
          // founding center would never enter the "renewal due" nudge
          // and would silently sit active forever (M6).
          subscription_ends_at: nextBillingIso,
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
            subscription_ends_at: nextBillingIso,
            next_billing_at: nextBillingIso,
          },
        });
      } else if (
        /subscription_started_at|subscription_ends_at|next_billing_at|subscription_plan/i.test(error.message)
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

  // ----- 3. Active subs past subscription_ends_at → 'pending_renewal' -----
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

/** Default cap for the Founding Center cohort when app_settings is
 *  unavailable. Mirrored from db/founding-center.sql. */
export const FOUNDING_DEFAULT_CAP = 5;

/**
 * Single source of truth for "is there an open Founding slot, and if
 * so, which number?".
 *
 * Takes the full set of centers (so the caller can pass whatever it
 * already fetched — no extra DB round trip) and the cap. Returns:
 *   taken          — sorted list of slot numbers currently assigned
 *   nextAvailable  — lowest unused integer in [1..cap], or null if
 *                    the cap is hit
 *   remaining      — max(0, cap - taken.length)
 *
 * Used by:
 *   - the new-center form (page.tsx → CenterForm)  : pre-fill on
 *     plan-type change
 *   - the Convert dialog (CenterActionsBar)         : show "next
 *     available slot: #N · M remaining" inside the Founding option
 *
 * Race condition guard lives at the DB layer (centers_founding_slot_uniq
 * partial unique index) — this helper is purely advisory.
 */
export function computeFoundingSlotAvailability(
  centers: {
    plan_tier?: string | null;
    founding_center_number?: number | null;
  }[],
  cap: number,
): {
  taken: number[];
  nextAvailable: number | null;
  remaining: number;
} {
  const taken = centers
    .filter(
      (c) =>
        c.plan_tier === "founding" &&
        typeof c.founding_center_number === "number" &&
        c.founding_center_number !== null &&
        c.founding_center_number > 0,
    )
    .map((c) => c.founding_center_number as number)
    .sort((a, b) => a - b);
  let nextAvailable: number | null = null;
  for (let n = 1; n <= cap; n++) {
    if (!taken.includes(n)) {
      nextAvailable = n;
      break;
    }
  }
  return {
    taken,
    nextAvailable,
    remaining: Math.max(0, cap - taken.length),
  };
}

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
