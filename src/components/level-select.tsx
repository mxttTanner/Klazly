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
    good: "border-success/40 bg-success/10 text-foreground",
    okay: "border-warning/40 bg-warning/10 text-foreground",
    needs_attention: "border-destructive/40 bg-destructive/10 text-foreground",
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
