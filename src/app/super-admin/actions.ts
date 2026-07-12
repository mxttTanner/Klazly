"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSuperAdmin } from "@/lib/super-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeVnPhone, syntheticEmailForPhone } from "@/lib/phone";
import {
  addMonthsClamped,
  computeFoundingSlotAvailability,
  computePaidPeriodEnd,
  FOUNDING_DEFAULT_CAP,
} from "@/lib/subscription";

const PLAN_VALUES = ["monthly", "six_months", "annual"] as const;
type Plan = (typeof PLAN_VALUES)[number];

/**
 * Values accepted by the Convert dialog. 'founding' is special — it
 * means "convert this Founding-tier center to active at its locked
 * monthly price" and only validates if the row's plan_tier='founding'.
 * Standard centers use the three Plan values directly.
 */
const CONVERT_VALUES = [...PLAN_VALUES, "founding"] as const;
type ConvertChoice = (typeof CONVERT_VALUES)[number];

/**
 * Lifecycle columns added by db/subscription-lifecycle.sql. Treated as
 * optional everywhere — if any are missing from the schema cache
 * (migration not run, or PostgREST hasn't reloaded yet) we strip them
 * and retry, so the core status change still goes through.
 */
const LIFECYCLE_COLS = [
  "subscription_started_at",
  "subscription_ends_at",
  "last_payment_at",
  "next_billing_at",
  // Founding-slot columns also degrade gracefully — if the slot
  // migration hasn't run, the convert action still flips status +
  // plan but skips the slot assignment.
  "founding_center_number",
  "founding_locked_price_vnd",
  // plan_tier column may not exist on the oldest pre-founding-center
  // databases; allow it to drop too so a status flip still lands.
  "plan_tier",
] as const;
type LifecycleCol = (typeof LIFECYCLE_COLS)[number];

/**
 * Apply a centers.update() patch with graceful degradation when
 * lifecycle columns aren't visible to PostgREST yet. Retries the
 * UPDATE with the offending column dropped from the patch — so a
 * status flip lands even if (say) the schema cache hasn't refreshed
 * after `subscription-lifecycle.sql`. Returns the final error, or
 * null on success.
 */
async function updateCenterPatchTolerant(
  supabase: SupabaseClient,
  centerId: string,
  patch: Record<string, string | number | null>,
): Promise<{ error: string | null; droppedCols: LifecycleCol[] }> {
  const droppedCols: LifecycleCol[] = [];
  // Cap the retry loop at the number of optional columns we might
  // need to drop. Each PostgREST "column not found" error names one
  // column at a time, so worst case we burn one retry per column.
  for (let attempt = 0; attempt <= LIFECYCLE_COLS.length; attempt++) {
    const { error } = await supabase
      .from("centers")
      .update(patch)
      .eq("id", centerId);
    if (!error) return { error: null, droppedCols };

    // Two known migration-not-applied signatures:
    //   • The enum is missing the new value (e.g., 'expired'):
    //       invalid input value for enum subscription_status: "expired"
    //   • The legacy CHECK constraint was created instead of the enum
    //     value:  centers_subscription_status_check (older migrations).
    if (
      /invalid input value for enum subscription_status/i.test(error.message) ||
      /centers_subscription_status_check/i.test(error.message)
    ) {
      return {
        error: "subscription_lifecycle.sql migration not applied",
        droppedCols,
      };
    }

    const missing = LIFECYCLE_COLS.find((col) =>
      new RegExp(`'${col}'|"${col}"|column ${col}`, "i").test(error.message),
    );
    if (!missing || !(missing in patch)) {
      return { error: error.message, droppedCols };
    }
    delete patch[missing];
    droppedCols.push(missing);
  }
  return { error: "exhausted lifecycle column retries", droppedCols };
}

/**
 * Audit-log insert that won't blow up on FK violations.
 *
 * The super-admin lives only in auth.users — they have no row in
 * public.users — so passing their auth id as user_id violates the
 * audit_log.user_id FK. Set user_id to null for super-admin-initiated
 * actions and put the actor email in metadata so the trail is still
 * attributable.
 *
 * Failures are swallowed because losing one audit row should never
 * block the visible operation. Anything systemic gets caught by
 * Sentry on the way out.
 */
