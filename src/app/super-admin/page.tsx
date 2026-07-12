import Link from "next/link";
import { healDemoAccounts } from "@/lib/demo-server";
import { getLocale, getTranslations } from "next-intl/server";
import {
  AlarmClock,
  AlertTriangle,
  Building2,
  CircleDollarSign,
  Clock,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/super-admin";
// Card primitives removed — KPI tiles rendered inline with a neutral
// icon chip; color is reserved for the trial-ending-soon warning only.
import {
  deriveStatus,
  expireOverdueTrials,
  monthlyMrrVnd,
  planLabelKey,
  statusLabelKey,
  statusTone,
  trialDaysLeft,
  trialDaysSinceExpiry,
  zaloDeeplinkFromPhone,
  type CenterSubscriptionInput,
  type DerivedStatus,
} from "@/lib/subscription";
import { CenterForm } from "./center-form";
import { CenterCard, type CenterCardData } from "./center-card";
import { SuperAdminTabs } from "./super-admin-tabs";
import { TierBadge } from "./tier-badge";
import { FoundingCenterWidget } from "./founding-widget";
import { SourceAnalytics } from "./source-analytics";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  "all",
  "trial",
  "active",
  "pending_renewal",
  "past_due",
  "paused",
  "canceled",
  "expired",
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export default async function SuperAdminHomePage(
  props: {
    searchParams: Promise<{ status?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  await requireSuperAdmin();
  const t = await getTranslations("superAdmin");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  const activeFilter: StatusFilter = (STATUS_FILTERS as readonly string[]).includes(
    searchParams.status ?? "",
  )
    ? (searchParams.status as StatusFilter)
    : "all";

  const supabase = createAdminClient();

  // Try to fetch with the full lifecycle columns; fall back if the
  // db/subscription-lifecycle.sql migration hasn't been run yet.
  type CenterRow = {
    id: string;
    name: string;
    contact_email: string | null;
    contact_phone: string | null;
    subscription_status: string;
    subscription_plan: string | null;
    plan_tier: string | null;
    signup_source: string | null;
    notes: string | null;
    trial_ends_at: string | null;
    subscription_started_at: string | null;
    subscription_ends_at: string | null;
    last_payment_at: string | null;
    next_billing_at: string | null;
    // Founding-slot tracking — null when the migration hasn't run or
    // when the center is on the standard tier. monthlyMrrVnd reads
    // founding_locked_price_vnd for plan_tier='founding' rows;
    // founding_center_number powers the "FC #N" badge in the card.
    founding_locked_price_vnd: number | null;
    founding_center_number: number | null;
    created_at: string;
  };
  const withTierSelect =
    "id, name, contact_email, contact_phone, subscription_status, subscription_plan, plan_tier, signup_source, notes, trial_ends_at, subscription_started_at, subscription_ends_at, last_payment_at, next_billing_at, founding_locked_price_vnd, founding_center_number, created_at";
  const fullSelect =
    "id, name, contact_email, contact_phone, subscription_status, subscription_plan, notes, trial_ends_at, subscription_started_at, subscription_ends_at, last_payment_at, next_billing_at, created_at";
  const preLifecycleSelect =
    "id, name, contact_email, contact_phone, subscription_status, subscription_plan, notes, trial_ends_at, created_at";
  const noNotesSelect =
    "id, name, contact_email, contact_phone, subscription_status, subscription_plan, trial_ends_at, created_at";
  const basicSelect =
    "id, name, contact_email, contact_phone, subscription_status, trial_ends_at, created_at";

  // Centers fetch with schema-migration fallback chain. The chain has
  // to serialize within itself (each fallback uses a smaller column
  // set), but we wrap it in an IIFE so the rest of the dashboard data
  // (settings, kpi counts) can fetch in parallel with it.
  const centersPromise: Promise<CenterRow[] | null> = (async () => {
    const res0 = await supabase
      .from("centers")
      .select(withTierSelect)
      .order("created_at", { ascending: false });
    if (!res0.error) return (res0.data ?? []) as CenterRow[];

    const res1 = await supabase
      .from("centers")
      .select(fullSelect)
      .order("created_at", { ascending: false });
    if (!res1.error) {
      return ((res1.data ?? []) as Omit<CenterRow, "plan_tier" | "signup_source" | "founding_locked_price_vnd" | "founding_center_number">[]).map(
        (c) => ({ ...c, plan_tier: null, signup_source: null, founding_locked_price_vnd: null, founding_center_number: null }),
      );
    }
    if (/subscription_started_at|subscription_ends_at|last_payment_at|next_billing_at/i.test(res1.error.message)) {
      const r = await supabase
        .from("centers")
        .select(preLifecycleSelect)
        .order("created_at", { ascending: false });
      if (!r.error) {
        return (r.data ?? []).map((c) => ({
          ...(c as Omit<
            CenterRow,
            | "subscription_started_at"
            | "subscription_ends_at"
            | "last_payment_at"
            | "next_billing_at"
            | "plan_tier"
            | "signup_source"
            | "founding_locked_price_vnd"
            | "founding_center_number"
          >),
          subscription_started_at: null,
          subscription_ends_at: null,
          last_payment_at: null,
          next_billing_at: null,
          plan_tier: null,
          signup_source: null,
          founding_locked_price_vnd: null,
          founding_center_number: null,
        }));
      }
    }
    if (/notes/i.test(res1.error.message)) {
      const r = await supabase
        .from("centers")
        .select(noNotesSelect)
        .order("created_at", { ascending: false });
      if (!r.error) {
        return (r.data ?? []).map((c) => ({
          ...(c as Omit<
            CenterRow,
            | "notes"
            | "subscription_started_at"
            | "subscription_ends_at"
            | "last_payment_at"
            | "next_billing_at"
            | "plan_tier"
            | "signup_source"
            | "founding_locked_price_vnd"
            | "founding_center_number"
          >),
          notes: null,
          subscription_started_at: null,
          subscription_ends_at: null,
          last_payment_at: null,
          next_billing_at: null,
          plan_tier: null,
          signup_source: null,
          founding_locked_price_vnd: null,
          founding_center_number: null,
        }));
      }
    }
    if (/subscription_plan/i.test(res1.error.message)) {
      const r = await supabase
        .from("centers")
        .select(basicSelect)
        .order("created_at", { ascending: false });
      return ((r.data ?? []) as Array<{
        id: string;
        name: string;
        contact_email: string | null;
        contact_phone: string | null;
        subscription_status: string;
        trial_ends_at: string | null;
        created_at: string;
      }>).map((c) => ({
        ...c,
        subscription_plan: null,
        notes: null,
        subscription_started_at: null,
        subscription_ends_at: null,
        last_payment_at: null,
        next_billing_at: null,
        plan_tier: null,
        signup_source: null,
        founding_locked_price_vnd: null,
        founding_center_number: null,
      }));
    }
    return null;
  })();

  // KPI counts + founding-center cap setting all run in parallel with
  // the centers fetch. The setting fetch is allowed to fail (migration
  // may not have run yet); we recover the foundingWidgetEnabled flag
  // from the absence of data.
  let centers: CenterRow[] | null;
  let studentCount: number | null;
  let lessonCount: number | null;
  let foundingSettingRaw: unknown = null;
  let foundingSettingOk = false;
  {
    // First batch: the centers list + the founding-cap setting run in
    // parallel. The KPI student/lesson counts are deferred to a second
    // batch below because they need the demo center's id (only known
    // once the centers list resolves) so they can be scoped to exclude
    // it — see L8 below.
    const [centersResolved, settingRes] = await Promise.all([
      centersPromise,
      supabase
        .from("app_settings")
        .select("value")
        .eq("key", "founding_center_cap")
        .maybeSingle()
        .then(
          (r) => ({ ok: !r.error, data: r.data }),
          () => ({ ok: false, data: null }),
        ),
    ]);
    centers = centersResolved;

    // Identify the built-in demo center (it powers /demo). Same
    // predicate used to hide it from the list AND to exclude it from
    // the aggregate KPI counts, so the two never drift apart. Usually a
    // single row, but we collect all matches defensively.
    const demoCenterIds = (centers ?? [])
      .filter(
        (c) =>
          c.signup_source === "demo" ||
          c.contact_email === "lienhe@hoamai.test",
      )
      .map((c) => c.id);

    // Hide the built-in demo center from the operational console — the
    // super-admin should only see real centers. The demo data stays in
    // the DB so /demo keeps working; it just isn't listed here, so it
    // can't be accidentally deleted.
    if (centers) {
      centers = centers.filter((c) => !demoCenterIds.includes(c.id));
    }

    // Second batch: KPI aggregate counts, scoped to exclude the demo
    // center's rows so the operational totals reflect only real centers
    // (L8) — matching how the list hides it. `students` carries
    // center_id directly; `lessons` reach a center only through
    // `classes`, so we exclude demo lessons via an inner join on
    // classes.center_id. Chained .neq()s AND together (exclude every
    // demo id); with no demo center the queries stay unscoped totals.
    let studentQuery = supabase
      .from("students")
      .select("id", { count: "exact", head: true });
    let lessonQuery = supabase
      .from("lessons")
      .select("id, classes!inner(center_id)", { count: "exact", head: true });
    for (const demoId of demoCenterIds) {
      studentQuery = studentQuery.neq("center_id", demoId);
      lessonQuery = lessonQuery.neq("classes.center_id", demoId);
    }
    const [studentRes, lessonRes] = await Promise.all([
      studentQuery,
      lessonQuery,
    ]);
    studentCount = studentRes.count ?? 0;
    if (!lessonRes.error) {
      lessonCount = lessonRes.count ?? 0;
    } else {
      // Inner-join filter unavailable (e.g. the classes relationship
      // isn't exposed on an older schema) — fall back to the unscoped
      // total so the footnote still shows a real number rather than 0.
      const fallback = await supabase
        .from("lessons")
        .select("id", { count: "exact", head: true });
      lessonCount = fallback.count ?? 0;
    }

    foundingSettingOk = settingRes.ok;
    foundingSettingRaw = settingRes.data
      ? (settingRes.data as { value: unknown }).value
      : null;
  }

  // Lazy self-heal for the shared demo accounts: resets their password
  // and email back to canonical values in case a demo visitor rotated
  // them via the auth API. Fire-and-forget — never blocks the dashboard.
  void healDemoAccounts();

  // Lazy auto-expire: any trial whose trial_ends_at is in the past
  // gets flipped to 'expired' before the dashboard renders, with one
  // audit_log row per transition. Failures here don't block the page.
  // Has to run after centers are loaded (needs the row set), and
  // before withDerived is computed (so the dashboard reflects the
  // freshly-updated statuses).
  if (centers && centers.length > 0) {
    await expireOverdueTrials(supabase, centers);
    const refresh = await supabase
      .from("centers")
      .select("id, subscription_status")
      .in(
        "id",
        centers.map((c) => c.id),
      );
    if (!refresh.error && refresh.data) {
      const map = new Map(
        (refresh.data as { id: string; subscription_status: string }[]).map(
          (r) => [r.id, r.subscription_status],
        ),
      );
      centers = centers.map((c) => ({
        ...c,
        subscription_status: map.get(c.id) ?? c.subscription_status,
      }));
    }
  }

  // Compute derived status for every center (adds 'trial_ending_soon'
  // when trial_ends_at is ≤3 days out).
  const withDerived = (centers ?? []).map((c) => ({
    ...c,
    derived: deriveStatus(c as CenterSubscriptionInput),
  }));

  // "Action required" buckets — trials about to lapse + recently
  // expired centres to chase for conversion. Computed once here and
  // rendered as a banner above the KPI cards. Hidden entirely when
  // all three buckets are empty so a quiet account doesn't get a
  // useless heading.
  type ActionRow = {
    id: string;
    name: string;
    contactPhone: string | null;
    planTier: string | null;
    foundingCenterNumber: number | null;
    days: number; // positive = days left; for expired bucket = days since expiry
    zaloUrl: string | null;
  };
  const urgentTrials: ActionRow[] = [];
  const warningTrials: ActionRow[] = [];
  const recentlyExpired: ActionRow[] = [];
  for (const c of withDerived) {
    if (c.derived === "trial" || c.derived === "trial_ending_soon") {
      const days = trialDaysLeft(c.trial_ends_at);
      if (days === null || days <= 0) continue;
      if (days <= 3) {
        urgentTrials.push({
          id: c.id,
          name: c.name,
          contactPhone: c.contact_phone,
          planTier: c.plan_tier,
          foundingCenterNumber: c.founding_center_number,
          days,
          zaloUrl: zaloDeeplinkFromPhone(c.contact_phone),
        });
      } else if (days <= 7) {
        warningTrials.push({
          id: c.id,
          name: c.name,
          contactPhone: c.contact_phone,
          planTier: c.plan_tier,
          foundingCenterNumber: c.founding_center_number,
          days,
          zaloUrl: zaloDeeplinkFromPhone(c.contact_phone),
        });
      }
    } else if (c.derived === "expired") {
      const since = trialDaysSinceExpiry(c.trial_ends_at);
      if (since !== null && since <= 14) {
        recentlyExpired.push({
          id: c.id,
          name: c.name,
          contactPhone: c.contact_phone,
          planTier: c.plan_tier,
          foundingCenterNumber: c.founding_center_number,
          days: since,
          zaloUrl: zaloDeeplinkFromPhone(c.contact_phone),
        });
      }
    }
  }
  urgentTrials.sort((a, b) => a.days - b.days);
  warningTrials.sort((a, b) => a.days - b.days);
  recentlyExpired.sort((a, b) => a.days - b.days);
  const hasActionRequired =
    urgentTrials.length + warningTrials.length + recentlyExpired.length > 0;

  // Founding Center cohort tracking — pulls the cap from
  // public.app_settings (managed by updateFoundingCenterCap) and
  // counts active+trial centers on plan_tier='founding'. Falls back
  // gracefully when the founding-center migration hasn't run yet so
  // the widget just hides.
  // foundingSettingOk + foundingSettingRaw came from the parallel
  // batch above — derive cap and widget-enabled flag from them.
  let foundingCap = 5;
  const foundingWidgetEnabled = foundingSettingOk;
  if (foundingSettingRaw !== null) {
    if (typeof foundingSettingRaw === "number") foundingCap = foundingSettingRaw;
    else if (typeof foundingSettingRaw === "string")
      foundingCap = Number(foundingSettingRaw) || 5;
  }
  const foundingFilled = withDerived.filter(
    (c) =>
      c.plan_tier === "founding" &&
      (c.derived === "trial" ||
        c.derived === "trial_ending_soon" ||
        c.derived === "active"),
  ).length;

  // Which slot numbers are already taken. Used by the new-center form
  // to auto-fill the next available slot (and block submission when
  // the cap is full unless the operator ticks an override).
  const foundingSlotsTaken: number[] = withDerived
    .filter(
      (c) =>
        c.plan_tier === "founding" &&
        typeof c.founding_center_number === "number" &&
        c.founding_center_number !== null,
    )
    .map((c) => c.founding_center_number as number)
    .sort((a, b) => a - b);
  let foundingNextSlot: number | null = null;
  for (let n = 1; n <= foundingCap; n++) {
    if (!foundingSlotsTaken.includes(n)) {
      foundingNextSlot = n;
      break;
    }
  }

  // Source breakdown counts — null-safe; old centers without
  // signup_source just don't contribute.
  const sourceCounts: Record<string, number> = {};
  for (const c of withDerived) {
    const s = c.signup_source ?? null;
    if (!s) continue;
    sourceCounts[s] = (sourceCounts[s] ?? 0) + 1;
  }
  const sourceTotal = Object.values(sourceCounts).reduce((a, b) => a + b, 0);

  // studentCount + lessonCount were fetched in the parallel batch
  // above; they roll into the KPI cards below.
  let mrrVnd = 0;
  let activeCount = 0;
  let trialCount = 0;
  let trialsExpiringSoon = 0;
  for (const c of withDerived) {
    if (c.derived === "active") {
      activeCount += 1;
      // monthlyMrrVnd honours plan_tier='founding' → founding_locked_price_vnd
      // (₫600K default) instead of the standard plan ladder, so a
      // Founding row contributes its locked price, not 1.2M.
      mrrVnd += monthlyMrrVnd(c);
    }
    if (c.derived === "trial" || c.derived === "trial_ending_soon") {
      trialCount += 1;
    }
    if (c.derived === "trial_ending_soon") {
      trialsExpiringSoon += 1;
    }
  }
  const mrrFormatted = new Intl.NumberFormat(dateLocale, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(mrrVnd);

  const stats = [
    {
      label: t("statsCenters"),
      value: String(withDerived.length),
      icon: Building2,
      warn: false,
      sub: null as string | null,
    },
    {
      label: t("statsActive"),
      value: String(activeCount),
      icon: Sparkles,
      warn: false,
      sub: null as string | null,
    },
    {
      label: t("statsTrial"),
      value: String(trialCount),
      icon: AlarmClock,
      // Real warning state: trials lapsing within the ending-soon
      // window earn a restrained amber chip + hint. Otherwise neutral.
      warn: trialsExpiringSoon > 0,
      sub:
        trialsExpiringSoon > 0
          ? t("statsTrialEndingSoonHint", { n: trialsExpiringSoon })
          : null,
    },
    {
      label: t("statsMrr"),
      value: mrrFormatted,
      icon: CircleDollarSign,
      warn: false,
      sub: null as string | null,
    },
  ];

  // Filter tabs: count each status for badge display, then filter the
  // visible list by the active filter.
  const filterCounts: Record<StatusFilter, number> = {
    all: withDerived.length,
    trial: 0,
    active: 0,
    pending_renewal: 0,
    past_due: 0,
    paused: 0,
    canceled: 0,
    expired: 0,
  };
  for (const c of withDerived) {
    // Trial + trial_ending_soon both count under "trial" tab.
    if (c.derived === "trial" || c.derived === "trial_ending_soon") {
      filterCounts.trial += 1;
    } else {
      filterCounts[c.derived] += 1;
    }
  }

  const filteredCenters = withDerived.filter((c) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "trial")
      return c.derived === "trial" || c.derived === "trial_ending_soon";
    return c.derived === activeFilter;
  });

  // Pre-render each card's status+plan badge server-side so the client
  // component receives plain props.
  const decorated: (CenterCardData & {
    createdShort: string;
    statusBadge: { labelKey: string; tone: string; subText: string | null };
    planText: string | null;
  })[] = filteredCenters.map((c) => {
    const status: DerivedStatus = c.derived;
    const planKey = planLabelKey(c.subscription_plan);
    const planText = planKey ? t(planKey) : null;

    let subText: string | null = null;
    if (status === "trial" || status === "trial_ending_soon") {
      const days = trialDaysLeft(c.trial_ends_at);
      if (days !== null && days > 0) {
        subText = t("trialDaysShort", { n: days });
      }
    }
    if (status === "active" && c.subscription_ends_at) {
      // "renews in N days" is more scannable than a literal date for
      // the centers-list at-a-glance read. Falls back to the literal
      // date if the timestamp parsed as in-the-past (caught by the
      // lazy-expire pass on next render).
      const endsMs = new Date(c.subscription_ends_at).getTime();
      const daysLeft = Math.ceil((endsMs - Date.now()) / (24 * 60 * 60 * 1000));
      if (daysLeft > 0) {
        subText = t("renewsInDaysShort", { n: daysLeft });
      } else {
        subText = t("renewsDueShort");
      }
    }
    if (status === "pending_renewal") {
      // Already past ends_at — operator needs to renew. Show how many
      // days overdue so the urgency is visible.
      if (c.subscription_ends_at) {
        const endsMs = new Date(c.subscription_ends_at).getTime();
        const daysOverdue = Math.ceil(
          (Date.now() - endsMs) / (24 * 60 * 60 * 1000),
        );
        subText = t("renewalOverdueShort", { n: Math.max(0, daysOverdue) });
      } else {
        subText = t("renewsDueShort");
      }
    }

    // Price chip — only render for active centers, and honour
    // founding_locked_price_vnd via monthlyMrrVnd. Format as
    // "₫600,000 / mo" so the operator can compare across centers
    // at a glance without doing currency math.
    let mrrText: string | null = null;
    if (status === "active") {
      const mrr = monthlyMrrVnd(c);
      if (mrr > 0) {
        const formatted = new Intl.NumberFormat(dateLocale, {
          style: "currency",
          currency: "VND",
          maximumFractionDigits: 0,
        }).format(mrr);
        mrrText = t("mrrChipShort", { amount: formatted });
      }
    }

    return {
      ...c,
      foundingCenterNumber: c.founding_center_number,
      mrrText,
      statusBadge: {
        labelKey: statusLabelKey(status),
        tone: statusTone(status),
        subText,
      },
      planText,
      createdShort: t("createdShort", {
        date: new Date(c.created_at).toLocaleDateString(dateLocale, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "Asia/Ho_Chi_Minh",
        }),
      }),
      // Legacy field still consumed by the card; superseded by statusBadge.
      trialBadge: null,
    };
  });

  const centersList = (
    <div className="space-y-5">
      {/* Filter tabs — derived statuses, badge with counts. */}
      <nav className="border-b">
        <div className="-mb-px flex flex-wrap gap-1">
          {(
            [
              { key: "all" as const, label: t("filterAll") },
              { key: "trial" as const, label: t("statusTrial") },
              { key: "active" as const, label: t("statusActive") },
              { key: "pending_renewal" as const, label: t("statusPendingRenewal") },
              { key: "past_due" as const, label: t("statusPastDue") },
              { key: "paused" as const, label: t("statusPaused") },
              { key: "canceled" as const, label: t("statusCanceled") },
              { key: "expired" as const, label: t("statusExpired") },
            ]
          ).map((tab) => {
            const active = activeFilter === tab.key;
            const href =
              tab.key === "all" ? "/super-admin" : `/super-admin?status=${tab.key}`;
            const count = filterCounts[tab.key];
            return (
              <Link
                key={tab.key}
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition " +
                  (active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground")
                }
              >
                {tab.label}
                <span
                  className={
                    "rounded-full px-1.5 text-[10px] font-semibold tabular-nums " +
                    (active
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {decorated.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {decorated.map((c) => (
            <CenterCard key={c.id} center={c} />
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-12 text-center text-sm">
          <Building2 className="size-8 opacity-50" />
          <p>{activeFilter === "all" ? t("empty") : t("filterEmpty")}</p>
        </div>
      )}
    </div>
  );

  const newCenterPanel = (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{t("createSubtitle")}</p>
      <CenterForm
        foundingCap={foundingCap}
        foundingSlotsTaken={foundingSlotsTaken}
        foundingNextSlot={foundingNextSlot}
      />
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Greeting card — neutral surface; the single primary accent
          carries the platform-owner identity. */}
      <div className="rounded-2xl border bg-card p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-primary inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
              <Sparkles className="size-3.5" />
              Platform owner
            </p>
            <h1 className="text-xl font-bold tracking-tight sm:text-3xl">
              {t("title")}
            </h1>
            <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
          </div>
          <Link
            href="/super-admin/feedback"
            className="bg-card text-foreground border-border hover:bg-muted/60 hover:border-primary/30 inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium shadow-sm transition"
          >
            <MessageCircle className="size-4" />
            Feedback inbox
          </Link>
        </div>
      </div>

      {/* Action required — trials about to lapse + recently expired
          centres to chase. Hidden when nothing needs attention. */}
      {hasActionRequired ? (
        <section
          aria-label={t("actionRequiredTitle")}
          className="space-y-4 rounded-xl border bg-card p-5 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <span className="bg-amber-50 text-amber-700 ring-amber-200 mt-0.5 inline-flex size-9 items-center justify-center rounded-full ring-1">
              <AlertTriangle className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {t("actionRequiredTitle")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t("actionRequiredSubtitle")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {urgentTrials.length > 0 ? (
              <ActionGroup
                tone="urgent"
                title={t("urgentLabel")}
                hint={t("urgentHint")}
                centers={urgentTrials}
                t={t as ActionGroupTranslator}
                kind="left"
              />
            ) : null}
            {warningTrials.length > 0 ? (
              <ActionGroup
                tone="warning"
                title={t("warningLabel")}
                hint={t("warningHint")}
                centers={warningTrials}
                t={t as ActionGroupTranslator}
                kind="left"
              />
            ) : null}
            {recentlyExpired.length > 0 ? (
              <ActionGroup
                tone="expired"
                title={t("recentlyExpiredLabel")}
                hint={t("recentlyExpiredHint")}
                centers={recentlyExpired}
                t={t as ActionGroupTranslator}
                kind="ago"
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Founding Center cohort + source-attribution. Internal-only.
          Render side-by-side at small screens too — both are compact. */}
      {foundingWidgetEnabled || sourceTotal > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {foundingWidgetEnabled ? (
            <FoundingCenterWidget
              filled={foundingFilled}
              initialCap={foundingCap}
            />
          ) : null}
          <SourceAnalytics
            counts={sourceCounts}
            total={sourceTotal}
            labels={{
              zalo_cold: t("source_zalo_cold"),
              landing_cta: t("source_landing_cta"),
              referral: t("source_referral"),
              in_person: t("source_in_person"),
              other: t("source_other"),
            }}
          />
        </div>
      ) : null}

      {/* Stats — KPI tiles: neutral icon chip, big numerals, hover
          lift. Color is held back for the trial-ending warning only.
          Staggered entrance via animation-delay so the row reads as
          one fluid sweep on first paint. */}
      <div className="space-y-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                style={{ animationDelay: `${i * 80}ms` }}
                className="bg-card group/kpi relative h-full overflow-hidden rounded-xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:fill-mode-backwards"
              >
                <div className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={
                        "flex size-10 shrink-0 items-center justify-center rounded-lg " +
                        (s.warn
                          ? "bg-amber-50 text-amber-700"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      <Icon className="size-5" />
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-semibold tabular-nums leading-none tracking-tight sm:text-4xl">
                      {s.value}
                    </p>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      {s.label}
                    </p>
                    {s.sub ? (
                      <p className="text-amber-700 mt-1 text-xs font-medium">
                        {s.sub}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-muted-foreground text-xs">
          {t("usageFootnote", {
            students: studentCount ?? 0,
            lessons: lessonCount ?? 0,
          })}
        </p>
      </div>

      {/* (action-required panel rendered above stats) */}
      {/* Tabs — splits the working surface so it doesn't feel cramped. */}
      <SuperAdminTabs
        tabs={[
          {
            id: "centers",
            label: t("tabCenters"),
            iconKey: "centers",
            badge: withDerived.length,
            content: centersList,
          },
          {
            id: "new",
            label: t("tabNewCenter"),
            iconKey: "new",
            content: newCenterPanel,
          },
        ]}
      />
    </div>
  );
}

/**
 * Loose translator signature for the inline ActionGroup helper. The
 * real `t` returned by next-intl has a strictly-typed key union, so we
 * cast to this at the call site — the helper itself only needs to
 * call t() with the small set of keys it knows about.
 */
type ActionGroupTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

/**
 * A single tone-coded panel inside the "Action required" section.
 *
 * - `kind="left"` renders the days field as "X days left" (trials).
 * - `kind="ago"` renders it as "X days ago" (recently expired).
 *
 * `t` is the translator from the superAdmin namespace — we accept it
 * as a prop so the sub-component stays a plain server function and we
 * don't double-load the namespace.
 */
function ActionGroup({
  tone,
  title,
  hint,
  centers,
  t,
  kind,
}: {
  tone: "urgent" | "warning" | "expired";
  title: string;
  hint: string;
  centers: {
    id: string;
    name: string;
    contactPhone: string | null;
    planTier: string | null;
    foundingCenterNumber: number | null;
    days: number;
    zaloUrl: string | null;
  }[];
  t: ActionGroupTranslator;
  kind: "left" | "ago";
}) {
  // Surfaces stay neutral; urgency is encoded by the icon, header and
  // days-left color only (semantic: rose=urgent, amber=warning,
  // muted=expired). The Zalo CTA uses the single primary accent.
  const toneClasses =
    tone === "urgent"
      ? {
          header: "text-rose-800",
          icon: "bg-rose-50 text-rose-700 ring-rose-200",
          days: "text-rose-700 font-semibold",
        }
      : tone === "warning"
        ? {
            header: "text-amber-900",
            icon: "bg-amber-50 text-amber-700 ring-amber-200",
            days: "text-amber-800 font-medium",
          }
        : {
            header: "text-foreground",
            icon: "bg-muted text-muted-foreground ring-border",
            days: "text-muted-foreground",
          };
  const Icon =
    tone === "urgent" ? AlertTriangle : tone === "warning" ? Clock : AlarmClock;
  return (
    <div className="bg-card flex flex-col rounded-lg border p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span
          className={
            "inline-flex size-7 items-center justify-center rounded-full ring-1 " +
            toneClasses.icon
          }
        >
          <Icon className="size-4" />
        </span>
        <div className={"text-sm font-semibold " + toneClasses.header}>
          {title}
          <span className="text-muted-foreground ml-1.5 text-xs font-normal tabular-nums">
            ({centers.length})
          </span>
        </div>
      </div>
      <p className="text-muted-foreground mt-1 text-xs">{hint}</p>

      <ul className="mt-3 space-y-2">
        {centers.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/super-admin/centers/${c.id}`}
                  className="hover:text-primary truncate text-sm font-medium"
                >
                  {c.name}
                </Link>
                <TierBadge
                  tier={c.planTier}
                  slotNumber={c.foundingCenterNumber}
                />
              </div>
              <p className={"mt-0.5 text-xs tabular-nums " + toneClasses.days}>
                {kind === "left"
                  ? t("daysLeftShort", { n: c.days })
                  : t("daysAgoShort", { n: c.days })}
              </p>
            </div>
            {c.zaloUrl ? (
              <a
                href={c.zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary text-primary-foreground hover:bg-primary/90 ring-offset-background focus-visible:ring-ring inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <MessageCircle className="size-3.5" />
                {t("messageOnZalo")}
              </a>
            ) : (
              <span className="text-muted-foreground shrink-0 text-xs italic">
                {t("noPhoneOnFile")}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
