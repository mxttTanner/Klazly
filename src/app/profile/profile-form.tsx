"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { updateMyProfile } from "./actions";

const initialState: { error?: string; success?: string } = {};

export function ProfileForm({
  defaults,
}: {
  defaults: { email: string | null; phone: string | null };
}) {
  const tp = useTranslations("profile");
  const tt = useTranslations("admin.teachers");
  const tco = useTranslations("contact");
  const [state, action] = useFormState(updateMyProfile, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4 rounded-xl border bg-card p-6 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile_email">{tt("email")}</Label>
          <Input
            id="profile_email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={defaults.email ?? ""}
            placeholder="ban@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile_phone">{tco("phoneLabel")}</Label>
          <Input
            id="profile_phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            defaultValue={defaults.phone ?? ""}
            placeholder="0901 234 567"
          />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">{tco("oneRequired")}</p>
      <div className="flex items-center gap-3">
        <SubmitButton idleLabel={tp("save")} pendingLabel={tp("saving")} />
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
