"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { inviteTeacher } from "./actions";

const initialState: { error?: string; success?: string } = {};

export function TeacherForm() {
  const t = useTranslations("admin.teachers");
  const [state, action] = useFormState(inviteTeacher, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={action}
      className="grid gap-4 rounded-lg border p-4 sm:grid-cols-4"
    >
      <div className="space-y-2">
        <Label htmlFor="full_name">{t("fullName")}</Label>
        <Input id="full_name" name="full_name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("initialPassword")}</Label>
        <Input
          id="password"
          name="password"
          type="text"
          minLength={8}
          required
          placeholder={t("passwordPlaceholder")}
        />
      </div>
      <div className="flex items-end">
        <SubmitButton
          idleLabel={t("submit")}
          pendingLabel={t("submitting")}
          className="w-full"
        />
      </div>
      {state.error ? (
        <p className="text-destructive sm:col-span-4 text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="sm:col-span-4 text-sm text-emerald-600">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
