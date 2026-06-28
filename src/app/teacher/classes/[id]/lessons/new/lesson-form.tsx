"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Bookmark, Check, FileText, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { createLesson, saveLessonTemplate, updateLesson } from "./actions";
import type { Template } from "./page";

type Worksheet = { id: string; name: string; file_type: string };

export type StudentDefault = {
  behavior_rating: string | null;
  individual_note: string | null;
  homework_completed: boolean;
  attendance: string | null;
};

export type LessonDefaults = {
  lesson_date: string;
  unit: string | null;
  lesson_number: string | null;
  topic: string | null;
  vocabulary: string | null;
  grammar_point: string | null;
  speaking_activity: string | null;
  homework: string | null;
  general_note: string | null;
  worksheet_id: string | null;
  studentUpdates: Record<string, StudentDefault>;
};

const initialState: { error?: string } = {};
const templateState: { error?: string; success?: string } = {};

export function LessonForm({
  classId,
  className,
  students,
  defaultDate,
  templates,
  selectedTemplate,
  worksheets,
  mode = "create",
  lessonId,
  defaults,
}: {
  classId: string;
  className: string;
  students: { id: string; full_name: string }[];
  defaultDate: string;
  templates: Template[];
  selectedTemplate: Template | null;
  worksheets: Worksheet[];
  mode?: "create" | "edit";
  lessonId?: string;
  defaults?: LessonDefaults;
}) {
  const t = useTranslations("teacher.lessonForm");
  const tBehavior = useTranslations("behavior");
  const tCommon = useTranslations("common");
  const tTemplates = useTranslations("teacher.templates");
  const tWorksheets = useTranslations("worksheets");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, action] = useFormState(
    mode === "edit" ? updateLesson : createLesson,
    initialState,
  );
  const [tplSaveState, tplSaveAction] = useFormState(
    saveLessonTemplate,
    templateState,
  );
  const [showSaveTpl, setShowSaveTpl] = useState(false);

  const behaviorOptions = [
    { value: "great", label: tBehavior("great") },
    { value: "good", label: tBehavior("good") },
    { value: "okay", label: tBehavior("okay") },
    { value: "needs_attention", label: tBehavior("needs_attention") },
  ];

  function pickTemplate(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value === "none") params.delete("template");
    else params.set("template", e.target.value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  // Bulk-toggle the per-student homework checkboxes. The base-ui Checkbox
  // renders a <span role="checkbox" id="homework_…"> (NOT a <button>) and
  // carries data-checked when checked, so target the role and click only
  // the ones whose state doesn't already match.
  function setAllHomework(done: boolean) {
    document
      .querySelectorAll<HTMLElement>('[role="checkbox"][id^="homework_"]')
      .forEach((btn) => {
        const isChecked = btn.hasAttribute("data-checked");
        if (isChecked !== done) btn.click();
      });
  }

  function setAllAttendance(value: "present" | "absent" | "late") {
    document
      .querySelectorAll<HTMLSelectElement>('select[name^="attendance_"]')
      .forEach((el) => {
        el.value = value;
      });
  }

  // Populate defaults from edit-mode existing data, otherwise template, otherwise blank.
  const lessonDateDefault = defaults?.lesson_date ?? defaultDate;
  const unitDefault = defaults?.unit ?? "";
  const lessonNumberDefault = defaults?.lesson_number ?? "";
  const topicDefault = defaults?.topic ?? "";
  const vocabDefault =
    defaults?.vocabulary ?? selectedTemplate?.vocabulary ?? "";
  const grammarDefault =
    defaults?.grammar_point ?? selectedTemplate?.grammar_point ?? "";
  const speakingDefault =
    defaults?.speaking_activity ?? selectedTemplate?.speaking_activity ?? "";
  const homeworkDefault =
    defaults?.homework ?? selectedTemplate?.homework ?? "";
  const generalDefault =
    defaults?.general_note ?? selectedTemplate?.general_note ?? "";
  const worksheetDefault = defaults?.worksheet_id ?? "none";

  // Live values for the lesson body. The previous implementation read
  // document.getElementById(...).value at render time when building the
  // "save as template" form, which always returned empty strings. With
  // controlled inputs the template-save form gets the current text.
  const [vocabValue, setVocabValue] = useState(vocabDefault);
  const [grammarValue, setGrammarValue] = useState(grammarDefault);
  const [speakingValue, setSpeakingValue] = useState(speakingDefault);
  const [homeworkValue, setHomeworkValue] = useState(homeworkDefault);
  const [generalValue, setGeneralValue] = useState(generalDefault);

  const formKey = `${mode}-${selectedTemplate?.id ?? lessonId ?? "blank"}`;
  const isEdit = mode === "edit";

  // Reset live values when the picked template (or edit-mode lesson) changes —
  // keyed by formKey since that already changes on template/lesson swap.
  useEffect(() => {
    setVocabValue(vocabDefault);
    setGrammarValue(grammarDefault);
    setSpeakingValue(speakingDefault);
    setHomeworkValue(homeworkDefault);
    setGeneralValue(generalDefault);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formKey]);

  return (
    <div className="app-dark-form -mx-4 -my-6 min-h-[calc(100dvh-7rem)] space-y-6 bg-navy px-4 py-6 text-white sm:-mx-6 sm:px-6 sm:py-8">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[1px] text-emerald-light">
          {t("eyebrow")} · {className}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
          {isEdit ? t("editTitle") : t("title")}
        </h1>
      </div>
      {!isEdit && templates.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-line-dark bg-navy-2 p-4">
          <Sparkles className="size-4 text-emerald-light" />
          <Label htmlFor="template-picker" className="font-medium">
            {tTemplates("pickerLabel")}
          </Label>
          <select
            id="template-picker"
            value={selectedTemplate?.id ?? "none"}
            onChange={pickTemplate}
            className="border-input bg-background h-9 min-w-[12rem] flex-1 rounded-md border px-3 text-sm"
          >
            <option value="none">{tTemplates("pickerNone")}</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <form key={formKey} action={action} className="space-y-8">
        <input type="hidden" name="class_id" value={classId} />
        {isEdit && lessonId ? (
          <input type="hidden" name="lesson_id" value={lessonId} />
        ) : null}

        <section className="space-y-4 rounded-2xl border border-brand-line-dark bg-navy-2 p-6">
          <div>
            <h2 className="text-lg font-medium">{t("generalHeader")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("generalSubtitle", { className })}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="lesson_date">{t("lessonDate")}</Label>
              <Input
                id="lesson_date"
                name="lesson_date"
                type="date"
                required
                defaultValue={lessonDateDefault}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">{t("unit")}</Label>
              <Input
                id="unit"
                name="unit"
                defaultValue={unitDefault}
                placeholder={t("unitPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson_number">{t("lessonNumber")}</Label>
              <Input
                id="lesson_number"
                name="lesson_number"
                defaultValue={lessonNumberDefault}
                placeholder={t("lessonNumberPlaceholder")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">{t("topic")}</Label>
            <Input
              id="topic"
              name="topic"
              defaultValue={topicDefault}
              placeholder={t("topicPlaceholder")}
              maxLength={120}
            />
            <p className="text-muted-foreground text-xs">{t("topicHelp")}</p>
          </div>

          <p className="text-muted-foreground text-xs">{t("unitHelp")}</p>

          <div className="space-y-2">
            <Label htmlFor="vocabulary">{t("vocabulary")}</Label>
            <Textarea
              id="vocabulary"
              name="vocabulary"
              rows={2}
              value={vocabValue}
              onChange={(e) => setVocabValue(e.target.value)}
              placeholder={t("vocabularyPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="grammar_point">{t("grammar")}</Label>
            <Textarea
              id="grammar_point"
              name="grammar_point"
              rows={2}
              value={grammarValue}
              onChange={(e) => setGrammarValue(e.target.value)}
              placeholder={t("grammarPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="speaking_activity">{t("speaking")}</Label>
            <Textarea
              id="speaking_activity"
              name="speaking_activity"
              rows={2}
              value={speakingValue}
              onChange={(e) => setSpeakingValue(e.target.value)}
              placeholder={t("speakingPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="homework">{t("homework")}</Label>
            <Textarea
              id="homework"
              name="homework"
              rows={2}
              value={homeworkValue}
              onChange={(e) => setHomeworkValue(e.target.value)}
              placeholder={t("homeworkPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="general_note">{t("generalNote")}</Label>
            <Textarea
              id="general_note"
              name="general_note"
              rows={3}
              value={generalValue}
              onChange={(e) => setGeneralValue(e.target.value)}
              placeholder={t("generalNotePlaceholder")}
            />
          </div>

          <div className="space-y-3 rounded-xl border border-brand-line-dark bg-white/[0.02] p-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-emerald-light" />
              <Label className="font-medium">{tWorksheets("lessonAttach")}</Label>
            </div>
            <p className="text-muted-foreground text-xs">
              {tWorksheets("lessonAttachHelp")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="worksheet_id" className="text-xs font-normal">
                  {tWorksheets("lessonPickFromLibrary")}
                </Label>
                <select
                  id="worksheet_id"
                  name="worksheet_id"
                  defaultValue={worksheetDefault}
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="none">{tWorksheets("lessonNone")}</option>
                  {worksheets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="worksheet_file"
                  className="text-xs font-normal"
                >
                  {tWorksheets("lessonOrUpload")}
                </Label>
                <Input
                  id="worksheet_file"
                  name="worksheet_file"
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-brand-line-dark bg-navy-2 p-6">
          <div>
            <h2 className="text-lg font-medium">{t("perStudentHeader")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("perStudentSubtitle")}
            </p>
          </div>

          {students.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3 text-sm">
              <span className="text-muted-foreground">{t("bulkLabel")}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAllAttendance("present")}
                className="border-white/15 bg-transparent text-brand-mut-2 hover:bg-white/5 hover:text-white"
              >
                {t("bulkAllPresent")}
              </Button>
              <Label
                htmlFor="bulk-behavior"
                className="text-muted-foreground sr-only"
              >
                {t("bulkSetBehavior")}
              </Label>
              <select
                id="bulk-behavior"
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "none") return;
                  document
                    .querySelectorAll<HTMLInputElement>(
                      `input[type="radio"][name^="behavior_"][value="${v}"]`,
                    )
                    .forEach((el) => {
                      el.checked = true;
                    });
                  e.target.value = "none";
                }}
                defaultValue="none"
                className="border-input bg-background h-8 rounded-md border px-2 text-xs"
              >
                <option value="none">{t("bulkSetBehavior")}…</option>
                {behaviorOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAllHomework(true)}
                className="border-white/15 bg-transparent text-brand-mut-2 hover:bg-white/5 hover:text-white"
              >
                {t("bulkAllHomeworkDone")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAllHomework(false)}
                className="border-white/15 bg-transparent text-brand-mut-2 hover:bg-white/5 hover:text-white"
              >
                {t("bulkAllHomeworkUndone")}
              </Button>
            </div>
          ) : null}

          <div className="space-y-6">
            {students.map((s) => {
              const su = defaults?.studentUpdates[s.id];
              return (
                <div
                  key={s.id}
                  className="grid gap-4 rounded-xl border border-brand-line-dark bg-white/[0.02] p-4 md:grid-cols-[10rem_1fr_auto]"
                >
                  <input type="hidden" name="student_id" value={s.id} />

                  <div className="space-y-2 md:col-span-4">
                    <p className="font-medium">{s.full_name}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`attendance_${s.id}`}>
                      {t("attendance")}
                    </Label>
                    <select
                      id={`attendance_${s.id}`}
                      name={`attendance_${s.id}`}
                      defaultValue={su?.attendance ?? "present"}
                      className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                    >
                      <option value="present">{t("attendancePresent")}</option>
                      <option value="late">{t("attendanceLate")}</option>
                      <option value="absent">{t("attendanceAbsent")}</option>
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-3">
                    <Label>{t("behavior")}</Label>
                    <div role="radiogroup" className="flex flex-wrap gap-1.5">
                      {behaviorOptions.map((o) => (
                        <label key={o.value} className="cursor-pointer">
                          <input
                            type="radio"
                            name={`behavior_${s.id}`}
                            value={o.value}
                            defaultChecked={su?.behavior_rating === o.value}
                            className="peer sr-only"
                          />
                          <span className="inline-flex min-h-11 items-center rounded-lg border border-white/15 px-3 text-sm text-brand-mut-2 transition peer-checked:border-emerald peer-checked:bg-emerald/15 peer-checked:font-semibold peer-checked:text-emerald-light">
                            {o.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`note_${s.id}`}>{t("individualNote")}</Label>
                    <Textarea
                      id={`note_${s.id}`}
                      name={`note_${s.id}`}
                      rows={2}
                      defaultValue={su?.individual_note ?? ""}
                      placeholder={t("individualNotePlaceholder")}
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <Checkbox
                      id={`homework_${s.id}`}
                      name={`homework_${s.id}`}
                      defaultChecked={su?.homework_completed ?? false}
                    />
                    <Label
                      htmlFor={`homework_${s.id}`}
                      className="font-normal"
                    >
                      {t("homeworkDone")}
                    </Label>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {state.error ? (
          <p className="text-destructive text-sm" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {!isEdit ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSaveTpl((v) => !v)}
              className="inline-flex items-center gap-1.5 border-white/15 bg-transparent text-brand-mut-2 hover:bg-white/5 hover:text-white"
            >
              <Bookmark className="size-4" />
              {tTemplates("saveButton")}
            </Button>
          ) : null}
          <Link
            href={`/teacher/classes/${classId}`}
            className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 text-sm font-medium text-brand-mut-2 transition hover:bg-white/5 hover:text-white"
          >
            {tCommon("cancel")}
          </Link>
        </div>

        <SaveBar
          idle={isEdit ? tCommon("save") : t("submit")}
          pending={t("submitting")}
        />
      </form>

      {!isEdit && showSaveTpl ? (
        <form
          action={tplSaveAction}
          className="space-y-3 rounded-2xl border border-brand-line-dark bg-navy-2 p-4"
        >
          <p className="text-sm font-medium">{tTemplates("saveDialogTitle")}</p>
          <p className="text-muted-foreground text-xs">
            {tTemplates("saveDialogHelp")}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[16rem] space-y-1">
              <Label htmlFor="template_name">{tTemplates("name")}</Label>
              <Input
                id="template_name"
                name="template_name"
                required
                placeholder={tTemplates("namePlaceholder")}
              />
            </div>
            <input type="hidden" name="vocabulary" value={vocabValue} />
            <input type="hidden" name="grammar_point" value={grammarValue} />
            <input
              type="hidden"
              name="speaking_activity"
              value={speakingValue}
            />
            <input type="hidden" name="homework" value={homeworkValue} />
            <input type="hidden" name="general_note" value={generalValue} />
            <SubmitButton
              idleLabel={tTemplates("saveSubmit")}
              pendingLabel={tTemplates("saveSubmitting")}
            />
          </div>
          {tplSaveState.error ? (
            <p className="text-destructive text-sm" role="alert">
              {tplSaveState.error}
            </p>
          ) : null}
          {tplSaveState.success ? (
            <p className="text-sm text-emerald-light">{tplSaveState.success}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

/**
 * Sticky emerald save bar (matches teacher.png). Uses useFormStatus so
 * it reflects the parent <form>'s pending state — must render inside
 * the form.
 */
function SaveBar({ idle, pending }: { idle: string; pending: string }) {
  const { pending: isPending } = useFormStatus();
  return (
    <div className="sticky bottom-0 -mx-4 mt-2 border-t border-brand-line-dark bg-navy/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <button
        type="submit"
        disabled={isPending}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-emerald px-6 text-base font-bold text-[#06281f] transition hover:bg-emerald-light disabled:opacity-60"
      >
        {isPending ? (
          pending
        ) : (
          <>
            {idle}
            <Check className="size-4" strokeWidth={3} />
          </>
        )}
      </button>
    </div>
  );
}
