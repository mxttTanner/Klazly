"use client";

import { useTransition } from "react";
import { updateClassProgram } from "./actions";

export function InlineProgram({
  classId,
  currentProgram,
  programs,
  noneLabel,
}: {
  classId: string;
  currentProgram: string | null;
  programs: { id: string; label: string }[];
  noneLabel: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const fd = new FormData();
    fd.append("id", classId);
    fd.append("program", e.target.value);
    startTransition(() => updateClassProgram(fd));
  }

  // If the class points at a label that's no longer in the catalog (admin
  // deleted it), still render it so the admin can pick a different one.
  const known = new Set(programs.map((p) => p.label));
  const showOrphan =
    currentProgram !== null && currentProgram !== "" && !known.has(currentProgram);

  return (
    <select
      defaultValue={currentProgram ?? "none"}
      onChange={handleChange}
      disabled={pending}
      className="border-input bg-background h-8 w-full rounded-md border px-2 text-xs"
    >
      <option value="none">{noneLabel}</option>
      {programs.map((p) => (
        <option key={p.id} value={p.label}>
          {p.label}
        </option>
      ))}
      {showOrphan ? (
        <option value={currentProgram!}>
          {currentProgram} (?)
        </option>
      ) : null}
    </select>
  );
}
