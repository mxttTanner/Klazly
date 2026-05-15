import Link from "next/link";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deriveStatus,
  expireOverdueTrials,
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

// Per-month VND contribution of each paid plan. Six-month and annual are
// amortised so MRR is comparable across tiers.
const PLAN_MONTHLY_VND: Record<string, number> = {
  monthly: 1_200_000,
  six_months: 900_000,
  annual: 825_000,
};

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  "all",
  "trial",
  "active",
  "past_due",
  "canceled",
  "expired",
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export default async function SuperAdminHomePage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
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
    notes: string | null;
    trial_ends_at: string | null;
    subscription_started_at: string | null;
    subscription_ends_at: string | null;
    last_payment_at: string | null;
    next_billing_at: string | null;
    created_at: string;
  };
  const fullSelect =
    "id, name, contact_email, contact_phone, subscription_status, subscription_plan, notes, trial_ends_at, subscription_started_at, subscription_ends_at, last_payment_at, next_billing_at, created_at";
  const preLifecycleSelect =
    "id, name, contact_email, contact_phone, subscription_status, subscription_plan, notes, trial_ends_at, created_at";
  const noNotesSelect =
    "id, name, contact_email, contact_phone, subscription_status, subscription_plan, trial_ends_at, created_at";
  const basicSelect =
    "id, name, contact_email, contact_phone, subscription_status, trial_ends_at, created_at";

  let centers: CenterRow[] | null = null;
  const res1 = await supabase
    .from("centers")
    .select(fullSelect)
    .order("created_at", { ascending: false });
  if (!res1.error) {
    centers = (res1.data ?? []) as CenterRow[];
  } else if (/subscription_started_at|subscription_ends_at|last_payment_at|next_billing_at/i.test(res1.error.message)) {
    const r = await supabase
      .from("centers")
      .select(preLifecycleSelect)
      .order("created_at", { ascending: false });
    if (!r.error) {
      centers = (r.data ?? []).map((c) => ({
        ...(c as Omit<
          CenterRow,
          | "subscription_started_at"
          | "subscription_ends_at"
          | "last_payment_at"
          | "next_billing_at"
        >),
        subscription_started_at: null,
        subscription_ends_at: null,
        last_payment_at: null,
        next_billing_at: null,
      }));
    }
  } else if (/notes/i.test(res1.error.message)) {
    const r = await supabase
      .from("centers")
      .select(noNotesSelect)
      .order("created_at", { ascending: false });
    if (!r.error) {
      centers = (r.data ?? []).map((c) => ({
        ...(c as Omit<
          CenterRow,
          | "notes"
          | "subscription_started_at"
          | "subscription_ends_at"
          | "last_payment_at"
          | "next_billing_at"
        >),
        notes: null,
        subscription_started_at: null,
        subscription_ends_at: null,
        last_payment_at: null,
        next_billing_at: null,
      }));
    }
  } else if (/subscription_plan/i.test(res1.error.message)) {
    const r = await supabase
      .from("centers")
      .select(basicSelect)
      .order("created_at", { ascending: false });
    centers = ((r.data ?? []) as Array<{
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
    }));
  }

  // Lazy auto-expire: any trial whose trial_ends_at is in the past
  // gets flipped to 'expired' before the dashboard renders, with one
  // audit_log row per transition. Failures here don't block the page.
  if (centers && centers.length > 0) {
    await expireOverdueTrials(supabase, centers);
    // Re-fetch the freshly-updated statuses for accurate display.
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
          days,
          zaloUrl: zaloDeeplinkFromPhone(c.contact_phone),
        });
      } else if (days <= 7) {
        warningTrials.push({
          id: c.id,
          name: c.name,
          contactPhone: c.contact_phone,
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

  // KPIs use the derived status so the dashboard reflects what the
  // admin actually sees, not the raw DB value.
  const [{ count: studentCount }, { count: lessonCount }] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("lessons").select("id", { count: "exact", head: true }),
  ]);

  let mrrVnd = 0;
  let activeCount = 0;
  let trialCount = 0;
  let trialsExpiringSoon = 0;
  for (const c of withDerived) {
    if (c.derived === "active") {
      activeCount += 1;
      if (c.subscription_plan && PLAN_MONTHLY_VND[c.subscription_plan]) {
        mrrVnd += PLAN_MONTHLY_VND[c.subscription_plan];
      }
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
      tone: "text-sky-600",
    },
    {
      label: t("statsActive"),
      value: String(activeCount),
      icon: Sparkles,
      tone: "text-emerald-600",
    },
    {
      label: t("statsTrial"),
      value: String(trialCount),
      icon: AlarmClock,
      tone: trialsExpiringSoon > 0 ? "text-amber-600" : "text-muted-foreground",
      sub:
        trialsExpiringSoon > 0
          ? t("statsTrialEndingSoonHint", { n: trialsExpiringSoon })
          : null,
    },
    {
      label: t("statsMrr"),
      value: mrrFormatted,
      icon: CircleDollarSign,
      tone: "text-emerald-600",
    },
  ];

  // Filter tabs: count each status for badge display, then filter the
  // visible list by the active filter.
  const filterCounts: Record<StatusFilter, number> = {
    all: withDerived.length,
    trial: 0,
    active: 0,
    past_due: 0,
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
      const ends = new Date(c.subscription_ends_at);
      subText = t("subscriptionEndsAt", {
        date: ends.toLocaleDateString(dateLocale, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "Asia/Ho_Chi_Minh",
        }),
      });
    }

    return {
      ...c,
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
              { key: "past_due" as const, label: t("statusPastDue") },
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
      <CenterForm />
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
        </div>
        <Link
          href="/super-admin/feedback"
          className="bg-card text-foreground border-border hover:bg-muted/60 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm"
        >
          Feedback inbox
        </Link>
      </div>

      {/* Action required — trials about to lapse + recently expired
          centres to chase. Hidden when nothing needs attention. */}
      {hasActionRequired ? (
        <section
          aria-label={t("actionRequiredTitle")}
          className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <span className="bg-amber-100 text-amber-700 ring-amber-200 mt-0.5 inline-flex size-9 items-center justify-center rounded-full ring-1">
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

      {/* Stats — always visible. The business-glance snapshot. */}
      <div className="space-y-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    {s.label}
                  </CardTitle>
                  <Icon className={`size-4 ${s.tone}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tabular-nums">
                    {s.value}
                  </p>
                  {s.sub ? (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {s.sub}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
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
    days: number;
    zaloUrl: string | null;
  }[];
  t: ActionGroupTranslator;
  kind: "left" | "ago";
}) {
  const toneClasses =
    tone === "urgent"
      ? {
          card: "border-rose-300 bg-white",
          header: "text-rose-800",
          icon: "bg-rose-100 text-rose-700 ring-rose-200",
          days: "text-rose-700 font-semibold",
          button:
            "bg-rose-600 text-white hover:bg-rose-500 ring-rose-700/20",
        }
      : tone === "warning"
        ? {
            card: "border-amber-300 bg-white",
            header: "text-amber-900",
            icon: "bg-amber-100 text-amber-700 ring-amber-200",
            days: "text-amber-800 font-medium",
            button:
              "bg-amber-600 text-white hover:bg-amber-500 ring-amber-700/20",
          }
        : {
            card: "border-slate-300 bg-white",
            header: "text-slate-800",
            icon: "bg-slate-100 text-slate-600 ring-slate-200",
            days: "text-slate-700",
            button:
              "bg-slate-700 text-white hover:bg-slate-600 ring-slate-800/20",
          };
  const Icon =
    tone === "urgent" ? AlertTriangle : tone === "warning" ? Clock : AlarmClock;
  return (
    <div
      className={
        "flex flex-col rounded-lg border p-4 shadow-sm " + toneClasses.card
      }
    >
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
            className="flex items-center justify-between gap-3 rounded-md border border-slate-200/80 bg-slate-50/60 px-3 py-2"
          >
            <div className="min-w-0">
              <Link
                href={`/super-admin/centers/${c.id}`}
                className="hover:text-primary block truncate text-sm font-medium"
              >
                {c.name}
              </Link>
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
                className={
                  "ring-offset-background focus-visible:ring-ring inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold shadow-sm ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
                  toneClasses.button
                }
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
