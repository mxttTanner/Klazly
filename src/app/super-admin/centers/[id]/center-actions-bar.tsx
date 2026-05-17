"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarPlus,
  Check,
  CircleDollarSign,
  Lock,
  RotateCcw,
  Sparkles,
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
  convertCenterToPaid,
  extendTrial,
  updateSubscriptionStatus,
} from "../../actions";

const PLANS = ["monthly", "six_months", "annual"] as const;
type Plan = (typeof PLANS)[number];

const EXTEND_PRESETS = [7, 14, 30] as const;

/**
 * Operations bar for the super-admin's center detail page. Each button
 * opens a context-aware dialog:
 *
 *   Convert    trial / expired   →  active
 *              tier-aware: Founding rows get a single-option confirm
 *              ("₫600K/mo locked"); standard rows get the 1mo / 6mo /
 *              1yr picker.
 *   Extend     trial / expired   →  trial
 *              shows current trial_ends_at, +7 / +14 / +30 preset only.
 *   Lock       trial / active    →  expired
 *   Reactivate expired/canceled  →  trial (7-day courtesy)
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
  locale: string;
}) {
  const t = useTranslations("superAdmin");

  const [open, setOpen] = useState<
    "convert" | "extend" | "lock" | "reactivate" | null
  >(null);

  const showConvert =
    status === "trial" || status === "expired" || status === "past_due";
  const showExtend =
    status === "trial" || status === "expired" || status === "past_due";
  const showLock = status === "trial" || status === "active" || status === "past_due";
  const showReactivate = status === "expired" || status === "canceled";

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
            variant="outline"
            onClick={() => setOpen("reactivate")}
            size="lg"
          >
            <RotateCcw className="size-4" />
            {t("actionReactivate")}
          </Button>
        ) : null}
        {showLock ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setOpen("lock")}
            size="lg"
          >
            <Lock className="size-4" />
            {t("actionLock")}
          </Button>
        ) : null}
      </div>

      <ConvertDialog
        open={open === "convert"}
        onClose={() => setOpen(null)}
        centerId={centerId}
        currentPlan={plan}
        isFounding={isFounding}
        foundingCenterNumber={foundingCenterNumber}
        foundingLockedPriceVnd={foundingLockedPriceVnd}
        locale={locale}
      />
      <ExtendDialog
        open={open === "extend"}
        onClose={() => setOpen(null)}
        centerId={centerId}
        trialEndsAt={trialEndsAt}
        locale={locale}
      />
      <LockDialog
        open={open === "lock"}
        onClose={() => setOpen(null)}
        centerId={centerId}
        centerName={centerName}
      />
      <ReactivateDialog
        open={open === "reactivate"}
        onClose={() => setOpen(null)}
        centerId={centerId}
      />
    </>
  );
}

/**
 * Convert dialog. Branches on plan_tier:
 *
 *   plan_tier='founding'  →  single locked-price confirm (no picker).
 *                            "Convert to Founding subscription · ₫{X}/mo
 *                             locked as Founding Center #{N}"
 *   anything else         →  the three-plan picker.
 */
function ConvertDialog({
  open,
  onClose,
  centerId,
  currentPlan,
  isFounding,
  foundingCenterNumber,
  foundingLockedPriceVnd,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  centerId: string;
  currentPlan: string | null;
  isFounding: boolean;
  foundingCenterNumber: number | null;
  foundingLockedPriceVnd: number | null;
  locale: string;
}) {
  const t = useTranslations("superAdmin");
  const defaultPlan: Plan = (currentPlan as Plan) ?? "monthly";
  const [plan, setPlan] = useState<Plan>(defaultPlan);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Founding price fallback: if the slot migration is missing, default
  // to the canonical ₫600K so the operator can still convert. The
  // server action's audit log will record locked_price_vnd=null in
  // that edge case so it's visible later.
  const lockedPrice = foundingLockedPriceVnd ?? 600_000;
  const formattedLockedPrice = new Intl.NumberFormat(locale).format(
    lockedPrice,
  );

  function submit(choice: Plan | "founding") {
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

  if (isFounding) {
    return (
      <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("convertFoundingDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("convertFoundingDialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="border-emerald-300 bg-emerald-50/40 rounded-lg border-2 p-4">
            <div className="flex items-start gap-3">
              <span className="bg-emerald-100 text-emerald-700 ring-emerald-200 inline-flex size-10 shrink-0 items-center justify-center rounded-full ring-1">
                <Sparkles className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-emerald-900 text-sm font-semibold">
                  {t("convertFoundingHeadline", {
                    price: formattedLockedPrice,
                  })}
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
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => submit("founding")}
              disabled={pending}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <Check className="size-4" />
              {pending ? t("saving") : t("convertFoundingConfirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Standard tier — the three-plan picker.
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("convertDialogTitle")}</DialogTitle>
          <DialogDescription>{t("convertDialogDescription")}</DialogDescription>
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
                (plan === p
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/40")
              }
            >
              <span className="flex items-center gap-2.5 text-sm font-medium">
                <input
                  type="radio"
                  name="plan"
                  value={p}
                  checked={plan === p}
                  onChange={() => setPlan(p)}
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
            onClick={() => submit(plan)}
            disabled={pending}
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
 * Extend dialog. Shows the current trial_ends_at prominently so the
 * operator can see what they're extending, then a +7 / +14 / +30
 * picker that submits immediately on click. Custom-days input was
 * removed (per spec) since the three presets cover every real case
 * and a free-text input adds typo risk.
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

  // Project the new end date for each preset so the operator sees the
  // resulting calendar date next to each "+N days" button (no surprises
  // and confirms the operator's mental math).
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

function LockDialog({
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
    fd.append("status", "expired");
    startTransition(async () => {
      const res = await updateSubscriptionStatus(fd);
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
          <DialogTitle>{t("lockDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("lockDialogDescriptionNamed", { name: centerName })}
          </DialogDescription>
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
            variant="destructive"
            onClick={submit}
            disabled={pending}
          >
            <Lock className="size-4" />
            {pending ? t("saving") : t("lockConfirmButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReactivateDialog({
  open,
  onClose,
  centerId,
}: {
  open: boolean;
  onClose: () => void;
  centerId: string;
}) {
  const t = useTranslations("superAdmin");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Reactivation is implemented as a 7-day extension: that flips the
  // status back to 'trial' and gives the super-admin a courtesy window
  // to message the customer and close the conversion. If a longer
  // window is needed, they can run Extend again from the unlocked
  // state.
  function submit() {
    setError(null);
    const fd = new FormData();
    fd.append("id", centerId);
    fd.append("days", "7");
    startTransition(async () => {
      const res = await extendTrial(fd);
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
          <DialogTitle>{t("reactivateDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("reactivateDialogDescription")}
          </DialogDescription>
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
          <Button type="button" onClick={submit} disabled={pending}>
            <RotateCcw className="size-4" />
            {pending ? t("saving") : t("reactivateConfirmButton")}
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
