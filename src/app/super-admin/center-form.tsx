"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { Building2, UserPlus, Sparkles, Compass } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
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
  "trial_founding",
  "active_monthly",
  "active_six_months",
  "active_annual",
  "active_founding",
  "active_design_partner",
] as const;

const SOURCE_OPTIONS = [
  "zalo_cold",
  "in_person",
  "referral",
  "landing_cta",
  "other",
] as const;

export function CenterForm() {
  const t = useTranslations("superAdmin");
  const tco = useTranslations("contact");
  const [state, action] = useFormState(createCenter, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [planType, setPlanType] = useState<(typeof PLAN_OPTIONS)[number]>(
    "trial_founding",
  );
  const [source, setSource] = useState<(typeof SOURCE_OPTIONS)[number]>(
    "zalo_cold",
  );

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  // Free-text follow-up shown only when a source needs context.
  const sourceNeedsNote =
    source === "referral" || source === "other";

  return (
    <form ref={formRef} action={action} className="space-y-6">
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
            onChange={(e) =>
              setPlanType(e.target.value as (typeof PLAN_OPTIONS)[number])
            }
            className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
          >
            {PLAN_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {t(`planType_${p}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-xs">
            {t("planTypeHint")}
          </p>
        </div>

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
          <div className="space-y-2">
            <Label htmlFor="admin_email">
              {t("adminEmail")}{" "}
              <span className="text-muted-foreground text-xs font-normal">
                {tco("orPhoneHint")}
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
          <div className="space-y-2">
            <Label htmlFor="admin_phone">{tco("phoneLabel")}</Label>
            <Input
              id="admin_phone"
              name="admin_phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="0901 234 567"
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">{tco("oneRequired")}</p>
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
  );
}
