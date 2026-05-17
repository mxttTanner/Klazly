import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  Clock,
  GraduationCap,
  History,
  Mail,
  MessageCircle,
  NotebookPen,
  Phone,
  Sparkles,
  Users,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/super-admin";
import {
  computeFoundingSlotAvailability,
  deriveStatus,
  FOUNDING_DEFAULT_CAP,
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
import { NotesCell } from "../../notes-cell";
import { TierBadge } from "../../tier-badge";
import { CenterActionsBar } from "./center-actions-bar";

export const dynamic = "force-dynamic";

/**
 * Super-admin per-center detail view. Everything an operator needs to
 * make a decision *now* (extend, convert, lock, reactivate) without
 * digging through the admin app: subscription state with countdown,
 * usage counts, contact info, notes, and a recent activity feed.
 *
 * Reads use the service-role client so an expired/cancelled center
 * still renders here for follow-up — never gate the super-admin out
 * of seeing their own customers.
 */
export default async function CenterDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireSuperAdmin();
  const t = await getTranslations("superAdmin");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  const supabase = createAdminClient();
  // Try the full select including the founding-center columns; fall
  // back to the legacy shape when the migration hasn't been applied
  // yet so the detail page still renders.
  type CenterRow = {
    id: string;
    name: string;
    contact_email: string | null;
    contact_phone: string | null;
    notes: string | null;
    subscription_status: string;
    subscription_plan: string | null;
    plan_tier: string | null;
    signup_source: string | null;
    referral_note: string | null;
    trial_ends_at: string | null;
    subscription_started_at: string | null;
    subscription_ends_at: string | null;
    last_payment_at: string | null;
    next_billing_at: string | null;
    founding_center_number: number | null;
    founding_locked_price_vnd: number | null;
    created_at: string;
  };
  let center: CenterRow | null = null;
  const full = await supabase
    .from("centers")
    .select(
      "id, name, contact_email, contact_phone, notes, subscription_status, subscription_plan, plan_tier, signup_source, referral_note, trial_ends_at, subscription_started_at, subscription_ends_at, last_payment_at, next_billing_at, founding_center_number, founding_locked_price_vnd, created_at",
    )
    .eq("id", params.id)
    .single();
  if (!full.error) {
    center = full.data as CenterRow;
  } else if (/founding_center_number|founding_locked_price_vnd/i.test(full.error.message)) {
    // Founding-slot migration not applied yet — re-fetch without those
    // two columns and treat them as null. The page still renders and
    // the Convert dialog falls back to the standard plan picker.
    const r = await supabase
      .from("centers")
      .select(
        "id, name, contact_email, contact_phone, notes, subscription_status, subscription_plan, plan_tier, signup_source, referral_note, trial_ends_at, subscription_started_at, subscription_ends_at, last_payment_at, next_billing_at, created_at",
      )
      .eq("id", params.id)
      .single();
    if (!r.error) {
      center = {
        ...(r.data as Omit<
          CenterRow,
          "founding_center_number" | "founding_locked_price_vnd"
        >),
        founding_center_number: null,
        founding_locked_price_vnd: null,
      };
    }
  } else if (/plan_tier|signup_source|referral_note/i.test(full.error.message)) {
    const fb = await supabase
      .from("centers")
      .select(
        "id, name, contact_email, contact_phone, notes, subscription_status, subscription_plan, trial_ends_at, subscription_started_at, subscription_ends_at, last_payment_at, next_billing_at, created_at",
      )
      .eq("id", params.id)
      .single();
    if (!fb.error && fb.data) {
      center = {
        ...(fb.data as Omit<
          CenterRow,
          | "plan_tier"
          | "signup_source"
          | "referral_note"
          | "founding_center_number"
          | "founding_locked_price_vnd"
        >),
        plan_tier: null,
        signup_source: null,
        referral_note: null,
        founding_center_number: null,
        founding_locked_price_vnd: null,
      };
    }
  }
  if (!center) notFound();

  const derived: DerivedStatus = deriveStatus(
    center as unknown as CenterSubscriptionInput,
  );

  // Per-center usage counts — every "head: true, count: exact" runs a
  // separate query but they're all single-row COUNT scans against an
  // indexed center_id, so they stay cheap. Fired in parallel.
  const [teachers, parents, classes, students, lessons, audits] =
    await Promise.all([
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("center_id", params.id)
        .eq("role", "teacher"),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("center_id", params.id)
        .eq("role", "parent"),
      supabase
        .from("classes")
        .select("id", { count: "exact", head: true })
        .eq("center_id", params.id),
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("center_id", params.id),
      supabase
        .from("lessons")
        .select("id, class_id, classes!inner(center_id)", {
          count: "exact",
          head: true,
        })
        .eq("classes.center_id", params.id),
      supabase
        .from("audit_log")
        .select("id, action, metadata, created_at, user_id")
        .eq("center_id", params.id)
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

  const teacherCount = teachers.count ?? 0;
  const parentCount = parents.count ?? 0;
  const classCount = classes.count ?? 0;
  const studentCount = students.count ?? 0;
  const lessonCount = lessons.count ?? 0;
  const auditRows = (audits.data ?? []) as Array<{
    id: string;
    action: string;
    metadata: Record<string, unknown> | null;
    created_at: string;
    user_id: string | null;
  }>;

  // Founding-slot availability — read all founding rows + cap so the
  // Convert dialog can show "Next available slot: #N · M remaining".
  // Tolerant of either column / table being absent (returns defaults).
  let foundingCap = FOUNDING_DEFAULT_CAP;
  let foundingNextSlot: number | null = 1;
  let foundingSlotsRemaining = FOUNDING_DEFAULT_CAP;
  try {
    const [capRes, foundingRows] = await Promise.all([
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
      if (typeof v === "number") foundingCap = v;
      else if (typeof v === "string") foundingCap = Number(v) || foundingCap;
    }
    const occ =
      foundingRows.error || !foundingRows.data
        ? []
        : (foundingRows.data as {
            plan_tier: string | null;
            founding_center_number: number | null;
          }[]);
    const availability = computeFoundingSlotAvailability(occ, foundingCap);
    foundingNextSlot = availability.nextAvailable;
    foundingSlotsRemaining = availability.remaining;
  } catch {
    // Migrations not applied — defaults already set above.
  }

  const planKey = planLabelKey(center.subscription_plan);
  const planText = planKey ? t(planKey) : null;
  const statusLabel = t(
    statusLabelKey(derived) as Parameters<typeof t>[0],
  );
  const tone = statusTone(derived);

  // Trial countdown card data (only meaningful for trial-family
  // statuses). For 'expired' we show "expired N days ago" so the
  // super-admin can decide whether a courtesy extension is worth it.
  const isTrialFamily =
    derived === "trial" || derived === "trial_ending_soon";
  const trialDays = trialDaysLeft(center.trial_ends_at);
  const daysSinceExpiry = trialDaysSinceExpiry(center.trial_ends_at);

  // Trial total length is inferred from created_at → trial_ends_at if
  // available, falling back to 14d. Used to draw the progress bar
  // (so a 30-day extension shows mostly full, a 7-day grace shows
  // nearly empty).
  let trialTotalDays = 14;
  if (center.trial_ends_at && center.created_at) {
    const total = Math.max(
      1,
      Math.round(
        (new Date(center.trial_ends_at).getTime() -
          new Date(center.created_at).getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    );
    trialTotalDays = total;
  }
  const daysUsed =
    trialDays !== null
      ? Math.max(0, Math.min(trialTotalDays, trialTotalDays - trialDays))
      : trialTotalDays;
  const progressPct = Math.min(
    100,
    Math.max(0, (daysUsed / trialTotalDays) * 100),
  );

  const trialCountdownTone =
    trialDays === null
      ? "text-muted-foreground"
      : trialDays <= 0
        ? "text-rose-700"
        : trialDays <= 3
          ? "text-rose-600"
          : trialDays <= 7
            ? "text-amber-700"
            : "text-sky-700";

  // Pin formatters to Asia/Ho_Chi_Minh so subscription dates render in
  // Vietnam time even if the Vercel runtime is UTC. Belt-and-suspenders
  // alongside the TZ env var documented in .env.local.example.
  const VN_TZ = "Asia/Ho_Chi_Minh";
  const formatDate = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleDateString(dateLocale, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: VN_TZ,
        })
      : "—";
  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(dateLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: VN_TZ,
    });

  // monthlyMrrVnd branches on plan_tier — Founding Centers contribute
  // their founding_locked_price_vnd (₫600K default) instead of the
  // standard plan ladder. Returns 0 for any non-paying row.
  const planMrr =
    center.subscription_status === "active" ? monthlyMrrVnd(center) : 0;
  const mrrFormatted = planMrr > 0
    ? new Intl.NumberFormat(dateLocale, {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(planMrr)
    : null;

  const zaloUrl = zaloDeeplinkFromPhone(center.contact_phone);

  return (
    <div className="space-y-8">
      {/* Breadcrumb + back */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/super-admin"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" />
          {t("backToCenters")}
        </Link>
        <div className="text-muted-foreground hidden items-center gap-1 text-xs sm:flex">
          <span>{t("title")}</span>
          <ChevronRight className="size-3" />
          <span className="text-foreground">{center.name}</span>
        </div>
      </div>

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary inline-flex size-11 items-center justify-center rounded-xl">
              <Building2 className="size-5" />
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">
              {center.name}
            </h1>
            <TierBadge
              tier={center.plan_tier}
              size="full"
              slotNumber={center.founding_center_number}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${tone}`}
            >
              {statusLabel}
            </span>
            {planText ? (
              <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                {planText}
              </span>
            ) : null}
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <Calendar className="size-3" />
              {t("createdShort", { date: formatDate(center.created_at) })}
            </span>
            {center.signup_source ? (
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                · {t(`source_${center.signup_source}` as Parameters<typeof t>[0])}
                {center.referral_note ? (
                  <span className="text-foreground font-medium">
                    {" "}({center.referral_note})
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
        </div>

        <CenterActionsBar
          centerId={center.id}
          centerName={center.name}
          status={center.subscription_status}
          plan={center.subscription_plan}
          planTier={center.plan_tier}
          trialEndsAt={center.trial_ends_at}
          subscriptionEndsAt={center.subscription_ends_at}
          foundingCenterNumber={center.founding_center_number}
          foundingLockedPriceVnd={center.founding_locked_price_vnd}
          foundingNextSlot={foundingNextSlot}
          foundingSlotsRemaining={foundingSlotsRemaining}
          foundingCap={foundingCap}
          locale={dateLocale}
        />
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — countdown + subscription + contact + notes */}
        <div className="space-y-6 lg:col-span-2">
          {/* Trial countdown card */}
          {isTrialFamily ? (
            <section className="bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                    {t("trialCountdownLabel")}
                  </p>
                  <p className="mt-1.5 flex items-baseline gap-2">
                    <span
                      className={`text-4xl font-bold tabular-nums ${trialCountdownTone}`}
                    >
                      {trialDays !== null && trialDays > 0 ? trialDays : 0}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {t("daysLeftSuffix")}
                    </span>
                  </p>
                </div>
                <span className="bg-sky-50 text-sky-700 ring-sky-200 inline-flex size-10 items-center justify-center rounded-full ring-1">
                  <CalendarClock className="size-5" />
                </span>
              </div>

              <div
                className="bg-muted mt-5 h-2 w-full overflow-hidden rounded-full"
                role="progressbar"
                aria-valuenow={Math.round(progressPct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t("trialProgressAria")}
              >
                <div
                  style={{ width: `${progressPct}%` }}
                  className={`h-full rounded-full transition-all ${
                    trialDays !== null && trialDays <= 3
                      ? "bg-rose-500"
                      : trialDays !== null && trialDays <= 7
                        ? "bg-amber-500"
                        : "bg-sky-500"
                  }`}
                />
              </div>
              <p className="text-muted-foreground mt-3 text-xs">
                {t("trialEndsOn", {
                  date: formatDate(center.trial_ends_at),
                })}
                {" · "}
                {t("trialTotalDays", { n: trialTotalDays })}
              </p>
            </section>
          ) : null}

          {/* Renewal-due banner — surfaces when the lazy-expire pass
              has flipped the row to 'pending_renewal' (or when
              subscription_ends_at is in the past but the DB hasn't
              caught up yet). Tells the operator the active period has
              ended and points them at the Manage button. */}
          {derived === "pending_renewal" ? (
            <section className="rounded-2xl border border-orange-300 bg-orange-50/60 p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <span className="bg-orange-100 text-orange-800 ring-orange-300 mt-0.5 inline-flex size-10 items-center justify-center rounded-full ring-1">
                  <CalendarClock className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-orange-900 text-sm font-semibold">
                    {t("renewalDueBannerTitle", {
                      date: formatDate(center.subscription_ends_at),
                    })}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t("renewalDueBannerHint")}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {/* Recently expired courtesy card */}
          {derived === "expired" && daysSinceExpiry !== null ? (
            <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <span className="bg-rose-100 text-rose-700 ring-rose-200 mt-0.5 inline-flex size-10 items-center justify-center rounded-full ring-1">
                  <Clock className="size-5" />
                </span>
                <div>
                  <p className="text-rose-900 text-sm font-semibold">
                    {t("expiredHeadline", { n: daysSinceExpiry })}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t("expiredHint")}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {/* Paid subscription card */}
          {derived === "active" || derived === "past_due" || derived === "canceled" ? (
            <section className="bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                    {t("subscriptionDetails")}
                  </p>
                  {mrrFormatted ? (
                    <p className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-3xl font-semibold tabular-nums text-emerald-700">
                        {mrrFormatted}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {t("perMonth")}
                      </span>
                    </p>
                  ) : null}
                </div>
                <span className="bg-emerald-50 text-emerald-700 ring-emerald-200 inline-flex size-10 items-center justify-center rounded-full ring-1">
                  <CircleDollarSign className="size-5" />
                </span>
              </div>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <DetailRow
                  label={t("planLabel")}
                  value={planText ?? "—"}
                />
                <DetailRow
                  label={t("subscriptionStartedAt")}
                  value={formatDate(center.subscription_started_at)}
                />
                <DetailRow
                  label={t("subscriptionEndsAtLabel")}
                  value={formatDate(center.subscription_ends_at)}
                />
                <DetailRow
                  label={t("lastPaymentAt")}
                  value={formatDate(center.last_payment_at)}
                />
                <DetailRow
                  label={t("nextBillingAt")}
                  value={formatDate(center.next_billing_at)}
                />
              </dl>
            </section>
          ) : null}

          {/* Contact card */}
          <section className="bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
              {t("contactSectionLabel")}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {center.contact_email ? (
                <a
                  href={`mailto:${center.contact_email}`}
                  className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
                >
                  <Mail className="size-4 text-emerald-600" />
                  {center.contact_email}
                </a>
              ) : null}
              {center.contact_phone ? (
                <a
                  href={`tel:${center.contact_phone}`}
                  className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
                >
                  <Phone className="size-4 text-emerald-600" />
                  {center.contact_phone}
                </a>
              ) : null}
              {zaloUrl ? (
                <a
                  href={zaloUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
                >
                  <MessageCircle className="size-4" />
                  {t("messageOnZalo")}
                </a>
              ) : null}
              {!center.contact_email && !center.contact_phone ? (
                <p className="text-muted-foreground text-sm italic">
                  {t("noContactInfo")}
                </p>
              ) : null}
            </div>
          </section>

          {/* Notes */}
          <section className="bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <NotebookPen className="text-muted-foreground size-4" />
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                {t("notesLabel")}
              </p>
            </div>
            <div className="mt-3">
              <NotesCell centerId={center.id} initial={center.notes} />
            </div>
          </section>
        </div>

        {/* Right column — usage stats + activity */}
        <div className="space-y-6">
          <section className="bg-card rounded-2xl border p-5 shadow-sm">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
              {t("usageLabel")}
            </p>
            <dl className="mt-4 space-y-3">
              <StatRow
                icon={Users}
                label={t("statTeachers")}
                value={teacherCount}
              />
              <StatRow
                icon={GraduationCap}
                label={t("statStudents")}
                value={studentCount}
              />
              <StatRow
                icon={Users}
                label={t("statParents")}
                value={parentCount}
              />
              <StatRow
                icon={Sparkles}
                label={t("statClasses")}
                value={classCount}
              />
              <StatRow
                icon={NotebookPen}
                label={t("statLessons")}
                value={lessonCount}
              />
            </dl>
          </section>

          <section className="bg-card rounded-2xl border p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <History className="text-muted-foreground size-4" />
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                {t("activityLabel")}
              </p>
            </div>
            {auditRows.length === 0 ? (
              <p className="text-muted-foreground mt-3 text-sm italic">
                {t("activityEmpty")}
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {auditRows.map((row) => (
                  <li
                    key={row.id}
                    className="border-l-2 border-slate-200 pl-3 text-sm"
                  >
                    <p className="font-medium">
                      {renderAuditAction(row.action, row.metadata, t)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatDateTime(row.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function StatRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-muted-foreground inline-flex items-center gap-2 text-sm">
        <Icon className="size-4" />
        {label}
      </div>
      <span className="text-base font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Map a raw audit_log row to a short human sentence. Translation keys
 * are intentionally narrow — anything we don't have a friendly label
 * for falls back to the raw action string so nothing gets silently
 * dropped from the history.
 */
function renderAuditAction(
  action: string,
  metadata: Record<string, unknown> | null,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (action === "subscription_status_change") {
    const from = String(metadata?.from ?? "");
    const to = String(metadata?.to ?? "");
    const auto = metadata?.auto === true;
    const reason = String(metadata?.reason ?? "");
    // Special-case the founding-trial auto-conversion so the activity
    // feed reads "Founding trial converted to active" instead of the
    // generic "Auto-changed from trial to active".
    if (auto && reason === "founding_trial_converted") {
      return t("auditFoundingTrialConverted");
    }
    if (auto && reason === "renewal_due") {
      return t("auditRenewalDue");
    }
    return auto
      ? t("auditStatusChangedAuto", { from, to })
      : t("auditStatusChanged", { from, to });
  }
  if (action === "trial_extended") {
    return t("auditTrialExtended", { days: Number(metadata?.days ?? 0) });
  }
  if (action === "subscription_converted") {
    const plan = String(metadata?.plan ?? "");
    if (plan === "founding") {
      const price = Number(metadata?.locked_price_vnd ?? 0);
      const slot = metadata?.founding_center_number;
      // If we know the slot + price, use the rich label; otherwise
      // fall back to a generic founding line. Slot=0 means unknown.
      if (price > 0 && typeof slot === "number" && slot > 0) {
        return t("auditConvertedFoundingFull", {
          price: new Intl.NumberFormat("vi-VN").format(price),
          n: slot,
        });
      }
      return t("auditConvertedFounding");
    }
    return t("auditSubscriptionConverted", { plan });
  }
  if (action === "subscription_paused") {
    return t("auditPaused");
  }
  if (action === "subscription_canceled") {
    return t("auditCanceled");
  }
  if (action === "subscription_reactivated") {
    const mode = String(metadata?.mode ?? "");
    if (mode === "resume_trial") return t("auditReactivatedResumeTrial");
    return t("auditReactivated");
  }
  if (action === "reverted_to_trial") {
    return t("auditRevertedToTrial");
  }
  return action;
}
