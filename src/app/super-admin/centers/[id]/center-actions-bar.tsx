"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarPlus,
  Check,
  CircleDollarSign,
  Pause,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  cancelCenter,
  convertCenterToPaid,
  extendTrial,
  pauseCenter,
  revertToTrial,
} from "../../actions";

const PLANS = ["monthly", "six_months", "annual"] as const;
type Plan = (typeof PLANS)[number];

const EXTEND_PRESETS = [7, 14, 30] as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const RENEWAL_NUDGE_WINDOW_DAYS = 7;

/**
 * Operations bar for the super-admin's center detail page.
 *
 *   Manage     unified state-aware button — replaces the old
 *              Convert + Reactivate. Label adapts per status:
 *                trial                              → "Convert to paid"
 *                active (>7d from ends_at)          → "Change plan"
 *                active (≤7d from ends_at)          → "Renew or change plan" (amber dot)
 *                pending_renewal                    → "Renew or change plan" (amber dot)
 *                paused / expired / canceled        → "Reactivate"
 *              The dialog itself shows all 4 plans + a Revert-to-Trial
 *              escape hatch, with the row's current plan flagged.
 *
 *   Extend     trial / expired / past_due  →  trial
 *              shows current trial_ends_at + 3 presets.
 *
 *   Pause      trial / active / past_due   →  paused
 *              reversible — billing freezes where it is.
 *
 *   Cancel     anything except canceled    →  canceled (permanent)
 *              type-name confirmation, smaller text-button below
 *              the main row.
 */
export function CenterActionsBar({
  centerId,
  centerName,
  status,
  plan,
  planTier,
  trialEndsAt,
  subscriptionEndsAt,
  foundingCenterNumber,
  foundingLockedPriceVnd,
  foundingNextSlot,
  foundingSlotsRemaining,
  foundingCap,
  locale,
}: {
  centerId: string;
  centerName: string;
  status: string;
  plan: string | null;
  planTier: string | null;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  foundingCenterNumber: number | null;
  foundingLockedPriceVnd: number | null;
  foundingNextSlot: number | null;
  foundingSlotsRemaining: number;
  foundingCap: number;
  locale: string;
}) {
  const t = useTranslations("superAdmin");

  const [open, setOpen] = useState<"manage" | "extend" | "pause" | "cancel" | null>(
    null,
  );

  // Renewal-due if active AND ends_at is within 7 days OR already
  // past (the lazy-expire pass would normally flip them to
  // pending_renewal but there's a small window between ends_at and
  // the next page load).
  const renewalDueSoon =
    (status === "active" || status === "pending_renewal") &&
    subscriptionEndsAt !== null &&
    new Date(subscriptionEndsAt).getTime() - Date.now() <=
      RENEWAL_NUDGE_WINDOW_DAYS * DAY_MS;

  const isFounding = planTier === "founding";

  // Manage button label + tone — state-aware so a glance at the button
  // tells the operator what they're about to do.
  let manageLabel: string;
  let manageTone: "emerald" | "amber";
  if (status === "trial") {
    manageLabel = t("manageConvertToPaid");
    manageTone = "emerald";
  } else if (status === "active" && renewalDueSoon) {
    manageLabel = t("manageRenewOrChange");
    manageTone = "amber";
  } else if (status === "active") {
    manageLabel = t("manageChangePlan");
    manageTone = "emerald";
  } else if (status === "pending_renewal") {
    manageLabel = t("manageRenewOrChange");
    manageTone = "amber";
  } else {
    // expired / canceled / paused / past_due
    manageLabel = t("manageReactivate");
    manageTone = "emerald";
  }

  const showExtend =
    status === "trial" || status === "expired" || status === "past_due";
  const showPause =
    status === "trial" || status === "active" || status === "past_due";
  const showCancel = status !== "canceled";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => setOpen("manage")}
          className="relative"
          size="lg"
        >
          <CircleDollarSign className="size-4" />
          {manageLabel}
          {manageTone === "amber" ? (
            <span
              className="bg-amber-400 ml-1 inline-flex size-2 rounded-full"
              aria-hidden="true"
            />
          ) : null}
        </Button>
        {showExtend ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen("extend")}
            size="lg"
          >
            <CalendarPlus className="size-4" />
            {t("actionExtend")}
          </Button>
        ) : null}
        {showPause ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen("pause")}
            size="lg"
          >
            <Pause className="size-4" />
            {t("actionPause")}
          </Button>
        ) : null}
      </div>

      {/* Cancel: small text button below, deliberate choice. */}
      {showCancel ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setOpen("cancel")}
            className="text-muted-foreground hover:text-destructive text-xs underline-offset-2 hover:underline"
          >
            {t("actionCancel")}
          </button>
        </div>
      ) : null}

      <ManageDialog
        open={open === "manage"}
        onClose={() => setOpen(null)}
        centerId={centerId}
        centerName={centerName}
        status={status}
        currentPlan={plan}
        isFounding={isFounding}
        renewalDueSoon={renewalDueSoon}
        foundingCenterNumber={foundingCenterNumber}
        foundingLockedPriceVnd={foundingLockedPriceVnd}
        foundingNextSlot={foundingNextSlot}
        foundingSlotsRemaining={foundingSlotsRemaining}
        foundingCap={foundingCap}
        locale={locale}
      />
      <ExtendDialog
        open={open === "extend"}
        onClose={() => setOpen(null)}
        centerId={centerId}
        trialEndsAt={trialEndsAt}
        locale={locale}
      />
      <PauseDialog
        open={open === "pause"}
        onClose={() => setOpen(null)}
        centerId={centerId}
        centerName={centerName}
      />
      <CancelDialog
        open={open === "cancel"}
        onClose={() => setOpen(null)}
        centerId={centerId}
        centerName={centerName}
      />
    </>
  );
}

