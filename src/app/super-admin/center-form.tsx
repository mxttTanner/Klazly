"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import {
  Building2,
  UserPlus,
  Sparkles,
  Compass,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createCenter } from "./actions";

const initialState: { error?: string; success?: string } = {};

/**
 * Composite plan-type values. Each maps to a tuple
 *   (subscription_status, subscription_plan, plan_tier, trial_days)
 * which the server action decomposes on save. Keeping the seven user-
 * facing options behind a single dropdown matches the way I describe
 * the offers to a center owner over Zalo — "trial or paid? if paid,
 * which length? founding rate or standard?" — rather than asking
 * them three separate questions.
 */
const PLAN_OPTIONS = [
  // Default: vanilla 30-day standard trial — listed first so the
  // dropdown opens on the safest non-committal option. The founding
  // slot panel is hidden for this choice (isFounding=false below).
  "trial_standard",
  "trial_founding",
  "active_monthly",
  "active_six_months",
  "active_annual",
  "active_founding",
  "active_design_partner",
] as const;

type PlanOption = (typeof PLAN_OPTIONS)[number];

/** Plans whose plan_tier decomposes to 'founding'. Must stay in sync
 *  with PLAN_TYPE_DECOMPOSITION in actions.ts. */
const FOUNDING_PLAN_OPTIONS = new Set<PlanOption>([
  "trial_founding",
  "active_founding",
]);

const SOURCE_OPTIONS = [
  "zalo_cold",
  "in_person",
  "referral",
  "landing_cta",
  "other",
] as const;

