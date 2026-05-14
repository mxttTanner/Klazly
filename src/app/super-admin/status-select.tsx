"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateSubscriptionStatus } from "./actions";

export function StatusSelect({
  centerId,
  currentStatus,
}: {
  centerId: string;
  currentStatus: string;
}) {
  const t = useTranslations("superAdmin");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const fd = new FormData();
    fd.append("id", centerId);
    fd.append("status", e.target.value);
    setError(null);
    startTransition(async () => {
      const res = await updateSubscriptionStatus(fd);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-1">
      <select
        defaultValue={currentStatus}
        onChange={handleChange}
        disabled={pending}
        className="border-input bg-background h-8 w-full rounded-md border px-2 text-xs"
      >
        <option value="trial">{t("statusTrial")}</option>
        <option value="active">{t("statusActive")}</option>
        <option value="past_due">{t("statusPastDue")}</option>
        <option value="canceled">{t("statusCanceled")}</option>
        <option value="expired">{t("statusExpired")}</option>
      </select>
      {error ? (
        <p className="text-destructive text-[10px]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
