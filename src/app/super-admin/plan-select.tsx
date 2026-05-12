"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateSubscriptionPlan } from "./actions";

export function PlanSelect({
  centerId,
  currentPlan,
}: {
  centerId: string;
  currentPlan: string | null;
}) {
  const t = useTranslations("superAdmin");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const fd = new FormData();
    fd.append("id", centerId);
    fd.append("plan", e.target.value);
    setError(null);
    startTransition(async () => {
      const res = await updateSubscriptionPlan(fd);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-1">
      <select
        defaultValue={currentPlan ?? ""}
        onChange={handleChange}
        disabled={pending}
        className="border-input bg-background h-8 w-full rounded-md border px-2 text-xs"
      >
        <option value="">{t("planNone")}</option>
        <option value="monthly">{t("planMonthly")}</option>
        <option value="six_months">{t("planSixMonths")}</option>
        <option value="annual">{t("planAnnual")}</option>
      </select>
      {error ? (
        <p className="text-destructive text-[10px]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
