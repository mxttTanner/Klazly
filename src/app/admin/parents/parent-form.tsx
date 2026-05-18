"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { inviteParent } from "./actions";

const initialState: { error?: string; success?: string } = {};

/**
 * Phone-first parent invite form. In Vietnam, parents reach us via
 * Zalo (which is phone-keyed) so the phone number is the primary
 * identifier. Email is optional and only validated when the field
 * is non-empty.
 *
 * The previous design combined the two into one "Email (or phone)"
 * field that used HTML5 type="email" validation — typing a phone
 * number into it triggered the browser's "needs an @" message.
 */
export function ParentForm() {
  const t = useTranslations("admin.parents");
  const tt = useTranslations("admin.teachers");
  const tco = useTranslations("contact");
  const [state, action] = useFormState(inviteParent, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={action}
      className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <div className="space-y-2 lg:col-span-1">
        <Label htmlFor="parent_full_name">{tt("fullName")}</Label>
        <Input id="parent_full_name" name="full_name" required />
      </div>
      {/* Phone: required primary identifier. Comes BEFORE email. */}
      <div className="space-y-2 lg:col-span-1">
        <Label htmlFor="parent_phone">{tco("phoneLabel")}</Label>
        <Input
          id="parent_phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          required
          placeholder="0901 234 567"
        />
      </div>
      {/* Email: truly optional. type="email" still inlines @-validation
          on submit, but only when the field is non-empty — so a blank
          submission won't trip the browser's "needs an @" message. */}
      <div className="space-y-2 lg:col-span-1">
        <Label htmlFor="parent_email">
          {tt("email")}{" "}
          <span className="text-muted-foreground text-xs font-normal">
            {tco("optionalHint")}
          </span>
        </Label>
        <Input
          id="parent_email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="ban@example.com"
        />
      </div>
      <div className="space-y-2 lg:col-span-1">
        <Label htmlFor="parent_password">{tt("initialPassword")}</Label>
        <Input
          id="parent_password"
          name="password"
          type="text"
          minLength={8}
          required
          placeholder={tt("passwordPlaceholder")}
        />
      </div>
      <div className="flex items-end lg:col-span-1">
        <SubmitButton
          idleLabel={t("submit")}
          pendingLabel={t("submitting")}
          className="w-full"
        />
      </div>
      <p className="text-muted-foreground sm:col-span-2 lg:col-span-5 -mt-1 text-xs">
        {tco("phoneRequired")}
      </p>
      {state.error ? (
        <p
          className="text-destructive sm:col-span-2 lg:col-span-5 text-sm"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="sm:col-span-2 lg:col-span-5 text-sm text-emerald-600">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