async function writeAuditLog(
  supabase: SupabaseClient,
  row: {
    actorEmail: string | null;
    centerId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({
    user_id: null,
    center_id: row.centerId,
    action: row.action,
    entity_type: row.entityType,
    entity_id: row.entityId,
    metadata: { ...row.metadata, actor_email: row.actorEmail },
  });
  if (error) {
    Sentry.captureMessage(`audit_log insert failed: ${error.message}`, {
      level: "warning",
      extra: { action: row.action, center_id: row.centerId },
    });
  }
}

/**
 * Composite plan-type values from the super-admin create form. Each
 * value here decomposes to (status, plan, plan_tier, trial_days)
 * via PLAN_TYPE_DECOMPOSITION below.
 */
const PLAN_TYPE_VALUES = [
  // Default: vanilla 15-day standard trial. The common case for a new
  // center that hasn't been pitched the Founding deal yet. Listed
  // first so the dropdown defaults to the safest non-committal option.
  // (Founding centers get 30 days — double the standard window — which
  // is the perk the sales pitch promises.)
  "trial_standard",
  "trial_founding",
  "active_monthly",
  "active_six_months",
  "active_annual",
  "active_founding",
  "active_design_partner",
] as const;
type PlanType = (typeof PLAN_TYPE_VALUES)[number];

type Tier = "standard" | "founding" | "design_partner";
type ActiveStatus = "trial" | "active";

const PLAN_TYPE_DECOMPOSITION: Record<
  PlanType,
  {
    status: ActiveStatus;
    plan: Plan | null;
    tier: Tier;
    trialDays: number | null;
  }
> = {
  trial_standard: { status: "trial", plan: null, tier: "standard", trialDays: 15 },
  trial_founding: { status: "trial", plan: null, tier: "founding", trialDays: 30 },
  active_monthly: { status: "active", plan: "monthly", tier: "standard", trialDays: null },
  active_six_months: { status: "active", plan: "six_months", tier: "standard", trialDays: null },
  active_annual: { status: "active", plan: "annual", tier: "standard", trialDays: null },
  active_founding: { status: "active", plan: "monthly", tier: "founding", trialDays: null },
  active_design_partner: { status: "active", plan: null, tier: "design_partner", trialDays: null },
};

const SIGNUP_SOURCE_VALUES = [
  "zalo_cold",
  "in_person",
  "referral",
  "landing_cta",
  "other",
] as const;

const createCenterSchema = z.object({
  center_name: z.string().min(1).max(120),
  admin_full_name: z.string().min(1).max(120),
  // Admin contact: email or phone or both. At-least-one is checked in
  // code after parse (so the error can be i18n'd cleanly). Both are
  // optional at the Zod level.
  admin_email: z.string().optional(),
  admin_phone: z.string().optional(),
  admin_password: z.string().min(8).max(72),
  contact_phone: z.string().max(40).optional().nullable(),
  plan_type: z.enum(PLAN_TYPE_VALUES).default("trial_standard"),
  signup_source: z.enum(SIGNUP_SOURCE_VALUES).default("zalo_cold"),
  referral_note: z.string().max(280).optional().nullable(),
  // Founding slot — only meaningful when plan_type maps to a founding
  // tier. Coerce empty string / non-numeric to null. Range checked by
  // the DB partial unique index + the server-side uniqueness retry.
  founding_center_number: z
    .preprocess(
      (v) => {
        if (v === "" || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
      },
      z.number().int().positive().nullable(),
    )
    .optional()
    .nullable(),
});

export async function createCenter(_prev: unknown, formData: FormData) {
  await requireSuperAdmin();
  const t = await getTranslations("superAdmin");
  const tco = await getTranslations("contact");

  const planTypeRaw = String(formData.get("plan_type") ?? "trial_standard");
  const sourceRaw = String(formData.get("signup_source") ?? "zalo_cold");
  const parsed = createCenterSchema.safeParse({
    center_name: formData.get("center_name"),
    admin_full_name: formData.get("admin_full_name"),
    admin_email: formData.get("admin_email"),
    admin_phone: formData.get("admin_phone"),
    admin_password: formData.get("admin_password"),
    contact_phone: formData.get("contact_phone") || null,
    plan_type: (PLAN_TYPE_VALUES as readonly string[]).includes(planTypeRaw)
      ? planTypeRaw
      : "trial_standard",
    signup_source: (SIGNUP_SOURCE_VALUES as readonly string[]).includes(sourceRaw)
      ? sourceRaw
      : "zalo_cold",
    referral_note:
      String(formData.get("referral_note") ?? "").trim() || null,
    founding_center_number: formData.get("founding_center_number"),
  });
  if (!parsed.success) return { error: t("validation") };

  const decomposed = PLAN_TYPE_DECOMPOSITION[parsed.data.plan_type];

  const rawEmail = (parsed.data.admin_email ?? "").trim().toLowerCase();
  const rawPhone = (parsed.data.admin_phone ?? "").trim();

  // Phone-first policy: the admin we're creating logs in by phone
  // (Vietnam, Zalo-keyed). Email is optional and only shape-checked
  // when present.
  if (!rawPhone) return { error: tco("phoneRequiredError") };

  const adminPhone = normalizeVnPhone(rawPhone);
  if (!adminPhone) return { error: tco("invalidPhone") };

  let adminEmail: string | null = null;
  if (rawEmail) {
    if (!z.string().email().safeParse(rawEmail).success) {
      return { error: tco("invalidEmail") };
    }
    adminEmail = rawEmail;
  }
  const authEmail = adminEmail ?? syntheticEmailForPhone(adminPhone);

  const supabase = createAdminClient();

  // Trial expiry: only set when the plan_type is itself a trial.
  // Active plans (paid or design-partner) don't get a trial_ends_at.
  let trialEndsAt: string | null = null;
  if (decomposed.trialDays !== null) {
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + decomposed.trialDays);
    trialEndsAt = trialEnds.toISOString();
  }

  // Active plans need subscription_started_at/ends_at populated so the
  // dashboard's paid-plan card has real data. For founding/design-
  // partner active plans we still set started_at = now; ends_at is
  // computed from the plan length (founding = monthly so we set one
  // month; design partner has no billing cycle so ends_at stays null).
  const now = new Date();
  let subscriptionStartedAt: string | null = null;
  let subscriptionEndsAt: string | null = null;
  let nextBillingAt: string | null = null;
  if (decomposed.status === "active") {
    subscriptionStartedAt = now.toISOString();
    // computePaidPeriodEnd owns the plan→length mapping and clamps
    // month-end overflow (M7). Returns null for design-partner (plan
    // null) which correctly leaves ends_at / next_billing_at null.
    const end = computePaidPeriodEnd(decomposed.plan, now);
    if (end) {
      subscriptionEndsAt = end.toISOString();
      nextBillingAt = end.toISOString();
    }
  }

  // Try inserting with the full Founding-Center column set; fall back
  // progressively for older DBs.
  const baseInsert: Record<string, string | null> = {
    name: parsed.data.center_name,
    contact_email: adminEmail,
    contact_phone: parsed.data.contact_phone ?? adminPhone,
    subscription_status: decomposed.status,
    trial_ends_at: trialEndsAt,
  };
  // Only attach a slot number when the plan is actually founding —
  // standard / design-partner rows leave the column null. Saves us
  // worrying about phantom slot reservations on non-founding tiers.
  const foundingSlot =
    decomposed.tier === "founding"
      ? parsed.data.founding_center_number ?? null
      : null;

  const fullInsert = {
    ...baseInsert,
    subscription_plan: decomposed.plan,
    plan_tier: decomposed.tier,
    signup_source: parsed.data.signup_source,
    referral_note: parsed.data.referral_note ?? null,
    subscription_started_at: subscriptionStartedAt,
    subscription_ends_at: subscriptionEndsAt,
    next_billing_at: nextBillingAt,
    founding_center_number: foundingSlot,
  };
  let { data: center, error: centerErr } = await supabase
    .from("centers")
    .insert(fullInsert)
    .select()
    .single();
  // Strip columns the DB doesn't have yet, one error at a time.
  //
  // PostgREST returns the column name in the error message ("Could not
  // find the 'X' column of 'centers' in the schema cache"). Each
  // retry drops the column named in the *current* error and tries
  // again — so a center can be created against a partially-migrated
  // database that's missing several of the optional lifecycle /
  // founding-center / branding columns at once.
  //
  // Earlier this was a for-loop over `optional` that only saw the
  // first matching column once per iteration; once a retry surfaced
  // a *different* missing column the loop had already iterated past
  // it and returned the error to the user. Rewritten as a while-loop
  // that rescans `optional` against whatever error message is
  // current. Capped at optional.length attempts so an unfamiliar
  // error never spins forever.
  if (centerErr) {
    const stripped: Record<string, unknown> = { ...fullInsert };
    const optional = [
      "plan_tier",
      "signup_source",
      "referral_note",
      "subscription_started_at",
      "subscription_ends_at",
      "last_payment_at",
      "next_billing_at",
      "subscription_plan",
      "founding_center_number",
    ];
    let attempts = 0;
    while (centerErr && attempts < optional.length) {
      const missing = optional.find((col) =>
        new RegExp(col, "i").test(centerErr!.message),
      );
      if (!missing) break; // unfamiliar error — surface it to the user
      delete stripped[missing];
      const retry = await supabase
        .from("centers")
        .insert(stripped)
        .select()
        .single();
      center = retry.data;
      centerErr = retry.error;
      attempts++;
    }
  }
  if (centerErr || !center) {
    // Special-case the slot-uniqueness collision: two operators could
    // race on the same number; the partial unique index returns this
    // signature. Surface a friendly error so the operator can pick a
    // different slot rather than seeing a raw Postgres message.
    const msg = centerErr?.message ?? "";
    if (
      /centers_founding_slot_uniq/i.test(msg) ||
      /duplicate key value violates unique constraint.*founding/i.test(msg)
    ) {
      return {
        error: t("foundingSlotTakenError", {
          n: foundingSlot ?? 0,
        }),
      };
    }
    return {
      error: t("createCenterError", { message: msg }),
    };
  }

  const { data: created, error: authErr } = await supabase.auth.admin.createUser({
    email: authEmail,
    password: parsed.data.admin_password,
    email_confirm: true,
  });
  if (authErr || !created.user) {
    const { error: rollbackErr } = await supabase
      .from("centers")
      .delete()
      .eq("id", center.id);
    if (rollbackErr) Sentry.captureException(rollbackErr);
    return {
      error: t("createUserError", { message: authErr?.message ?? "" }),
    };
  }

  const { error: profileErr } = await supabase.from("users").insert({
    id: created.user.id,
    email: adminEmail,
    phone: adminPhone,
    full_name: parsed.data.admin_full_name,
    role: "admin",
    center_id: center.id,
  });
  if (profileErr) {
    const { error: authRollbackErr } = await supabase.auth.admin.deleteUser(
      created.user.id,
    );
    if (authRollbackErr) Sentry.captureException(authRollbackErr);
    const { error: centerRollbackErr } = await supabase
      .from("centers")
      .delete()
      .eq("id", center.id);
    if (centerRollbackErr) Sentry.captureException(centerRollbackErr);
    return {
      error: t("createProfileError", { message: profileErr.message }),
    };
  }

  revalidatePath("/super-admin");
  return {
    success: t("createdHint", {
      center: parsed.data.center_name,
      email: adminEmail ?? adminPhone ?? "",
    }),
  };
}

export async function updateSubscriptionPlan(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const planRaw = String(formData.get("plan") ?? "");
  if (!id) return;
  const plan: Plan | null =
    planRaw && (PLAN_VALUES as readonly string[]).includes(planRaw)
      ? (planRaw as Plan)
      : null;

  const supabase = createAdminClient();

  const patch: Record<string, string | number | null> = {
    subscription_plan: plan,
  };
  // When a concrete paid plan is chosen, recompute the paid-period
  // anchors from now so the renewal flow keys off a fresh
  // subscription_ends_at (M6): findActiveSubsToMarkRenewal reads
  // subscription_ends_at, so a plan change that left it stale/null
  // would never re-enter the "renewal due" nudge. Reuses the same
  // period computation convertCenterToPaid uses (month-end-safe, M7).
  // Design-partner / null plan yields null → anchors left untouched.
  if (plan) {
    const end = computePaidPeriodEnd(plan, new Date());
    if (end) {
      patch.subscription_ends_at = end.toISOString();
      patch.next_billing_at = end.toISOString();
    }
  }

  // Go through the tolerant patcher so the plan change still lands on a
  // DB where the lifecycle columns (subscription_ends_at /
  // next_billing_at) haven't been migrated yet — they get dropped and
  // the core subscription_plan write succeeds.
  const { error } = await updateCenterPatchTolerant(supabase, id, patch);
  if (error) {
    // If the column is missing the super-admin needs to run the
    // migration; surface a helpful hint instead of silently swallowing.
    // Any other error (RLS, network, FK) also surfaces so the caller
    // doesn't think a failed update succeeded.
    if (/subscription_plan/i.test(error)) {
      return { error: "subscription_plan column not migrated yet" };
    }
    return { error };
  }

  revalidatePath("/super-admin");
  return { success: true };
}

export async function updateSubscriptionStatus(formData: FormData) {
  const owner = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (
    !id ||
    ![
      "trial",
      "active",
      "past_due",
      "canceled",
      "expired",
      "paused",
      "pending_renewal",
    ].includes(status)
  )
    return { error: "invalid input" };

  const supabase = createAdminClient();

  // Read the previous status so the audit log can record the
  // transition (from → to). Plus, when moving to 'active' for the
  // first time we set subscription_started_at; when moving to
  // 'expired' from 'active' we stamp subscription_ends_at.
  //
  // Fall back to a minimal select if the lifecycle columns aren't in
  // the PostgREST schema cache yet — the status change should land
  // either way.
  type CenterReadRow = {
    subscription_status?: string;
    subscription_started_at?: string | null;
    subscription_plan?: string | null;
  };
  let existing: CenterReadRow | null = null;
  const full = await supabase
    .from("centers")
    .select("subscription_status, subscription_started_at, subscription_plan")
    .eq("id", id)
    .single();
  if (!full.error) {
    existing = full.data as CenterReadRow;
  } else if (/subscription_started_at/i.test(full.error.message)) {
    const fb = await supabase
      .from("centers")
      .select("subscription_status, subscription_plan")
      .eq("id", id)
      .single();
    if (!fb.error) existing = fb.data as CenterReadRow;
  }
  const fromStatus = existing?.subscription_status ?? null;

  const patch: Record<string, string | null> = {
    subscription_status: status,
  };
  if (status === "active") {
    const now = new Date();
    // First-time activation stamps the start date so renewals / period
    // math have an anchor. Don't overwrite an existing start.
    if (!existing?.subscription_started_at) {
      patch.subscription_started_at = now.toISOString();
    }
    // Stamp the paid-period anchors so a bare status flip to 'active'
    // actually enters the renewal flow (M6): findActiveSubsToMarkRenewal
    // keys the "renewal due" nudge off subscription_ends_at, so leaving
    // it null here meant a manually-activated center never got nudged.
    // Period is derived from the center's existing plan via the same
    // shared computePaidPeriodEnd convertCenterToPaid uses (month-end
    // safe, M7). Plans without a fixed cycle (design-partner / unknown /
    // absent) yield null and we leave the anchors untouched.
    const end = computePaidPeriodEnd(existing?.subscription_plan ?? null, now);
    if (end) {
      patch.subscription_ends_at = end.toISOString();
      patch.next_billing_at = end.toISOString();
    }
  }
  // 'expired' = immediate revocation. Stamp the end date as now so the
  // lock screen activates and audit/reporting shows a real timestamp.
  // 'canceled' is intentionally NOT here: cancellation preserves the
  // existing paid-period end date so the center keeps access until
  // that date (grace period). requireUser() checks ends_at < now on
  // canceled rows to decide whether to lock.
  if (status === "expired" && fromStatus === "active") {
    patch.subscription_ends_at = new Date().toISOString();
  }

  const { error, droppedCols } = await updateCenterPatchTolerant(
    supabase,
    id,
    patch,
  );
  if (error) return { error };

  if (fromStatus !== status) {
    await writeAuditLog(supabase, {
      actorEmail: owner.email,
      centerId: id,
      action: "subscription_status_change",
      entityType: "center",
      entityId: id,
      metadata: {
        from: fromStatus,
        to: status,
        auto: false,
        dropped_columns: droppedCols,
      },
    });
  }

  revalidatePath("/super-admin");
  revalidatePath(`/super-admin/centers/${id}`);
  return { success: true };
}

/**
 * Push a center's trial_ends_at out by N days.
 *
 * - days is clamped to [1, 90] so a misclick or stale form can't run
 *   a trial out to absurd lengths.
 * - The baseline is `max(now, current trial_ends_at)`: if the trial
 *   already lapsed, the new end is N days from today, not N days from
 *   the past expiry (which would silently no-op).
 * - If the center has been auto-flipped to 'expired', extending also
 *   restores the row to 'trial' status — that's the whole point of
 *   "extend" vs the manual status select.
 */
export async function extendTrial(formData: FormData) {
  const owner = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const daysRaw = Number(formData.get("days") ?? 0);
  if (!id) return { error: "missing id" };
  const days = Math.min(90, Math.max(1, Math.floor(daysRaw)));

  const supabase = createAdminClient();
  const { data: existing, error: readErr } = await supabase
    .from("centers")
    .select("subscription_status, trial_ends_at")
    .eq("id", id)
    .single();
  if (readErr || !existing) {
    return { error: readErr?.message ?? "center not found" };
  }

  const now = Date.now();
  const currentEnd = existing.trial_ends_at
    ? new Date(existing.trial_ends_at).getTime()
    : 0;
  const base = Math.max(now, currentEnd);
  const newEnd = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();

  // Extending a trial should also unlock a center that's currently
  // locked out, restoring it to 'trial'. Covers both auto-expired
  // trials ('expired') and centers canceled past their grace period
  // ('canceled') — the latter would otherwise stay locked despite now
  // having a valid future trial_ends_at (L6).
  const wasLocked =
    existing.subscription_status === "expired" ||
    existing.subscription_status === "canceled";
  const patch: Record<string, string | null> = {
    trial_ends_at: newEnd,
  };
  if (wasLocked) patch.subscription_status = "trial";

  const { error: updErr } = await updateCenterPatchTolerant(
    supabase,
    id,
    patch,
  );
  if (updErr) return { error: updErr };

  await writeAuditLog(supabase, {
    actorEmail: owner.email,
    centerId: id,
    action: "trial_extended",
    entityType: "center",
    entityId: id,
    metadata: {
      days,
      from_status: existing.subscription_status,
      to_status: wasLocked ? "trial" : existing.subscription_status,
      previous_end: existing.trial_ends_at,
      new_end: newEnd,
    },
  });

  revalidatePath("/super-admin");
  revalidatePath(`/super-admin/centers/${id}`);
  return { success: true };
}

/**
 * Convert a center from trial / expired into a paid 'active'
 * subscription on the given plan. Sets the lifecycle timestamps that
 * the dashboard reads (started, ends, last payment, next billing) so
 * the paid view renders with real data immediately.
 *
 * Plan → period:
 *   monthly      → +1 month
 *   six_months   → +6 months
 *   annual       → +12 months
 *
 * If the center already had a subscription_started_at, we keep that
 * date — this is for "extending" the lifetime, not erasing history.
 */
export async function convertCenterToPaid(formData: FormData) {
  const owner = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const planRaw = String(formData.get("plan") ?? "");
  if (!id) return { error: "missing id" };
  if (!(CONVERT_VALUES as readonly string[]).includes(planRaw)) {
    return { error: "invalid plan" };
  }
  const choice = planRaw as ConvertChoice;

  const supabase = createAdminClient();

  // Read the columns we'll branch on plus the lifecycle anchors we
  // either preserve (subscription_started_at) or stamp fresh. Founding
  // columns are pulled too so we can validate the 'founding' choice
  // matches the row and surface the locked price in the audit log.
  // Falls back to a tier-less select if the founding-center migration
  // hasn't been applied yet.
  type ExistingRow = {
    subscription_status?: string;
    subscription_plan?: string | null;
    subscription_started_at?: string | null;
    subscription_ends_at?: string | null;
    plan_tier?: string | null;
    founding_locked_price_vnd?: number | null;
    founding_center_number?: number | null;
  };
  let existing: ExistingRow | null = null;
  const full = await supabase
    .from("centers")
    .select(
      "subscription_status, subscription_plan, subscription_started_at, subscription_ends_at, plan_tier, founding_locked_price_vnd, founding_center_number",
    )
    .eq("id", id)
    .single();
  if (!full.error) {
    existing = full.data as ExistingRow;
  } else if (/plan_tier|founding_locked_price_vnd|founding_center_number/i.test(full.error.message)) {
    const fb = await supabase
      .from("centers")
      .select(
        "subscription_status, subscription_plan, subscription_started_at, subscription_ends_at",
      )
      .eq("id", id)
      .single();
    if (!fb.error) existing = fb.data as ExistingRow;
  }
  if (!existing) return { error: "center not found" };

  const now = new Date();
  const nowIso = now.toISOString();

  // Need patch to allow numbers + null + string; use a wider type.
  let patch: Record<string, string | number | null>;
  let auditMetadata: Record<string, unknown>;

  if (choice === "founding") {
    // ---- FOUNDING CONVERSION ----
    // If the row already has a slot assigned, keep it (operator may
    // have reserved a specific number). Otherwise assign the lowest
    // unused integer in [1..cap]. Cap defaults to FOUNDING_DEFAULT_CAP
    // when app_settings is missing or unreadable.
    let assignedSlot: number | null = existing.founding_center_number ?? null;
    let allFoundingRows: {
      plan_tier: string | null;
      founding_center_number: number | null;
    }[] = [];
    let cap = FOUNDING_DEFAULT_CAP;
    if (assignedSlot === null || assignedSlot <= 0) {
      // Read current founding occupants + cap to compute next slot.
      // Tolerant of missing app_settings (founding-center.sql not run)
      // and missing founding_center_number column (slot migration not
      // run) — both fall back to defaults that let the conversion
      // proceed without slot assignment.
      const [capRes, occRes] = await Promise.all([
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", "founding_center_cap")
          .maybeSingle(),
        supabase
          .from("centers")
          .select("plan_tier, founding_center_number")
          .eq("plan_tier", "founding"),
      ]);
      if (capRes.data) {
        const v = (capRes.data as { value: unknown }).value;
        if (typeof v === "number") cap = v;
        else if (typeof v === "string") cap = Number(v) || cap;
      }
      if (!occRes.error && occRes.data) {
        allFoundingRows = occRes.data as typeof allFoundingRows;
        const { nextAvailable } = computeFoundingSlotAvailability(
          allFoundingRows,
          cap,
        );
        if (nextAvailable === null) {
          // Inline literal: convertCenterToPaid doesn't load the
          // superAdmin namespace and adding it just for this edge
          // case is overkill. Operator sees the slot count and the
          // cap so the meaning is clear without translation.
          return {
            error: `All ${cap} Founding Center slots are filled. Free a slot before converting another center to Founding.`,
          };
        }
        assignedSlot = nextAvailable;
      }
    }

    // Locked price defaults to 600,000₫ for new founding conversions;
    // if the row already has a locked price set (e.g. operator pre-
    // configured a different number), preserve it.
    const lockedPrice = existing.founding_locked_price_vnd ?? 600_000;

    // Month-end-safe next-billing anchor (M7): a founding conversion on
    // e.g. Jan 31 renews Feb 28, not a drifted Mar 2/3.
    const nextBilling = addMonthsClamped(now, 1);
    patch = {
      subscription_status: "active",
      subscription_plan: "monthly",
      plan_tier: "founding",
      founding_center_number: assignedSlot,
      founding_locked_price_vnd: lockedPrice,
      subscription_started_at:
        existing.subscription_started_at ?? nowIso,
      // Founding doesn't have a fixed "ends at" — they renew monthly
      // at the locked price unless cancelled. We still set the field
      // to the next billing anchor for dashboard parity.
      subscription_ends_at: nextBilling.toISOString(),
      last_payment_at: nowIso,
      next_billing_at: nextBilling.toISOString(),
    };
    auditMetadata = {
      plan: "founding",
      from_status: existing.subscription_status,
      from_plan_tier: existing.plan_tier ?? null,
      to_status: "active",
      tier: "founding",
      locked_price_vnd: lockedPrice,
      founding_center_number: assignedSlot,
      next_billing_at: nextBilling.toISOString(),
    };
  } else {
    // ---- STANDARD CONVERSION ----
    // Picking a standard plan ALSO clears any Founding-tier markings.
    // This is the "downgrade off founding" path: operator decided the
    // center isn't actually a Founding partner after all.
    const plan = choice as Plan;
    // computePaidPeriodEnd owns the plan→length mapping and clamps
    // month-end overflow (M7). `plan` is always one of the three
    // standard values here, so it never returns null — the assertion
    // is safe.
    const endsAt = computePaidPeriodEnd(plan, now)!;
    patch = {
      subscription_status: "active",
      subscription_plan: plan,
      plan_tier: "standard",
      founding_center_number: null,
      founding_locked_price_vnd: null,
      subscription_started_at:
        existing.subscription_started_at ?? nowIso,
      subscription_ends_at: endsAt.toISOString(),
      last_payment_at: nowIso,
      next_billing_at: endsAt.toISOString(),
    };
    auditMetadata = {
      plan,
      from_status: existing.subscription_status,
      from_plan_tier: existing.plan_tier ?? null,
      to_status: "active",
      to_plan_tier: "standard",
      ends_at: endsAt.toISOString(),
      ...(existing.plan_tier === "founding"
        ? {
            cleared_founding: true,
            prior_founding_center_number:
              existing.founding_center_number ?? null,
            prior_founding_locked_price_vnd:
              existing.founding_locked_price_vnd ?? null,
          }
        : {}),
    };
  }

  const { error: updErr, droppedCols } = await updateCenterPatchTolerant(
    supabase,
    id,
    patch,
  );
  if (updErr) {
    // Slot-race friendly error: two operators racing on the same
    // Founding slot — partial unique index rejects the second writer.
    // createCenter has the same catch; mirror it here so the convert
    // path surfaces a useful message instead of raw Postgres.
    if (
      choice === "founding" &&
      (/centers_founding_slot_uniq/i.test(updErr) ||
        /duplicate key value violates unique constraint.*founding/i.test(updErr))
    ) {
      const slot =
        typeof auditMetadata.founding_center_number === "number"
          ? (auditMetadata.founding_center_number as number)
          : 0;
      return {
        error: `Slot #${slot} was just claimed by another save. Reopen the dialog so the next available slot can be re-computed.`,
      };
    }
    return { error: updErr };
  }

  await writeAuditLog(supabase, {
    actorEmail: owner.email,
    centerId: id,
    action: "subscription_converted",
    entityType: "center",
    entityId: id,
    metadata: { ...auditMetadata, dropped_columns: droppedCols },
  });

  revalidatePath("/super-admin");
  revalidatePath(`/super-admin/centers/${id}`);
  return { success: true };
}

/**
 * Revert a center to a fresh 30-day trial. The "I made a mistake on
 * the plan, let me start over" escape hatch, plus the "let me test
 * something internally" lever. Per spec:
 *
 *   - subscription_status   →  'trial'
 *   - trial_ends_at          →  now + 30 days
 *   - subscription_ends_at   →  null  (active cycle cancelled)
 *   - next_billing_at        →  null
 *   - last_payment_at        →  null
 *   - subscription_plan      →  kept as-is (so we remember what they
 *                                were on)
 *   - plan_tier              →  kept as-is (founding stays founding)
 *   - founding_center_number →  kept
 *   - founding_locked_price_vnd → kept
 *
 * Audit log records the previous status + plan for traceability.
 */
export async function revertToTrial(formData: FormData) {
  const owner = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "missing id" };

  const supabase = createAdminClient();

  const { data: existing, error: readErr } = await supabase
    .from("centers")
    .select("subscription_status, subscription_plan, plan_tier")
    .eq("id", id)
    .single();
  if (readErr || !existing) {
    return { error: readErr?.message ?? "center not found" };
  }

  const fromStatus = String(existing.subscription_status ?? "");
  if (fromStatus === "trial") return { success: true };

  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 30);

  const patch: Record<string, string | null> = {
    subscription_status: "trial",
    trial_ends_at: trialEnd.toISOString(),
    subscription_ends_at: null,
    next_billing_at: null,
    last_payment_at: null,
  };

  const { error, droppedCols } = await updateCenterPatchTolerant(
    supabase,
    id,
    patch,
  );
  if (error) return { error };

  await writeAuditLog(supabase, {
    actorEmail: owner.email,
    centerId: id,
    action: "reverted_to_trial",
    entityType: "center",
    entityId: id,
    metadata: {
      from: fromStatus,
      to: "trial",
      trial_ends_at: trialEnd.toISOString(),
      prior_subscription_plan: existing.subscription_plan ?? null,
      prior_plan_tier: existing.plan_tier ?? null,
      dropped_columns: droppedCols,
    },
  });

  revalidatePath("/super-admin");
  revalidatePath(`/super-admin/centers/${id}`);
  return { success: true };
}

