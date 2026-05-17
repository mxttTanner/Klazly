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
  reactivateCenter,
} from "../../actions";

const PLANS = ["monthly", "six_months", "annual"] as const;
type Plan = (typeof PLANS)[number];

const EXTEND_PRESETS = [7, 14, 30] as const;

/**
 * Operations bar for the super-admin's center detail page.
 *
 *   Convert    trial / expired / past_due  →  active
 *              tier-aware: Founding rows get a single locked-price
 *              confirm; standard rows get the 1mo/6mo/1yr picker.
 *   Extend     trial / expired / past_due  →  trial
 *              shows current trial_ends_at + 3 presets that preview
 *              the new end-date and commit on click.
 *   Pause      trial / active / past_due   →  paused
 *              reversible — billing freezes where it is.
 *   Cancel     trial / active / past_due / paused / expired
 *                                         →  canceled (permanent)
 *              type-name confirmation, stamps cancelled_at. Smaller
 *              + grayer button below Pause, since this should be
 *              the rare permanent case.
 *   Reactivate expired / canceled / paused →  active or trial
 *              tier-aware dialog: founding picks one option,
 *              standard picks a plan, paused-with-unexpired-trial
 *              gets a "resume trial" option.
 *
 * Buttons that don't make sense for the current status are hidden
 * outright rather than disabled.
 */
export function CenterActionsBar({
  centerId,
  centerName,
  status,
  plan,
  planTier,
  trialEndsAt,
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
  foundingCenterNumber: number | null;
  foundingLockedPriceVnd: number | null;
  foundingNextSlot: number | null;
  foundingSlotsRemaining: number;
  foundingCap: number;
  locale: string;
}) {
  const t = useTranslations("superAdmin");

  const [open, setOpen] = useState<
    "convert" | "extend" | "pause" | "cancel" | "reactivate" | null
  >(null);

  const showConvert =
    status === "trial" || status === "expired" || status === "past_due";
  const showExtend =
    status === "trial" || status === "expired" || status === "past_due";
  const showPause =
    status === "trial" || status === "active" || status === "past_due";
  // Cancel: visible for everything except already-canceled rows. Even
  // a paused row may need to be turned into a permanent cancel.
  const showCancel = status !== "canceled";
  const showReactivate =
    status === "expired" || status === "canceled" || status === "paused";

  const isFounding = planTier === "founding";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {showConvert ? (
          <Button
            type="button"
            onClick={() => setOpen("convert")}
            className="bg-emerald-600 text-white hover:bg-emerald-500"
            size="lg"
          >
            <CircleDollarSign className="size-4" />
            {t("actionConvert")}
          </Button>
        ) : null}
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
        {showReactivate ? (
          <Button
            type="button"
            onClick={() => setOpen("reactivate")}
            size="lg"
            className="bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <RotateCcw className="size-4" />
            {t("actionReactivate")}
          </Button>
        ) : null}
        {showPause ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen("pause")}
            size="lg"
            className="border-indigo-200 text-indigo-800 hover:bg-indigo-50"
          >
            <Pause className="size-4" />
            {t("actionPause")}
          </Button>
        ) : null}
      </div>

      {/* Cancel is intentionally below the primary row + visually
          softer — permanent archive should be a deliberate choice,
          not the next button after Pause. */}
      {showCancel ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setOpen("cancel")}
            className="text-muted-foreground hover:text-rose-700 text-xs underline-offset-2 hover:underline"
          >
            {t("actionCancel")}
          </button>
        </div>
      ) : null}

      <ConvertDialog
        open={open === "convert"}
        onClose={() => setOpen(null)}
        centerId={centerId}
        centerName={centerName}
        isFounding={isFounding}
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
      <ReactivateDialog
        open={open === "reactivate"}
        onClose={() => setOpen(null)}
        centerId={centerId}
        isFounding={isFounding}
        priorPlan={plan}
        trialEndsAt={trialEndsAt}
        foundingCenterNumber={foundingCenterNumber}
        foundingLockedPriceVnd={foundingLockedPriceVnd}
        locale={locale}
      />
    </>
  );
}

/**
 * Convert dialog. Unified UI: always shows all 4 plan options
 * regardless of the center's current plan_tier. The Founding option
 * is grouped under a separator so the standard plans read as the
 * default offer and Founding feels intentional.
 *
 *   ○ 1 month       (1.2M / month)
 *   ○ 6 months      (5.4M / 6 mo)
 *   ○ 1 year        (9.9M / year)
 *   ─── Founding Center program (limited slots) ───
 *   ○ Founding      (₫600K / month, locked) · next slot #N · M left
 *
 * - Founding option auto-selects if the center is already
 *   plan_tier='founding'; otherwise the dialog opens with no
 *   selection (Confirm disabled).
 * - Founding option disables when all slots are taken.
 * - Confirm submits the picked choice; the server action handles
 *   the actual tier + slot bookkeeping (including downgrading off
 *   founding when a standard plan is picked).
 */
