"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { createLesson } from "./actions";

const initialState: { error?: string } = {};

export function LessonForm({
  classId,
  className,
  students,
  defaultDate,
}: {
  classId: string;
  className: string;
  students: { id: string; full_name: string }[];
  defaultDate: string;
}) {
  const t = useTranslations("teacher.lessonForm");
  const tBehavior = useTranslations("behavior");
  const tCommon = useTranslations("common");
  const [state, action] = useFormState(createLesson, initialState);

  const behaviorOptions = [
    { value: "great", label: tBehavior("great") },
    { value: "good", label: tBehavior("good") },
    { value: "okay", label: tBehavior("okay") },
    { value: "needs_attention", label: tBehavior("needs_attention") },
  ];

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="class_id" value={classId} />

      <section className="space-y-4 rounded-lg border p-6">
        <div>
          <h2 className="text-lg font-medium">{t("generalHeader")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("generalSubtitle", { className })}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lesson_date">{t("lessonDate")}</Label>
            <Input
              id="lesson_date"
              name="lesson_date"
              type="date"
              required
              defaultValue={defaultDate}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vocabulary">{t("vocabulary")}</Label>
          <Textarea
            id="vocabulary"
            name="vocabulary"
            rows={2}
            placeholder={t("vocabularyPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="grammar_point">{t("grammar")}</Label>
          <Textarea
            id="grammar_point"
            name="grammar_point"
            rows={2}
            placeholder={t("grammarPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="speaking_activity">{t("speaking")}</Label>
          <Textarea
            id="speaking_activity"
            name="speaking_activity"
            rows={2}
            placeholder={t("speakingPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="homework">{t("homework")}</Label>
          <Textarea
            id="homework"
            name="homework"
            rows={2}
            placeholder={t("homeworkPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="general_note">{t("generalNote")}</Label>
          <Textarea
            id="general_note"
            name="general_note"
            rows={3}
            placeholder={t("generalNotePlaceholder")}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-lg border p-6">
        <div>
          <h2 className="text-lg font-medium">{t("perStudentHeader")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("perStudentSubtitle")}
          </p>
        </div>

        <div className="space-y-6">
          {students.map((s) => (
            <div
              key={s.id}
              className="grid gap-4 rounded-md border p-4 sm:grid-cols-[1fr_1fr_auto]"
            >
              <input type="hidden" name="student_id" value={s.id} />

              <div className="space-y-2 sm:col-span-3">
                <p className="font-medium">{s.full_name}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`behavior_${s.id}`}>{t("behavior")}</Label>
                <select
                  id={`behavior_${s.id}`}
                  name={`behavior_${s.id}`}
                  defaultValue="none"
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="none">{t("behaviorNone")}</option>
                  {behaviorOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`note_${s.id}`}>{t("individualNote")}</Label>
                <Textarea
                  id={`note_${s.id}`}
                  name={`note_${s.id}`}
                  rows={2}
                  placeholder={t("individualNotePlaceholder")}
                />
              </div>

              <div className="flex items-end gap-2">
                <Checkbox id={`homework_${s.id}`} name={`homework_${s.id}`} />
                <Label htmlFor={`homework_${s.id}`} className="font-normal">
                  {t("homeworkDone")}
                </Label>
              </div>
            </div>
          ))}
        </div>
      </section>

      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-3">
        <Link
          href={`/teacher/classes/${classId}`}
          className={buttonVariants({ variant: "outline" })}
        >
          {tCommon("cancel")}
        </Link>
        <SubmitButton
          idleLabel={t("submit")}
          pendingLabel={t("submitting")}
        />
      </div>
    </form>
  );
}
