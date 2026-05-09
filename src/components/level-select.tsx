"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { setStudentLevel } from "@/app/teacher/classes/[id]/actions";

export function LevelSelect({
  studentId,
  currentLevel,
}: {
  studentId: string;
  currentLevel: string | null;
}) {
  const t = useTranslations("level");
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const fd = new FormData();
    fd.append("student_id", studentId);
    fd.append("level", e.target.value);
    startTransition(() => setStudentLevel(fd));
  }

  const tones: Record<string, string> = {
    good: "border-emerald-300 bg-emerald-50 text-emerald-900",
    okay: "border-amber-300 bg-amber-50 text-amber-900",
    needs_attention: "border-rose-300 bg-rose-50 text-rose-900",
  };
  const tone = currentLevel ? tones[currentLevel] : "";

  return (
    <select
      defaultValue={currentLevel ?? "none"}
      onChange={handleChange}
      disabled={pending}
      className={`h-8 rounded-md border px-2 text-xs font-medium ${tone}`}
    >
      <option value="none">{t("none")}</option>
      <option value="good">{t("good")}</option>
      <option value="okay">{t("okay")}</option>
      <option value="needs_attention">{t("needs_attention")}</option>
    </select>
  );
}