export async function updateCenterNotes(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const notesRaw = String(formData.get("notes") ?? "");
  if (!id) return { error: "missing id" };
  // Cap at 4000 chars so a misclick paste doesn't blow the cell up.
  const notes = notesRaw.trim().slice(0, 4000) || null;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("centers")
    .update({ notes })
    .eq("id", id);
  if (error && /notes/i.test(error.message)) {
    // Column missing — migration not run yet. Silent no-op so the UI
    // doesn't crash; super-admin needs to run db/center-notes.sql.
    return { error: "notes column not migrated yet" };
  }
  if (error) return { error: error.message };

  revalidatePath("/super-admin");
  return { success: true };
}

export async function deleteCenterCascade(
  formData: FormData,
): Promise<{ error?: string } | void> {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createAdminClient();

  // Previously: delete center first (cascades to public.users), then
  // loop and delete auth.users. Two bugs there:
  //   1. The result of centers.delete was never checked, so if it
  //      failed for any reason the auth.users wipe loop still ran and
  //      destroyed user accounts while their center stayed.
  //   2. If the auth-loop crashed partway, we ended with orphan
  //      auth.users (no profile, no center) that the super-admin
  //      can't see in the UI to retry.
  //
  // New order: delete auth.users first (each cascades public.users via
  // the public.users.id → auth.users.id ON DELETE CASCADE FK), then
  // delete the now-empty center row. A failure at either stage stops
  // the chain and is what a manual retry needs to finish — no more
  // silent destruction of auth users on a failed center.delete.
  //
  // Failures are BOTH captured to Sentry and returned as { error } —
  // the ConfirmDeleteForm wrapper renders the message inline, and the
  // revalidate makes the row reappear so the super-admin can retry.
  const { data: profiles, error: profilesErr } = await supabase
    .from("users")
    .select("id")
    .eq("center_id", id);
  if (profilesErr) {
    Sentry.captureException(profilesErr, {
      tags: { action: "deleteCenterCascade", stage: "fetch_profiles" },
      extra: { center_id: id },
    });
    revalidatePath("/super-admin");
    return { error: profilesErr.message };
  }

  for (const p of profiles ?? []) {
    const { error: delErr } = await supabase.auth.admin.deleteUser(p.id);
    if (delErr) {
      Sentry.captureException(delErr, {
        tags: { action: "deleteCenterCascade", stage: "delete_auth_user" },
        extra: { center_id: id, user_id: p.id },
      });
      revalidatePath("/super-admin");
      return { error: delErr.message };
    }
  }

  const { error: centerErr } = await supabase
    .from("centers")
    .delete()
    .eq("id", id);
  if (centerErr) {
    Sentry.captureException(centerErr, {
      tags: { action: "deleteCenterCascade", stage: "delete_center" },
      extra: { center_id: id },
    });
    revalidatePath("/super-admin");
    return { error: centerErr.message };
  }

  revalidatePath("/super-admin");
}

