"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { createCenter } from "./actions";

const initialState: { error?: string; success?: string } = {};

export function CenterForm() {
  const t = useTranslations("superAdmin");
  const [state, action] = useFormState(createCenter, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4 rounded-lg border p-6"
    >
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="admin_full_name">{t("adminName")}</Label>
          <Input id="admin_full_name" name="admin_full_name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin_email">{t("adminEmail")}</Label>
          <Input
            id="admin_email"
            name="admin_email"
            type="email"
            required
          />
        </div>
      </div>

      <div className="space-y-2 sm:max-w-md">
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

      <div className="pt-2">
        <SubmitButton
          idleLabel={t("submit")}
          pendingLabel={t("submitting")}
        />
      </div>

      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-600">{state.success}</p>
      ) : null}
    </form>
  );
}