export function CenterForm({
  foundingCap,
  foundingSlotsTaken,
  foundingNextSlot,
}: {
  foundingCap: number;
  foundingSlotsTaken: number[];
  foundingNextSlot: number | null;
}) {
  const t = useTranslations("superAdmin");
  const tco = useTranslations("contact");
  const [state, action] = useFormState(createCenter, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  // One-shot flag: actuallySubmit() sets this true so the next
  // handleFormSubmit pass lets the default submit run (firing the
  // useFormState action) instead of re-opening the confirm modal.
  const skipInterceptRef = useRef(false);
  const [planType, setPlanType] = useState<PlanOption>("trial_standard");
  const [source, setSource] = useState<(typeof SOURCE_OPTIONS)[number]>(
    "zalo_cold",
  );
  // Slot number is pre-filled with the lowest available; operator can
  // override (e.g. they reserved slot 3 for a specific customer).
  const [slot, setSlot] = useState<string>(
    foundingNextSlot !== null ? String(foundingNextSlot) : "",
  );
  // Override checkbox — required to submit a founding plan when all
  // slots are taken (foundingNextSlot === null). Forces the operator
  // to make a deliberate choice about exceeding the cap.
  const [overrideCap, setOverrideCap] = useState(false);
  // Confirmation modal state — captures the values at submit time so
  // the actual <form action> fires on confirm.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<{
    centerName: string;
  } | null>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setPlanType("trial_standard");
      setSource("zalo_cold");
      setSlot(foundingNextSlot !== null ? String(foundingNextSlot) : "");
      setOverrideCap(false);
    }
  }, [state.success, foundingNextSlot]);

  const isFounding = FOUNDING_PLAN_OPTIONS.has(planType);
  const allSlotsTaken = isFounding && foundingNextSlot === null;
  const slotNum = Number(slot);
  const slotIsTaken =
    isFounding &&
    Number.isFinite(slotNum) &&
    slotNum > 0 &&
    foundingSlotsTaken.includes(slotNum);

  // Free-text follow-up shown only when a source needs context.
  const sourceNeedsNote = source === "referral" || source === "other";

  // Intercept the native form submit so we can show the confirmation
  // modal first — unless skipInterceptRef is set, in which case the
  // confirmation already happened and we let the default useFormState
  // action fire.
  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (skipInterceptRef.current) {
      skipInterceptRef.current = false;
      return; // default action runs → useFormState calls createCenter
    }
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const centerName = String(fd.get("center_name") ?? "").trim();
    if (!centerName) return; // browser-required already caught this
    setPendingSubmit({ centerName });
    setConfirmOpen(true);
  }

  function actuallySubmit() {
    setConfirmOpen(false);
    setPendingSubmit(null);
    skipInterceptRef.current = true;
    formRef.current?.requestSubmit();
  }

  // submitDisabledReason: why the Confirm button shouldn't fire.
  // Returns null when the form is ready to submit.
  const submitDisabledReason: string | null = isFounding
    ? allSlotsTaken && !overrideCap
      ? t("foundingAllSlotsTakenError", { cap: foundingCap })
      : slotIsTaken
        ? t("foundingSlotTakenError", { n: slotNum })
        : null
    : null;

  return (
    <>
      <form
        ref={formRef}
        action={action}
        onSubmit={handleFormSubmit}
        className="space-y-6"
      >
        <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Building2 className="text-muted-foreground size-4" />
            <h3 className="text-sm font-medium">{t("centerInfoSection")}</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="center_name">{t("centerName")}</Label>
              <Input id="center_name" name="center_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">{t("contactPhone")}</Label>
              <Input
                id="contact_phone"
                name="contact_phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="+84 ..."
              />
            </div>
          </div>

          <div className="space-y-2 sm:max-w-md">
            <Label htmlFor="plan_type">{t("planTypeLabel")}</Label>
            <select
              id="plan_type"
              name="plan_type"
              value={planType}
              onChange={(e) => setPlanType(e.target.value as PlanOption)}
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {t(`planType_${p}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground text-xs">{t("planTypeHint")}</p>
          </div>

          {/* Founding slot picker — visible only when a founding plan
              is selected. Pre-filled with the lowest available slot;
              operator can override (e.g. reserve a specific number).
              The override checkbox unlocks submission past the cap. */}
          {isFounding ? (
            <div className="border-amber-300 bg-amber-50/40 space-y-3 rounded-lg border p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="text-amber-700 mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-amber-900 text-sm font-semibold">
                    {t("foundingSlotPanelTitle")}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t("foundingSlotPanelHint", {
                      filled: foundingSlotsTaken.length,
                      cap: foundingCap,
                    })}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="founding_center_number">
                    {t("foundingSlotLabel")}
                  </Label>
                  <input
                    id="founding_center_number"
                    name="founding_center_number"
                    type="number"
                    min={1}
                    max={Math.max(foundingCap, foundingSlotsTaken.length + 1)}
                    value={slot}
                    onChange={(e) => setSlot(e.target.value)}
                    disabled={allSlotsTaken && !overrideCap}
                    placeholder={
                      foundingNextSlot !== null
                        ? String(foundingNextSlot)
                        : "—"
                    }
                    className="border-input bg-background h-9 w-24 rounded-md border px-2.5 text-sm tabular-nums"
                  />
                </div>

                {foundingSlotsTaken.length > 0 ? (
                  <p className="text-muted-foreground self-center text-xs">
                    {t("foundingSlotsTakenHint", {
                      slots: foundingSlotsTaken
                        .map((n) => `#${n}`)
                        .join(", "),
                    })}
                  </p>
                ) : null}
              </div>

              {allSlotsTaken ? (
                <label className="text-amber-900 mt-1 inline-flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={overrideCap}
                    onChange={(e) => setOverrideCap(e.target.checked)}
                    className="mt-0.5 size-3.5 accent-amber-600"
                  />
                  <span>
                    {t("foundingOverrideLabel", { cap: foundingCap })}
                  </span>
                </label>
              ) : null}

              {slotIsTaken ? (
                <p className="text-rose-700 inline-flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="size-3" />
                  {t("foundingSlotTakenInlineWarn", { n: slotNum })}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="signup_source">
                <span className="inline-flex items-center gap-1.5">
                  <Compass className="text-muted-foreground size-3.5" />
                  {t("sourceLabel")}
                </span>
              </Label>
              <select
                id="signup_source"
                name="signup_source"
                value={source}
                onChange={(e) =>
                  setSource(e.target.value as (typeof SOURCE_OPTIONS)[number])
                }
                className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              >
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {t(`source_${s}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </div>
            {sourceNeedsNote ? (
              <div className="space-y-2">
                <Label htmlFor="referral_note">
                  {source === "referral"
                    ? t("referralWhoLabel")
                    : t("sourceOtherLabel")}
                </Label>
                <Input
                  id="referral_note"
                  name="referral_note"
                  placeholder={
                    source === "referral"
                      ? t("referralWhoPlaceholder")
                      : t("sourceOtherPlaceholder")
                  }
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <UserPlus className="text-muted-foreground size-4" />
            <h3 className="text-sm font-medium">{t("adminInfoSection")}</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admin_full_name">{t("adminName")}</Label>
              <Input id="admin_full_name" name="admin_full_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin_password">{t("adminPassword")}</Label>
              <Input
                id="admin_password"
                name="admin_password"
                type="text"
                minLength={8}
                required
                placeholder={t("adminPasswordPlaceholder")}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Phone first — primary identifier for the admin we're
                creating. Email is optional and only validated when
                non-empty. See parent-form.tsx for the why. */}
            <div className="space-y-2">
              <Label htmlFor="admin_phone">{tco("phoneLabel")}</Label>
              <Input
                id="admin_phone"
                name="admin_phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                required
                placeholder="0901 234 567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin_email">
                {t("adminEmail")}{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  {tco("optionalHint")}
                </span>
              </Label>
              <Input
                id="admin_email"
                name="admin_email"
                type="email"
                autoComplete="email"
                placeholder="ban@example.com"
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">{tco("phoneRequired")}</p>
        </div>

        <div className="flex items-center gap-3">
          <SubmitButton
            idleLabel={t("submit")}
            pendingLabel={t("submitting")}
          />
          {state.error ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-emerald-600">{state.success}</p>
          ) : null}
        </div>

        <p className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]">
          <Sparkles className="size-3 text-amber-500" />
          {t("foundingFootnote")}
        </p>
      </form>

      {/* Confirmation modal — surfaces before the server action fires
          so an accidental wrong-plan click doesn't end up as another
          "Mỹ Hảo set to trial_30_days instead of Founding" incident. */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(o) => (o ? null : setConfirmOpen(false))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("createConfirmDescription", {
                name: pendingSubmit?.centerName ?? "",
                plan: t(`planType_${planType}` as Parameters<typeof t>[0]),
              })}
            </DialogDescription>
          </DialogHeader>

          {isFounding && slot ? (
            <p className="text-foreground bg-amber-50 ring-amber-200 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ring-1">
              <Sparkles className="text-amber-700 size-3.5" />
              {t("createConfirmFoundingSlot", { n: slotNum })}
            </p>
          ) : null}

          {submitDisabledReason ? (
            <p className="text-rose-700 bg-rose-50 ring-rose-200 inline-flex items-start gap-1.5 rounded-md px-3 py-2 text-sm ring-1">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {submitDisabledReason}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={actuallySubmit}
              disabled={submitDisabledReason !== null}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <Check className="size-4" />
              {t("createConfirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
