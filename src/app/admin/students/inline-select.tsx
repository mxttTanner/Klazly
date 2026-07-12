"use client";

import { useState, useTransition } from "react";
import { updateStudent } from "./actions";

export function InlineSelect({
  studentId,
  field,
  currentValue,
  options,
  emptyLabel,
}: {
  studentId: string;
  field: "class_id" | "parent_user_id";
  currentValue: string | null;
  options: { id: string; label: string }[];
  emptyLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const fd = new FormData();
    fd.append("id", studentId);
    fd.append("field", field);
    fd.append("value", e.target.value);
    setError(null);
    startTransition(async () => {
      const res = await updateStudent(fd);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-1">
      <select
        defaultValue={currentValue ?? "none"}
        onChange={handleChange}
        disabled={pending}
        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
      >
        <option value="none">{emptyLabel}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
