"use client";

import { useTransition } from "react";
import { updateClassTeacher } from "./actions";

export function ChangeTeacherForm({
  classId,
  currentTeacherId,
  teachers,
}: {
  classId: string;
  currentTeacherId: string | null;
  teachers: { id: string; full_name: string }[];
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const fd = new FormData();
    fd.append("id", classId);
    fd.append("teacher_id", e.target.value);
    startTransition(() => updateClassTeacher(fd));
  }

  return (
    <select
      defaultValue={currentTeacherId ?? "none"}
      onChange={handleChange}
      disabled={pending}
      className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
    >
      <option value="none">Chưa phân công</option>
      {teachers.map((t) => (
        <option key={t.id} value={t.id}>
          {t.full_name}
        </option>
      ))}
    </select>
  );
}
