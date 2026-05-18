"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { inviteTeacher } from "./actions";

const initialState: { error?: string; success?: string } = {};

/**
 * Phone-first teacher invite form. Same shape as the parent form —
 * see parent-form.tsx for the why.
 */
export function TeacherForm() {
  const t = useTranslations("admin.teachers");
  const tco = useTranslations("contact");
  const [state, action] = useFormState(inviteTeacher, initialState);
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
        <Label htmlFor="teacher_full_name">{t("fullName")}</Label>
        <Input id="teacher_full_name" name="full_name" required />
      </div>
      <div className="space-y-2 lg:col-span-1">
        <Label htmlFor="teacher_phone">{tco("phoneLabel")}</Label>
        <Input
          id="teacher_phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          required
          placeholder="0901 234 567"
        />
      </div>
      <div className="space-y-2 lg:col-span-1">
        <Label htmlFor="teacher_email">
          {t("email")}{" "}
          <span className="text-muted-foreground text-xs font-normal">
            {tco("optionalHint")}
          </span>
        </Label>
        <Input
          id="teacher_email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="ban@example.com"
        />
      </div>
      <div className="space-y-2 lg:col-span-1">
        <Label htmlFor="teacher_password">{t("initialPassword")}</Label>
        <Input
          id="teacher_password"
          name="password"
          type="text"
          minLength={8}
          required
          placeholder={t("passwordPlaceholder")}
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
