"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import {
  Bookmark,
  Check,
  Circle,
  CircleCheck,
  Clock,
  FileText,
  Languages,
  Mic,
  NotebookPen,
  Sparkles,
  Type,
  Users,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { createLesson, saveLessonTemplate, updateLesson } from "./actions";
import { NoteWithSuggestions } from "./note-suggestions";
import type { SuggestionCategory } from "@/lib/comment-suggestions";
import type { Template } from "./page";

type Worksheet = {
  id: string;
  name: string;
  file_type: string;
  category: string | null;
};

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

// Behavior pills are tinted by severity so the teacher (and the meaning)
// read at a glance — same emerald→amber→rose scale parents see on the
// timeline. Full literal class strings so Tailwind's JIT keeps them.
const BEHAVIOR_PILL: Record<string, string> = {
  great:
    "peer-checked:border-emerald peer-checked:bg-emerald/15 peer-checked:text-emerald-light",
  good: "peer-checked:border-emerald peer-checked:bg-emerald/15 peer-checked:text-emerald-light",
  okay: "peer-checked:border-amber peer-checked:bg-amber/15 peer-checked:text-amber-light",
  needs_attention:
    "peer-checked:border-rose-400 peer-checked:bg-rose-500/15 peer-checked:text-rose-300",
};

const ATTENDANCE_PILL: Record<string, string> = {
  present:
    "peer-checked:border-emerald/70 peer-checked:bg-emerald/10 peer-checked:text-emerald-light",
  late: "peer-checked:border-amber/70 peer-checked:bg-amber/15 peer-checked:text-amber-light",
  absent:
    "peer-checked:border-rose-400/70 peer-checked:bg-rose-500/15 peer-checked:text-rose-300",
};