/**
 * Update the Founding Center cap shown on the overview widget. Backed
 * by public.app_settings (db/founding-center.sql). Returns silently if
 * the table isn't migrated yet so the rest of the page still works.
 */
export async function updateFoundingCenterCap(formData: FormData) {
  await requireSuperAdmin();
  const raw = Number(formData.get("cap") ?? 0);
  if (!Number.isFinite(raw)) return { error: "invalid" };
  const cap = Math.min(100, Math.max(1, Math.floor(raw)));

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert(
      { key: "founding_center_cap", value: cap, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) {
    if (/app_settings/i.test(error.message)) {
      return { error: "founding-center.sql migration not applied" };
    }
    return { error: error.message };
  }

  revalidatePath("/super-admin");
  return { success: true };
}

/**
 * Pause a center. Reversible: subscription_status='paused' freezes
 * access until reactivated, and the paid clock stops where it is
 * (subscription_ends_at is NOT advanced or shortened). Audit log
 * captures the previous status so Reactivate can put them back
 * where they were.
 *
 * If the 'paused' enum value isn't yet present in the DB (i.e. the
 * pause-and-cancel.sql migration hasn't run) we surface a friendly
 * error rather than failing opaquely.
 */
export async function pauseCenter(formData: FormData) {
  const owner = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "missing id" };

  const supabase = createAdminClient();

  const { data: existing, error: readErr } = await supabase
    .from("centers")
    .select("subscription_status, subscription_plan, plan_tier")
    .eq("id", id)
    .single();
  if (readErr || !existing) {
    return { error: readErr?.message ?? "center not found" };
  }
  const fromStatus = String(existing.subscription_status ?? "");

  // Bail early if already paused — re-pausing would still succeed
  // but writes a noisy audit entry.
  if (fromStatus === "paused") return { success: true };

  const { error } = await supabase
    .from("centers")
    .update({ subscription_status: "paused" })
    .eq("id", id);
  if (error) {
    if (
      /invalid input value for enum subscription_status.*paused/i.test(
        error.message,
      )
    ) {
      return {
        error:
          "db/pause-and-cancel.sql migration not applied — run it in Supabase SQL Editor",
      };
    }
    return { error: error.message };
  }

  await writeAuditLog(supabase, {
    actorEmail: owner.email,
    centerId: id,
    action: "subscription_paused",
    entityType: "center",
    entityId: id,
    metadata: {
      from: fromStatus,
      to: "paused",
      prior_subscription_plan: existing.subscription_plan ?? null,
      prior_plan_tier: existing.plan_tier ?? null,
    },
  });

  revalidatePath("/super-admin");
  revalidatePath(`/super-admin/centers/${id}`);
  return { success: true };
}