/**
 * Unified Manage Plan dialog. Handles convert / change / renew /
 * reactivate by showing the same 4-option picker with:
 *   - "Current plan" badge on whichever radio matches the row's
 *     current plan (only when status='active' / 'pending_renewal')
 *   - Pre-selection set to the current plan when applicable
 *   - Header copy adapts per mode (convert vs change vs renew vs
 *     reactivate)
 *   - Small "Revert to 30-day trial" section at the bottom (visible
 *     when status !== 'trial'), with an inline two-step confirm so
 *     the operator can't fat-finger it.
 */
type ManageChoice = Plan | "founding";

function ManageDialog({
  open,
  onClose,
  centerId,
  centerName,
  status,
  currentPlan,
  isFounding,
  renewalDueSoon,
  foundingCenterNumber,
  foundingLockedPriceVnd,
  foundingNextSlot,
  foundingSlotsRemaining,
  foundingCap,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  centerId: string;
  centerName: string;
  status: string;
  currentPlan: string | null;
  isFounding: boolean;
  renewalDueSoon: boolean;
  foundingCenterNumber: number | null;
  foundingLockedPriceVnd: number | null;
  foundingNextSlot: number | null;
  foundingSlotsRemaining: number;
  foundingCap: number;
  locale: string;
}) {
  const t = useTranslations("superAdmin");

  // What's the row's current plan choice, normalised to ManageChoice?
  // Only meaningful when status='active' or 'pending_renewal'; we
  // use it both for pre-selection and for the "Current plan" badge.
  const currentChoice: ManageChoice | null =
    status === "active" || status === "pending_renewal"
      ? isFounding
        ? "founding"
        : (currentPlan as Plan | null) ?? null
      : null;

  // Pre-selection rule:
  //   - active / pending_renewal → preselect current plan
  //   - trial / expired / canceled / paused → no preselection (force
  //     operator to make a deliberate pick)
  //   - already founding (any status) still preselects 'founding'
  //     so a re-convert keeps the locked rate.
  const initialChoice: ManageChoice | null =
    currentChoice ?? (isFounding ? "founding" : null);

  const [choice, setChoice] = useState<ManageChoice | null>(initialChoice);
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setChoice(initialChoice);
      setError(null);
      setRevertConfirmOpen(false);
    }
    // Initial choice is derived from props that may change between
    // opens, but we only want the reset on the open→true edge — so
    // intentionally don't depend on initialChoice itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const lockedPrice = foundingLockedPriceVnd ?? 600_000;
  const formattedLockedPrice = new Intl.NumberFormat(locale).format(lockedPrice);

  const foundingDisabled = !isFounding && foundingNextSlot === null;

  // Header copy adapts per mode.
  let title: string;
  let description: string;
  if (status === "trial") {
    title = t("manageDialogTitleConvert", { name: centerName });
    description = t("manageDialogDescriptionConvert");
  } else if (status === "pending_renewal" || renewalDueSoon) {
    title = t("manageDialogTitleRenew", { name: centerName });
    description = t("manageDialogDescriptionRenew");
  } else if (status === "active") {
    title = t("manageDialogTitleChange", { name: centerName });
    description = t("manageDialogDescriptionChange");
  } else {
    title = t("manageDialogTitleReactivate", { name: centerName });
    description = t("manageDialogDescriptionReactivate");
  }

  // Founding meta line under the Founding option.
  let foundingMeta: string;
  if (isFounding && foundingCenterNumber !== null && foundingCenterNumber > 0) {
    foundingMeta = t("convertFoundingMetaCurrentSlot", { n: foundingCenterNumber });
  } else if (isFounding) {
    foundingMeta = t("convertFoundingMetaWillAssign");
  } else if (foundingNextSlot !== null) {
    foundingMeta = t("convertFoundingMetaNextSlot", {
      n: foundingNextSlot,
      remaining: foundingSlotsRemaining,
      cap: foundingCap,
    });
  } else {
    foundingMeta = t("convertFoundingMetaAllTaken", { cap: foundingCap });
  }

  function submit() {
    if (!choice) return;
    setError(null);
    const fd = new FormData();
    fd.append("id", centerId);
    fd.append("plan", choice);
    startTransition(async () => {
      const res = await convertCenterToPaid(fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  function submitRevert() {
    setError(null);
    const fd = new FormData();
    fd.append("id", centerId);
    startTransition(async () => {
      const res = await revertToTrial(fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  // Revert-to-trial confirmation step replaces the plan picker
  // inline (rather than spawning a sub-modal) so the operator can
  // still hit Cancel to back out and re-pick a plan.
  if (revertConfirmOpen) {
    return (
      <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("revertDialogTitle", { name: centerName })}
            </DialogTitle>
            <DialogDescription>
              {t("revertDialogDescription")}
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <p className="text-destructive text-xs" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRevertConfirmOpen(false)}
              disabled={pending}
            >
              {t("revertBackToPicker")}
            </Button>
            <Button
              type="button"
              onClick={submitRevert}
              disabled={pending}
            >
              <RotateCcw className="size-4" />
              {pending ? t("saving") : t("revertConfirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-2.5" disabled={pending}>
          <legend className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {t("planLabel")}
          </legend>

          {PLANS.map((p) => {
            const isCurrent = currentChoice === p;
            return (
              <label
                key={p}
                className={
                  "flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 transition " +
                  (choice === p
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/40")
                }
              >
                <span className="flex items-center gap-2.5 text-sm font-medium">
                  <input
                    type="radio"
                    name="plan"
                    value={p}
                    checked={choice === p}
                    onChange={() => setChoice(p)}
                    className="size-4 accent-primary"
                  />
                  {t(planLabelKey(p) as Parameters<typeof t>[0])}
                  {isCurrent ? (
                    <span className="bg-primary/10 text-primary ring-primary/20 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1">
                      {t("manageCurrentPlanBadge")}
                    </span>
                  ) : null}
                </span>
                <span className="text-muted-foreground text-xs">
                  {t(planPriceKey(p) as Parameters<typeof t>[0])}
                </span>
              </label>
            );
          })}

          <div className="text-muted-foreground my-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider">
            <span className="bg-muted-foreground/20 h-px flex-1" />
            <span>{t("convertFoundingSeparator")}</span>
            <span className="bg-muted-foreground/20 h-px flex-1" />
          </div>

          <label
            className={
              "flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 transition " +
              (foundingDisabled
                ? "cursor-not-allowed border-muted bg-muted/30 opacity-60"
                : choice === "founding"
                  ? "border-primary bg-primary/5 cursor-pointer"
                  : "hover:bg-muted/40 cursor-pointer")
            }
          >
            <span className="flex min-w-0 items-start gap-2.5">
              <input
                type="radio"
                name="plan"
                value="founding"
                checked={choice === "founding"}
                onChange={() => setChoice("founding")}
                disabled={foundingDisabled}
                className="mt-0.5 size-4 accent-primary"
              />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Sparkles className="size-3.5 text-amber-600" />
                  {t("convertFoundingOptionTitle")}
                  {currentChoice === "founding" ? (
                    <span className="bg-primary/10 text-primary ring-primary/20 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1">
                      {t("manageCurrentPlanBadge")}
                    </span>
                  ) : null}
                </span>
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  {t("convertFoundingOptionPrice", { price: formattedLockedPrice })}
                </span>
                <span className="text-muted-foreground mt-1 block text-[11px]">
                  {foundingMeta}
                </span>
              </span>
            </span>
          </label>
        </fieldset>

        {error ? (
          <p className="text-destructive text-xs" role="alert">
            {error}
          </p>
        ) : null}

        {/* Revert-to-trial section — only visible for non-trial rows.
            Operator-facing escape hatch: "I made a mistake on the
            plan / I want to test something". Sits below the main
            picker so it doesn't compete for attention. */}
        {status !== "trial" ? (
          <div className="border-muted-foreground/20 mt-1 rounded-md border border-dashed p-3">
            <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
              {t("revertSectionHeading")}
            </p>
            <p className="text-muted-foreground mt-1.5 text-xs">
              {t("revertSectionHint")}
            </p>
            <button
              type="button"
              onClick={() => setRevertConfirmOpen(true)}
              disabled={pending}
              className="text-primary hover:text-primary/80 mt-2 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-2 hover:underline disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" />
              {t("revertSectionButton")}
            </button>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={pending || choice === null}
          >
            <Check className="size-4" />
            {pending ? t("saving") : t("convertConfirmButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Extend dialog. Shows the current trial_ends_at + three preset
 * buttons that submit immediately on click.
 */
function ExtendDialog({
  open,
  onClose,
  centerId,
  trialEndsAt,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  centerId: string;
  trialEndsAt: string | null;
  locale: string;
}) {
  const t = useTranslations("superAdmin");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const VN_TZ = "Asia/Ho_Chi_Minh";
  const formattedCurrent = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: VN_TZ,
      })
    : null;

  const baseMs = Math.max(
    Date.now(),
    trialEndsAt ? new Date(trialEndsAt).getTime() : 0,
  );
  const projectedFor = (days: number) =>
    new Date(baseMs + days * 24 * 60 * 60 * 1000).toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: VN_TZ,
    });

  function submit(days: number) {
    setError(null);
    setActivePreset(days);
    const fd = new FormData();
    fd.append("id", centerId);
    fd.append("days", String(days));
    startTransition(async () => {
      const res = await extendTrial(fd);
      if (res?.error) {
        setError(res.error);
        setActivePreset(null);
        return;
      }
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("extendDialogTitle")}</DialogTitle>
          <DialogDescription>{t("extendDialogDescription")}</DialogDescription>
        </DialogHeader>

        {formattedCurrent ? (
          <p className="bg-muted/60 text-foreground rounded-md px-3 py-2 text-sm">
            {t("extendCurrentEnd", { date: formattedCurrent })}
          </p>
        ) : null}

        <div className="space-y-2">
          {EXTEND_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => submit(preset)}
              disabled={pending}
              className={
                "flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition " +
                (activePreset === preset && pending
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/60")
              }
            >
              <span className="text-sm font-semibold">
                {t("daysShort", { n: preset })}
              </span>
              <span className="text-muted-foreground text-xs">
                {t("extendNewEnd", { date: projectedFor(preset) })}
              </span>
            </button>
          ))}
        </div>

        {error ? (
          <p className="text-destructive text-xs" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={pending}
          >
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PauseDialog({
  open,
  onClose,
  centerId,
  centerName,
}: {
  open: boolean;
  onClose: () => void;
  centerId: string;
  centerName: string;
}) {
  const t = useTranslations("superAdmin");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    const fd = new FormData();
    fd.append("id", centerId);
    startTransition(async () => {
      const res = await pauseCenter(fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("pauseDialogTitle", { name: centerName })}</DialogTitle>
          <DialogDescription>{t("pauseDialogDescription")}</DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="text-destructive text-xs" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={pending}
          >
            <Pause className="size-4" />
            {pending ? t("saving") : t("pauseConfirmButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({
  open,
  onClose,
  centerId,
  centerName,
}: {
  open: boolean;
  onClose: () => void;
  centerId: string;
  centerName: string;
}) {
  const t = useTranslations("superAdmin");
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const matches = typed.trim() === centerName;

  function submit() {
    if (!matches) return;
    setError(null);
    const fd = new FormData();
    fd.append("id", centerId);
    fd.append("confirm_name", typed.trim());
    startTransition(async () => {
      const res = await cancelCenter(fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      onClose();
      setTyped("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("cancelDialogTitle", { name: centerName })}</DialogTitle>
          <DialogDescription>{t("cancelDialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-foreground text-sm font-medium">
            {t("cancelTypeNameLabel", { name: centerName })}
          </label>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={pending}
            placeholder={centerName}
            autoComplete="off"
            spellCheck={false}
            className={
              "border-input bg-background h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 " +
              (matches
                ? "border-destructive focus:ring-destructive/40"
                : "focus:ring-primary")
            }
          />
        </div>

        {error ? (
          <p className="text-destructive text-xs" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={submit}
            disabled={pending || !matches}
          >
            <XCircle className="size-4" />
            {pending ? t("saving") : t("cancelConfirmButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function planLabelKey(plan: Plan): string {
  return plan === "monthly"
    ? "planMonthly"
    : plan === "six_months"
      ? "planSixMonths"
      : "planAnnual";
}

function planPriceKey(plan: Plan): string {
  return plan === "monthly"
    ? "planMonthlyPrice"
    : plan === "six_months"
      ? "planSixMonthsPrice"
      : "planAnnualPrice";
}