export function LessonForm({
  classId,
  className,
  students,
  defaultDate,
  templates,
  selectedTemplate,
  worksheets,
  suggestions,
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
  suggestions: Record<SuggestionCategory, string[]>;
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
  const [state, action] = useActionState(
    mode === "edit" ? updateLesson : createLesson,
    initialState,
  );
  const [tplSaveState, tplSaveAction] = useActionState(
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

  const attendanceOptions = [
    { value: "present", label: t("attendancePresent"), Icon: Check },
    { value: "late", label: t("attendanceLate"), Icon: Clock },
    { value: "absent", label: t("attendanceAbsent"), Icon: X },
  ] as const;

  function pickTemplate(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value === "none") params.delete("template");
    else params.set("template", e.target.value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
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

  // Live values for the lesson body. Controlled so the "save as template"
  // form (hidden inputs below) captures the current text.
  const [lessonDate, setLessonDate] = useState(lessonDateDefault);
  const [vocabValue, setVocabValue] = useState(vocabDefault);
  const [grammarValue, setGrammarValue] = useState(grammarDefault);
  const [speakingValue, setSpeakingValue] = useState(speakingDefault);
  const [homeworkValue, setHomeworkValue] = useState(homeworkDefault);
  const [generalValue, setGeneralValue] = useState(generalDefault);

  // Per-student state is controlled so the bulk actions, the live progress
  // meter, and the "absent dims grading" behaviour all react — and so
  // React 19 can't drop the selections after a failed submit.
  const initialAttendance = () =>
    Object.fromEntries(
      students.map((s) => [
        s.id,
        defaults?.studentUpdates[s.id]?.attendance ?? "present",
      ]),
    );
  const initialBehavior = () =>
    Object.fromEntries(
      students.map((s) => [
        s.id,
        defaults?.studentUpdates[s.id]?.behavior_rating ?? null,
      ]),
    );
  const initialHomework = () =>
    Object.fromEntries(
      students.map((s) => [
        s.id,
        defaults?.studentUpdates[s.id]?.homework_completed ?? false,
      ]),
    );
  const [attendance, setAttendance] =
    useState<Record<string, string>>(initialAttendance);
  const [behavior, setBehavior] =
    useState<Record<string, string | null>>(initialBehavior);
  const [homeworkDone, setHomeworkDone] =
    useState<Record<string, boolean>>(initialHomework);

  function setAllAttendance(value: "present" | "absent" | "late") {
    setAttendance(Object.fromEntries(students.map((s) => [s.id, value])));
  }
  function setAllBehavior(value: string) {
    setBehavior(Object.fromEntries(students.map((s) => [s.id, value])));
  }
  function setAllHomework(done: boolean) {
    setHomeworkDone(Object.fromEntries(students.map((s) => [s.id, done])));
  }

  const formKey = `${mode}-${selectedTemplate?.id ?? lessonId ?? "blank"}`;
  const isEdit = mode === "edit";

  // Reset live values when the picked template (or edit-mode lesson) changes.
  useEffect(() => {
    setLessonDate(lessonDateDefault);
    setVocabValue(vocabDefault);
    setGrammarValue(grammarDefault);
    setSpeakingValue(speakingDefault);
    setHomeworkValue(homeworkDefault);
    setGeneralValue(generalDefault);
    setAttendance(initialAttendance());
    setBehavior(initialBehavior());
    setHomeworkDone(initialHomework());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formKey]);

  // A student is "handled" once they're rated or marked absent — that's
  // what the progress meter and the per-card check track.
  const isHandled = (id: string) =>
    attendance[id] === "absent" || !!behavior[id];
  const ratedCount = students.filter((s) => isHandled(s.id)).length;
  const total = students.length;

  const contentFields = [
    {
      id: "vocabulary",
      label: t("vocabulary"),
      placeholder: t("vocabularyPlaceholder"),
      value: vocabValue,
      set: setVocabValue,
      Icon: Languages,
    },
    {
      id: "grammar_point",
      label: t("grammar"),
      placeholder: t("grammarPlaceholder"),
      value: grammarValue,
      set: setGrammarValue,
      Icon: Type,
    },
    {
      id: "speaking_activity",
      label: t("speaking"),
      placeholder: t("speakingPlaceholder"),
      value: speakingValue,
      set: setSpeakingValue,
      Icon: Mic,
    },
    {
      id: "homework",
      label: t("homework"),
      placeholder: t("homeworkPlaceholder"),
      value: homeworkValue,
      set: setHomeworkValue,
      Icon: NotebookPen,
    },
  ];

  return (
    <div className="app-dark-form -mx-4 -my-6 min-h-[calc(100dvh-7rem)] bg-navy px-4 pb-28 pt-6 text-white sm:-mx-6 sm:px-6 sm:pt-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[2px] text-emerald-light">
            {t("eyebrow")}
          </p>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight sm:text-3xl">
            {isEdit ? t("editTitle") : t("title")}
          </h1>
          <p className="mt-1 text-sm text-brand-mut">
            {t("summary", { className, count: total })}
          </p>
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

        <form key={formKey} action={action} className="space-y-6">
          <input type="hidden" name="class_id" value={classId} />
          {isEdit && lessonId ? (
            <input type="hidden" name="lesson_id" value={lessonId} />
          ) : null}

          {/* ---- The lesson (class-wide) ---- */}
          <section className="space-y-5 rounded-2xl border border-brand-line-dark bg-navy-2 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold">{t("generalHeader")}</h2>
              <p className="mt-0.5 text-sm text-brand-mut">
                {t("generalSubtitle", { className })}
              </p>
            </div>

            {/* Labels parents see first */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="lesson_date">{t("lessonDate")}</Label>
                <Input
                  id="lesson_date"
                  name="lesson_date"
                  type="date"
                  required
                  value={lessonDate}
                  onChange={(e) => setLessonDate(e.target.value)}
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
              <p className="text-xs text-brand-mut">{t("unitHelp")}</p>
            </div>

            {/* Lesson content — grouped apart from the labels above, 2-up
                on desktop so it doesn't read as one long stack. */}
            <div className="space-y-3 rounded-xl border border-brand-line-dark bg-white/[0.02] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-mut-2">
                {t("contentHeader")}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {contentFields.map((f) => (
                  <div key={f.id} className="space-y-1.5">
                    <Label
                      htmlFor={f.id}
                      className="inline-flex items-center gap-1.5"
                    >
                      <f.Icon className="size-3.5 text-emerald-light" />
                      {f.label}
                    </Label>
                    <Textarea
                      id={f.id}
                      name={f.id}
                      rows={2}
                      value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      placeholder={f.placeholder}
                    />
                  </div>
                ))}
              </div>
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

            <div className="space-y-3 rounded-xl border border-brand-line-dark bg-white/[0.02] p-4">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-emerald-light" />
                <Label className="font-medium">
                  {tWorksheets("lessonAttach")}
                </Label>
              </div>
              <p className="text-xs text-brand-mut">
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
                    {(() => {
                      // Group by category so a long library stays scannable.
                      // Uncategorized rows fall under "other"; skip the
                      // optgroup chrome when everything is one group.
                      const groups = new Map<string, Worksheet[]>();
                      for (const w of worksheets) {
                        const key = w.category ?? "other";
                        if (!groups.has(key)) groups.set(key, []);
                        groups.get(key)!.push(w);
                      }
                      if (groups.size <= 1) {
                        return worksheets.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ));
                      }
                      return Array.from(groups.entries()).map(([key, ws]) => (
                        <optgroup
                          key={key}
                          label={tWorksheets(
                            `categories.${key}` as "categories.other",
                          )}
                        >
                          {ws.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </optgroup>
                      ));
                    })()}
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

          {/* ---- The students (roster) ---- */}
          <section className="space-y-4 rounded-2xl border border-brand-line-dark bg-navy-2 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
                  <Users className="size-4 text-emerald-light" />
                  {t("perStudentHeader")}
                </h2>
                <p className="mt-0.5 text-sm text-brand-mut">
                  {t("perStudentSubtitle")}
                </p>
              </div>
              <span className="rounded-full border border-brand-line-dark bg-white/[0.03] px-3 py-1 text-sm font-semibold tabular-nums">
                <span
                  className={
                    ratedCount === total ? "text-emerald-light" : "text-white"
                  }
                >
                  {ratedCount}
                </span>
                <span className="text-brand-mut">/{total}</span>
              </span>
            </div>

            {students.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3 text-sm">
                <span className="text-brand-mut">{t("bulkLabel")}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAllAttendance("present")}
                  className="border-white/15 bg-transparent text-brand-mut-2 hover:bg-white/5 hover:text-white"
                >
                  {t("bulkAllPresent")}
                </Button>
                <Label htmlFor="bulk-behavior" className="sr-only">
                  {t("bulkSetBehavior")}
                </Label>
                <select
                  id="bulk-behavior"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "none") return;
                    setAllBehavior(v);
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

            <div className="space-y-3">
              {students.map((s) => {
                const handled = isHandled(s.id);
                const absent = attendance[s.id] === "absent";
                const hwDone = homeworkDone[s.id] ?? false;
                return (
                  <div
                    key={s.id}
                    className={
                      "rounded-xl border bg-white/[0.02] p-4 transition-colors " +
                      (handled
                        ? "border-emerald/25"
                        : "border-brand-line-dark")
                    }
                  >
                    <input type="hidden" name="student_id" value={s.id} />

                    {/* Header: done state + name | attendance toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        {handled ? (
                          <CircleCheck className="size-5 shrink-0 text-emerald-light" />
                        ) : (
                          <Circle className="size-5 shrink-0 text-white/25" />
                        )}
                        <p className="truncate font-semibold">{s.full_name}</p>
                      </div>
                      <div
                        role="radiogroup"
                        aria-label={t("attendance")}
                        className="flex flex-wrap gap-1"
                      >
                        {attendanceOptions.map((a) => (
                          <label key={a.value} className="cursor-pointer">
                            <input
                              type="radio"
                              name={`attendance_${s.id}`}
                              value={a.value}
                              checked={attendance[s.id] === a.value}
                              onChange={() =>
                                setAttendance((p) => ({
                                  ...p,
                                  [s.id]: a.value,
                                }))
                              }
                              className="peer sr-only"
                            />
                            <span
                              className={
                                "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-white/15 px-2.5 text-xs font-medium text-brand-mut-2 transition peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-emerald/50 " +
                                ATTENDANCE_PILL[a.value]
                              }
                            >
                              <a.Icon className="size-3.5" />
                              {a.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Grading — dimmed for an absent student (kept
                        interactive so a "was sick, called home" note is
                        still possible). */}
                    <div
                      className={
                        "mt-4 space-y-4 transition-opacity " +
                        (absent ? "opacity-45" : "")
                      }
                    >
                      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                        <div className="space-y-1.5">
                          <Label>{t("behavior")}</Label>
                          <div
                            role="radiogroup"
                            aria-label={t("behavior")}
                            className="flex flex-wrap gap-1.5"
                          >
                            {behaviorOptions.map((o) => (
                              <label key={o.value} className="cursor-pointer">
                                <input
                                  type="radio"
                                  name={`behavior_${s.id}`}
                                  value={o.value}
                                  checked={behavior[s.id] === o.value}
                                  onChange={() =>
                                    setBehavior((p) => ({
                                      ...p,
                                      [s.id]: o.value,
                                    }))
                                  }
                                  className="peer sr-only"
                                />
                                <span
                                  className={
                                    "inline-flex min-h-11 items-center rounded-lg border border-white/15 px-3 text-sm text-brand-mut-2 transition peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-emerald/50 " +
                                    BEHAVIOR_PILL[o.value]
                                  }
                                >
                                  {o.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <label
                          htmlFor={`homework_${s.id}`}
                          className={
                            "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm transition " +
                            (hwDone
                              ? "border-emerald/60 bg-emerald/10 text-emerald-light"
                              : "border-white/15 text-brand-mut-2 hover:bg-white/5")
                          }
                        >
                          <Checkbox
                            id={`homework_${s.id}`}
                            name={`homework_${s.id}`}
                            checked={hwDone}
                            onCheckedChange={(v) =>
                              setHomeworkDone((prev) => ({
                                ...prev,
                                [s.id]: v === true,
                              }))
                            }
                          />
                          {t("homeworkDone")}
                        </label>
                      </div>

                      <NoteWithSuggestions
                        studentId={s.id}
                        defaultNote={
                          defaults?.studentUpdates[s.id]?.individual_note ?? ""
                        }
                        suggestions={suggestions}
                      />
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
            ratedCount={ratedCount}
            total={total}
            allRatedLabel={t("allRated")}
          />
        </form>

        {!isEdit && showSaveTpl ? (
          <form
            action={tplSaveAction}
            className="space-y-3 rounded-2xl border border-brand-line-dark bg-navy-2 p-4"
          >
            <p className="text-sm font-medium">
              {tTemplates("saveDialogTitle")}
            </p>
            <p className="text-xs text-brand-mut">
              {tTemplates("saveDialogHelp")}
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[16rem] flex-1 space-y-1">
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
              <p className="text-sm text-emerald-light">
                {tplSaveState.success}
              </p>
            ) : null}
          </form>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Sticky save bar with a live progress meter. The bar fills as students are
 * rated and turns fully emerald when the whole class is handled — progress
 * sits right next to the commit action (thumb reach on mobile). Uses
 * useFormStatus, so it must render inside the <form>.
 */
function SaveBar({
  idle,
  pending,
  ratedCount,
  total,
  allRatedLabel,
}: {
  idle: string;
  pending: string;
  ratedCount: number;
  total: number;
  allRatedLabel: string;
}) {
  const { pending: isPending } = useFormStatus();
  const pct = total > 0 ? (ratedCount / total) * 100 : 0;
  const allDone = total > 0 && ratedCount === total;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-line-dark bg-navy/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2.5 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className={
                "h-full rounded-full transition-[width] duration-500 ease-out " +
                (allDone ? "bg-emerald-light" : "bg-emerald")
              }
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium tabular-nums text-brand-mut-2">
            {allDone ? (
              <>
                <CircleCheck className="size-3.5 text-emerald-light" />
                {allRatedLabel}
              </>
            ) : (
              `${ratedCount}/${total}`
            )}
          </span>
        </div>
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
    </div>
  );
}
