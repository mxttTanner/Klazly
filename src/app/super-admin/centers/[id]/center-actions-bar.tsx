"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarPlus,
  Check,
  CircleDollarSign,
  Lock,
  RotateCcw,
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
 * Four-action operations bar for the super-admin's center detail
 * page. The four operations cover the conversion funnel and the
 * pause/unpause lifecycle:
 *
 *   Convert    trial / expired  → active   (picks a plan)
 *   Extend     trial / expired  → trial    (pushes trial_ends_at out)
 *   Lock       trial / active   → expired  (revokes access immediately)
 *   Reactivate expired/canceled → trial    (7-day courtesy trial)
 *
 * Buttons that don't make sense for the current status are hidden
 * outright rather than disabled — a button you can't use just adds
 * noise to a decision UI.
 */
export function CenterActionsBar({
  centerId,
  status,
  plan,
}: {
  centerId: string;
  status: string;
  plan: string | null;
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
      />
      <ExtendDialog
        open={open === "extend"}
        onClose={() => setOpen(null)}
        centerId={centerId}
      />
      <LockDialog
        open={open === "lock"}
        onClose={() => setOpen(null)}
        centerId={centerId}
      />
      <ReactivateDialog
        open={open === "reactivate"}
        onClose={() => setOpen(null)}
        centerId={centerId}
      />
    </>
  );
}

function ConvertDialog({
  open,
  onClose,
  centerId,
  currentPlan,
}: {
  open: boolean;
  onClose: () => void;
  centerId: string;
  currentPlan: string | null;
}) {
  const t = useTranslations("superAdmin");
  const defaultPlan: Plan = (currentPlan as Plan) ?? "monthly";
  const [plan, setPlan] = useState<Plan>(defaultPlan);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    const fd = new FormData();
    fd.append("id", centerId);
    fd.append("plan", plan);
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
            onClick={submit}
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

function ExtendDialog({
  open,
  onClose,
  centerId,
}: {
  open: boolean;
  onClose: () => void;
  centerId: string;
}) {
  const t = useTranslations("superAdmin");
  const [days, setDays] = useState<number>(14);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    const fd = new FormData();
    fd.append("id", centerId);
    fd.append("days", String(days));
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
          <DialogTitle>{t("extendDialogTitle")}</DialogTitle>
          <DialogDescription>{t("extendDialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {EXTEND_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDays(preset)}
                disabled={pending}
                className={
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition " +
                  (days === preset
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted/60")
                }
              >
                {t("daysShort", { n: preset })}
              </button>
            ))}
          </div>
          <div>
            <label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {t("extendCustomLabel")}
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(e) =>
                setDays(Math.max(1, Math.min(90, Number(e.target.value) || 0)))
              }
              disabled={pending}
              className="border-input bg-background mt-1 h-9 w-32 rounded-md border px-2.5 text-sm"
            />
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
          <Button type="button" onClick={submit} disabled={pending}>
            <Check className="size-4" />
            {pending
              ? t("saving")
              : t("extendConfirmButton", { n: days })}
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
}: {
  open: boolean;
  onClose: () => void;
  centerId: string;
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
          <DialogDescription>{t("lockDialogDescription")}</DialogDescription>
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