/**
 * Permanently cancel a center. Sets subscription_status='canceled'
 * (existing enum value, American spelling) and stamps cancelled_at.
 * Tolerant of cancelled_at column missing — flips status only and
 * marks the audit row as degraded so a backfill can be run later.
 *
 * Type-name confirmation: the form must include `confirm_name`
 * exactly matching the center's `name`. The dialog validates
 * client-side; the server enforces too so a crafted POST can't
 * bypass it.
 */
export async function cancelCenter(formData: FormData) {
  const owner = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const confirmName = String(formData.get("confirm_name") ?? "").trim();
  if (!id) return { error: "missing id" };
  if (!confirmName) return { error: "missing confirm_name" };

  const supabase = createAdminClient();
  const { data: existing, error: readErr } = await supabase
    .from("centers")
    .select("name, subscription_status, subscription_plan, plan_tier")
    .eq("id", id)
    .single();
  if (readErr || !existing) {
    return { error: readErr?.message ?? "center not found" };
  }
  if (confirmName !== String(existing.name)) {
    return { error: "confirm_name does not match center name" };
  }

  const fromStatus = String(existing.subscription_status ?? "");
  if (fromStatus === "canceled") return { success: true };

  const nowIso = new Date().toISOString();
  const full = await supabase
    .from("centers")
    .update({
      subscription_status: "canceled",
      cancelled_at: nowIso,
    })
    .eq("id", id);
  let degraded = false;
  if (full.error) {
    if (/cancelled_at/i.test(full.error.message)) {
      const retry = await supabase
        .from("centers")
        .update({ subscription_status: "canceled" })
        .eq("id", id);
      if (retry.error) return { error: retry.error.message };
      degraded = true;
    } else {
      return { error: full.error.message };
    }
  }

  await writeAuditLog(supabase, {
    actorEmail: owner.email,
    centerId: id,
    action: "subscription_canceled",
    entityType: "center",
    entityId: id,
    metadata: {
      from: fromStatus,
      to: "canceled",
      cancelled_at: degraded ? null : nowIso,
      prior_subscription_plan: existing.subscription_plan ?? null,
      prior_plan_tier: existing.plan_tier ?? null,
      degraded,
    },
  });

  revalidatePath("/super-admin");
  revalidatePath(`/super-admin/centers/${id}`);
  return { success: true };
}

