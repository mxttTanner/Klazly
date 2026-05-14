"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { Building2, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { createCenter } from "./actions";

const initialState: { error?: string; success?: string } = {};

export function CenterForm() {
  const t = useTranslations("superAdmin");
  const tco = useTranslations("contact");
  const [state, action] = useFormState(createCenter, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

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
              placeholder="+84 ..."
            />
          </div>
        </div>
        <div className="space-y-2 sm:max-w-md">
          <Label htmlFor="subscription_plan">{t("planLabel")}</Label>
          <select
            id="subscription_plan"
            name="subscription_plan"
            defaultValue=""
            className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
          >
            <option value="">{t("planNone")}</option>
            <option value="monthly">{t("planMonthly")}</option>
            <option value="six_months">{t("planSixMonths")}</option>
            <option value="annual">{t("planAnnual")}</option>
          </select>
          <p className="text-muted-foreground text-xs">{t("planHint")}</p>
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
    </form>
  );
}