type ConvertChoice = Plan | "founding";

function ConvertDialog({
  open,
  onClose,
  centerId,
  centerName,
  isFounding,
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
  isFounding: boolean;
  foundingCenterNumber: number | null;
  foundingLockedPriceVnd: number | null;
  /** Lowest unused founding slot in [1..cap], or null if all taken. */
  foundingNextSlot: number | null;
  /** cap - taken.length (≥0). */
  foundingSlotsRemaining: number;
  foundingCap: number;
  locale: string;
}) {
  const t = useTranslations("superAdmin");

  // Default selection rule:
  //   - already plan_tier='founding' (with or without an assigned slot)
  //     → preselect 'founding'
  //   - otherwise → no selection (Confirm disabled until operator picks)
  const initialChoice: ConvertChoice | null = isFounding ? "founding" : null;
  const [choice, setChoice] = useState<ConvertChoice | null>(initialChoice);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Re-sync the default when the dialog re-opens against a different
  // center (rare in practice — the actions bar passes one centerId —
  // but keeps the selection coherent if the parent re-renders with
  // new props between opens).
  useEffect(() => {
    if (open) {
      setChoice(isFounding ? "founding" : null);
      setError(null);
    }
  }, [open, isFounding]);

  const lockedPrice = foundingLockedPriceVnd ?? 600_000;
  const formattedLockedPrice = new Intl.NumberFormat(locale).format(
    lockedPrice,
  );

  // Founding option is disabled when all slots are taken AND the
  // center isn't already founding (an already-founding center keeps
  // its existing slot — no fresh assignment needed).
  const foundingDisabled = !isFounding && foundingNextSlot === null;

  // Slot meta line under the Founding option:
  //   - already founding with slot #N    → "Currently slot #N — keep it"
  //   - already founding without slot    → "Slot will be assigned"
  //   - new founding, slot available     → "Next available slot: #N · M of CAP remaining"
  //   - new founding, all taken          → "All CAP Founding slots are taken"
  let foundingMeta: string;
  if (isFounding && foundingCenterNumber !== null && foundingCenterNumber > 0) {
    foundingMeta = t("convertFoundingMetaCurrentSlot", {
      n: foundingCenterNumber,
    });
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

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("convertDialogTitleNamed", { name: centerName })}
          </DialogTitle>
          <DialogDescription>{t("convertDialogDescription")}</DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-2.5" disabled={pending}>
          <legend className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {t("planLabel")}
          </legend>

          {/* Three standard plans — radios. */}
          {PLANS.map((p) => (
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
              </span>
              <span className="text-muted-foreground text-xs">
                {t(planPriceKey(p) as Parameters<typeof t>[0])}
              </span>
            </label>
          ))}

          {/* Separator + Founding option. Visually grouped under a
              soft label so the standard plans read as the default
              offer and Founding feels deliberate. */}
          <div className="text-muted-foreground my-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider">
            <span className="bg-muted-foreground/20 h-px flex-1" />
            <span>{t("convertFoundingSeparator")}</span>
            <span className="bg-muted-foreground/20 h-px flex-1" />
          </div>

          <label
            className={
              "flex items-center justify-between gap-3 rounded-lg border-2 px-3.5 py-2.5 transition " +
              (foundingDisabled
                ? "cursor-not-allowed border-muted bg-muted/30 opacity-60"
                : choice === "founding"
                  ? "border-amber-400 bg-amber-50/40 cursor-pointer"
                  : "border-amber-200 hover:bg-amber-50/40 cursor-pointer")
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
                className="mt-0.5 size-4 accent-amber-600"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
                  <Sparkles className="size-3.5 text-amber-700" />
                  {t("convertFoundingOptionTitle")}
                </span>
                <span className="text-amber-900/80 mt-0.5 block text-xs">
                  {t("convertFoundingOptionPrice", {
                    price: formattedLockedPrice,
                  })}
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

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={pending || choice === null}
            className="bg-emerald-600 text-white hover:bg-emerald-500"
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
 * buttons that submit immediately on click. Custom-days input is
 * removed (per spec) since presets cover every real case.
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

/**
 * Pause dialog. Reversible — center loses access until reactivated,
 * billing freezes where it is. Friendlier than the old "Lock" copy.
 */
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
            className="bg-indigo-600 text-white hover:bg-indigo-500"
          >
            <Pause className="size-4" />
            {pending ? t("saving") : t("pauseConfirmButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Cancel dialog. Permanent archive. Two-step type-name confirmation
 * — Confirm stays disabled until the operator has typed the center
 * name exactly as it appears. Server enforces the match too.
 */
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
                ? "border-rose-400 focus:ring-rose-300"
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

/**
 * Tier-aware Reactivate dialog. Three modes the operator picks:
 *
 *   founding_active  →  resume as Active Founding @ locked price
 *   standard_active  →  resume as Active on monthly/6mo/yearly
 *   resume_trial     →  flip back to trial, leave trial_ends_at
 *                       untouched (the unexpired trial continues
 *                       from where it stopped).
 *
 * For founding rows we only offer founding_active. For standard
 * rows we offer the plan picker and, when trial_ends_at is in the
 * future, also offer resume_trial as a secondary option.
 */
function ReactivateDialog({
  open,
  onClose,
  centerId,
  isFounding,
  priorPlan,
  trialEndsAt,
  foundingCenterNumber,
  foundingLockedPriceVnd,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  centerId: string;
  isFounding: boolean;
  priorPlan: string | null;
  trialEndsAt: string | null;
  foundingCenterNumber: number | null;
  foundingLockedPriceVnd: number | null;
  locale: string;
}) {
  const t = useTranslations("superAdmin");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const defaultStandardPlan: Plan = (priorPlan as Plan) ?? "monthly";
  const [chosenPlan, setChosenPlan] = useState<Plan>(defaultStandardPlan);

  const trialStillValid =
    trialEndsAt !== null && new Date(trialEndsAt).getTime() > Date.now();

  const lockedPrice = foundingLockedPriceVnd ?? 600_000;
  const formattedLockedPrice = new Intl.NumberFormat(locale).format(
    lockedPrice,
  );

  function submitFounding() {
    setError(null);
    const fd = new FormData();
    fd.append("id", centerId);
    fd.append("mode", "founding_active");
    startTransition(async () => {
      const res = await reactivateCenter(fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  function submitStandard(plan: Plan) {
    setError(null);
    const fd = new FormData();
    fd.append("id", centerId);
    fd.append("mode", "standard_active");
    fd.append("plan", plan);
    startTransition(async () => {
      const res = await reactivateCenter(fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  function submitResumeTrial() {
    setError(null);
    const fd = new FormData();
    fd.append("id", centerId);
    fd.append("mode", "resume_trial");
    startTransition(async () => {
      const res = await reactivateCenter(fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  if (isFounding) {
    return (
      <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reactivateFoundingTitle")}</DialogTitle>
            <DialogDescription>
              {t("reactivateFoundingDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="border-emerald-300 bg-emerald-50/40 rounded-lg border-2 p-4">
            <div className="flex items-start gap-3">
              <span className="bg-emerald-100 text-emerald-700 ring-emerald-200 inline-flex size-10 shrink-0 items-center justify-center rounded-full ring-1">
                <Sparkles className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-emerald-900 text-sm font-semibold">
                  {t("convertFoundingHeadline", { price: formattedLockedPrice })}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {t("convertFoundingSubhead", {
                    n: foundingCenterNumber ?? 0,
                  })}
                </p>
              </div>
            </div>
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
              onClick={submitFounding}
              disabled={pending}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <RotateCcw className="size-4" />
              {pending ? t("saving") : t("reactivateFoundingConfirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Standard path — plan picker, plus optional "resume trial" if
  // the trial date is still in the future.
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("reactivateStandardTitle")}</DialogTitle>
          <DialogDescription>
            {t("reactivateStandardDescription")}
          </DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-2.5" disabled={pending}>
          <legend className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {t("planLabel")}
          </legend>
          {PLANS.map((p) => (
            <label
              key={p}
              className={
                "flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 transition " +
                (chosenPlan === p
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/40")
              }
            >
              <span className="flex items-center gap-2.5 text-sm font-medium">
                <input
                  type="radio"
                  name="reactivate-plan"
                  value={p}
                  checked={chosenPlan === p}
                  onChange={() => setChosenPlan(p)}
                  className="size-4 accent-primary"
                />
                {t(planLabelKey(p) as Parameters<typeof t>[0])}
              </span>
              <span className="text-muted-foreground text-xs">
                {t(planPriceKey(p) as Parameters<typeof t>[0])}
              </span>
            </label>
          ))}
        </fieldset>

        {trialStillValid ? (
          <div className="border-muted-foreground/20 mt-1 rounded-md border border-dashed p-3 text-xs">
            <p className="text-muted-foreground">
              {t("reactivateResumeTrialHint")}
            </p>
            <button
              type="button"
              onClick={submitResumeTrial}
              disabled={pending}
              className="text-primary hover:text-primary/80 mt-2 text-sm font-medium underline-offset-2 hover:underline"
            >
              {t("reactivateResumeTrialButton")}
            </button>
          </div>
        ) : null}

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
            onClick={() => submitStandard(chosenPlan)}
            disabled={pending}
            className="bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <RotateCcw className="size-4" />
            {pending ? t("saving") : t("reactivateStandardConfirmButton")}
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