/**
 * Tier-aware reactivate. Replaces the old "always extend +7 days"
 * behaviour. Mode is chosen by the dialog based on plan_tier +
 * prior status:
 *
 *   mode='founding_active'  → flips to active at founding locked
 *                              price. Reuses convertCenterToPaid
 *                              under the hood (plan='founding').
 *   mode='standard_active'  → flips to active on a specific paid
 *                              plan (monthly | six_months | annual).
 *                              Reuses convertCenterToPaid.
 *   mode='resume_trial'     → just flips status back to 'trial',
 *                              leaving trial_ends_at untouched. Use
 *                              when paused/canceled rows still have
 *                              an unexpired trial date and the
 *                              operator wants them in their original
 *                              trial state.
 *
 * The reactivate action itself is a thin dispatch — the real work
 * happens in convertCenterToPaid for the two active modes, which
 * already handles audit logging + lifecycle stamping. The trial
 * mode writes its own audit entry.
 */
export async function reactivateCenter(formData: FormData) {
  const owner = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const mode = String(formData.get("mode") ?? "");
  if (!id) return { error: "missing id" };

  if (mode === "founding_active") {
    const fd = new FormData();
    fd.append("id", id);
    fd.append("plan", "founding");
    return convertCenterToPaid(fd);
  }

  if (mode === "standard_active") {
    const plan = String(formData.get("plan") ?? "");
    if (!(PLAN_VALUES as readonly string[]).includes(plan)) {
      return { error: "invalid plan for standard reactivation" };
    }
    const fd = new FormData();
    fd.append("id", id);
    fd.append("plan", plan);
    return convertCenterToPaid(fd);
  }

  if (mode === "resume_trial") {
    const supabase = createAdminClient();
    const { data: existing, error: readErr } = await supabase
      .from("centers")
      .select("subscription_status, trial_ends_at")
      .eq("id", id)
      .single();
    if (readErr || !existing) {
      return { error: readErr?.message ?? "center not found" };
    }
    const fromStatus = String(existing.subscription_status ?? "");
    const { error } = await supabase
      .from("centers")
      .update({ subscription_status: "trial" })
      .eq("id", id);
    if (error) return { error: error.message };
    await writeAuditLog(supabase, {
      actorEmail: owner.email,
      centerId: id,
      action: "subscription_reactivated",
      entityType: "center",
      entityId: id,
      metadata: {
        from: fromStatus,
        to: "trial",
        mode: "resume_trial",
        trial_ends_at: existing.trial_ends_at ?? null,
      },
    });
    revalidatePath("/super-admin");
    revalidatePath(`/super-admin/centers/${id}`);
    return { success: true };
  }

  return { error: "invalid mode" };
}
