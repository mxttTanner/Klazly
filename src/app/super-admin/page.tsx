import { getLocale, getTranslations } from "next-intl/server";
import { AlarmClock, Building2, CircleDollarSign, Sparkles } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/super-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default async function SuperAdminHomePage() {
  await requireSuperAdmin();
  const t = await getTranslations("superAdmin");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  const supabase = createAdminClient();

  // Try to fetch with subscription_plan; if the column doesn't exist yet
  // (migration not run) fall back to the basic select so the page still
  // renders. Same pattern used elsewhere for late-added columns.
  type CenterRow = {
    id: string;
    name: string;
    contact_email: string | null;
    contact_phone: string | null;
    subscription_status: string;
    subscription_plan: string | null;
    notes: string | null;
    trial_ends_at: string | null;
    created_at: string;
  };
  // Two columns (subscription_plan, notes) were added in later migrations.
  // Try the full select, then progressively peel them off if the column
  // doesn't exist yet, so the page renders regardless of which migrations
  // have been applied.
  const fullSelect =
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
  } else if (/notes/i.test(res1.error.message)) {
    const res2 = await supabase
      .from("centers")
      .select(noNotesSelect)
      .order("created_at", { ascending: false });
    if (!res2.error) {
      centers = ((res2.data ?? []) as Omit<CenterRow, "notes">[]).map((c) => ({
        ...c,
        notes: null,
      }));
    } else if (/subscription_plan/i.test(res2.error.message)) {
      const res3 = await supabase
        .from("centers")
        .select(basicSelect)
        .order("created_at", { ascending: false });
      centers = (
        (res3.data ?? []) as Omit<CenterRow, "subscription_plan" | "notes">[]
      ).map((c) => ({ ...c, subscription_plan: null, notes: null }));
    }
  } else if (/subscription_plan/i.test(res1.error.message)) {
    const res3 = await supabase
      .from("centers")
      .select(basicSelect)
      .order("created_at", { ascending: false });
    centers = (
      (res3.data ?? []) as Omit<CenterRow, "subscription_plan" | "notes">[]
    ).map((c) => ({ ...c, subscription_plan: null, notes: null }));
  }

  // Compute MRR and trials-expiring from the centers we already fetched —
  // saves three more roundtrips. Active centers with a known plan
  // contribute their amortised monthly rate.
  const [{ count: studentCount }, { count: lessonCount }] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("lessons").select("id", { count: "exact", head: true }),
  ]);

  let mrrVnd = 0;
  let activeCount = 0;
  let trialsExpiringSoon = 0;
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  for (const c of centers ?? []) {
    if (c.subscription_status === "active") {
      activeCount += 1;
      if (c.subscription_plan && PLAN_MONTHLY_VND[c.subscription_plan]) {
        mrrVnd += PLAN_MONTHLY_VND[c.subscription_plan];
      }
    }
    if (
      c.subscription_status === "trial" &&
      c.trial_ends_at &&
      new Date(c.trial_ends_at).getTime() - now <= sevenDaysMs &&
      new Date(c.trial_ends_at).getTime() - now >= 0
    ) {
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
      value: String(centers?.length ?? 0),
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
      label: t("statsTrialsExpiring"),
      value: String(trialsExpiringSoon),
      icon: AlarmClock,
      tone: trialsExpiringSoon > 0 ? "text-rose-600" : "text-muted-foreground",
    },
    {
      label: t("statsMrr"),
      value: mrrFormatted,
      icon: CircleDollarSign,
      tone: "text-emerald-600",
    },
  ];

  // Strings the client-side CenterCard needs for trial pluralisation.
  // Computed server-side so translations stay in next-intl-server.
  const trialDaysLabels = {
    active: (n: number) => t("trialDaysShort", { n }),
    expired: t("trialExpiredShort"),
  };

  const centersList =
    centers && centers.length > 0 ? (
      <div className="grid gap-4 lg:grid-cols-2">
        {centers.map((c) => (
          <CenterCard
            key={c.id}
            center={c as CenterCardData}
            dateLocale={dateLocale}
            trialDaysLabels={trialDaysLabels}
          />
        ))}
      </div>
    ) : (
      <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-12 text-center text-sm">
        <Building2 className="size-8 opacity-50" />
        <p>{t("empty")}</p>
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
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </div>

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
                  <p className="text-3xl font-semibold">{s.value}</p>
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

      {/* Tabs — splits the working surface so it doesn't feel cramped. */}
      <SuperAdminTabs
        tabs={[
          {
            id: "centers",
            label: t("tabCenters"),
            iconKey: "centers",
            badge: centers?.length ?? 0,
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
