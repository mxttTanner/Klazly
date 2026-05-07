"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { createClass } from "./actions";

const initialState: { error?: string; success?: string } = {};

export function ClassForm({
  teachers,
}: {
  teachers: { id: string; full_name: string }[];
}) {
  const t = useTranslations("admin.classes");
  const [state, action] = useFormState(createClass, initialState);
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
      <div className="space-y-2 sm:col-span-1">
        <Label htmlFor="name">{t("className")}</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2 sm:col-span-1">
        <Label htmlFor="teacher_id">{t("teacher")}</Label>
        <select
          id="teacher_id"
          name="teacher_id"
          defaultValue="none"
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          <option value="none">{t("unassigned")}</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.full_name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2 sm:col-span-1">
        <Label htmlFor="schedule_text">{t("schedule")}</Label>
        <Input
          id="schedule_text"
          name="schedule_text"
          placeholder={t("schedulePlaceholder")}
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
