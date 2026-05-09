"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { Bookmark, FileText, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/submit-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { createLesson, saveLessonTemplate, updateLesson } from "./actions";
import type { Template } from "./page";

type Worksheet = { id: string; name: string; file_type: string };

export type StudentDefault = {
  behavior_rating: string | null;
  individual_note: string | null;
  homework_completed: boolean;
};

export type LessonDefaults = {
  lesson_date: string;
  title: string | null;
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

  // Populate defaults from edit-mode existing data, otherwise template, otherwise blank.
  const lessonDateDefault = defaults?.lesson_date ?? defaultDate;
  const titleDefault = defaults?.title ?? "";
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

  const formKey = `${mode}-${selectedTemplate?.id ?? lessonId ?? "blank"}`;
  const isEdit = mode === "edit";

  return (
    <div className="space-y-6">
      {!isEdit && templates.length > 0 ? (
        <div className="bg-card flex flex-wrap items-center gap-3 rounded-lg border p-4">
          <Sparkles className="text-primary size-4" />
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

        <section className="space-y-4 rounded-lg border bg-card p-6">
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
                defaultValue={lessonDateDefault}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">{t("title")}</Label>
              <Input
                id="title"
                name="title"
                defaultValue={titleDefault}
                placeholder={t("titlePlaceholder")}
              />
              <p className="text-muted-foreground text-xs">{t("titleHelp")}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vocabulary">{t("vocabulary")}</Label>
            <Textarea
              id="vocabulary"
              name="vocabulary"
              rows={2}
              defaultValue={vocabDefault}
              placeholder={t("vocabularyPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="grammar_point">{t("grammar")}</Label>
            <Textarea
              id="grammar_point"
              name="grammar_point"
              rows={2}
              defaultValue={grammarDefault}
              placeholder={t("grammarPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="speaking_activity">{t("speaking")}</Label>
            <Textarea
              id="speaking_activity"
              name="speaking_activity"
              rows={2}
              defaultValue={speakingDefault}
              placeholder={t("speakingPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="homework">{t("homework")}</Label>
            <Textarea
              id="homework"
              name="homework"
              rows={2}
              defaultValue={homeworkDefault}
              placeholder={t("homeworkPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="general_note">{t("generalNote")}</Label>
            <Textarea
              id="general_note"
              name="general_note"
              rows={3}
              defaultValue={generalDefault}
              placeholder={t("generalNotePlaceholder")}
            />
          </div>

          <div className="space-y-3 rounded-md border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <FileText className="text-primary size-4" />
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

        <section className="space-y-4 rounded-lg border bg-card p-6">
          <div>
            <h2 className="text-lg font-medium">{t("perStudentHeader")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("perStudentSubtitle")}
            </p>
          </div>

          <div className="space-y-6">
            {students.map((s) => {
              const su = defaults?.studentUpdates[s.id];
              return (
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
                      defaultValue={su?.behavior_rating ?? "none"}
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          {!isEdit ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSaveTpl((v) => !v)}
              className="inline-flex items-center gap-1.5"
            >
              <Bookmark className="size-4" />
              {tTemplates("saveButton")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <Link
              href={`/teacher/classes/${classId}`}
              className={buttonVariants({ variant: "outline" })}
            >
              {tCommon("cancel")}
            </Link>
            <SubmitButton
              idleLabel={isEdit ? tCommon("save") : t("submit")}
              pendingLabel={t("submitting")}
            />
          </div>
        </div>
      </form>

      {!isEdit && showSaveTpl ? (
        <form
          action={tplSaveAction}
          className="space-y-3 rounded-lg border bg-muted/30 p-4"
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
            <input
              type="hidden"
              name="vocabulary"
              value={
                (document.getElementById("vocabulary") as HTMLTextAreaElement)
                  ?.value ?? ""
              }
            />
            <input
              type="hidden"
              name="grammar_point"
              value={
                (document.getElementById("grammar_point") as HTMLTextAreaElement)
                  ?.value ?? ""
              }
            />
            <input
              type="hidden"
              name="speaking_activity"
              value={
                (
                  document.getElementById(
                    "speaking_activity",
                  ) as HTMLTextAreaElement
                )?.value ?? ""
              }
            />
            <input
              type="hidden"
              name="homework"
              value={
                (document.getElementById("homework") as HTMLTextAreaElement)
                  ?.value ?? ""
              }
            />
            <input
              type="hidden"
              name="general_note"
              value={
                (document.getElementById("general_note") as HTMLTextAreaElement)
                  ?.value ?? ""
              }
            />
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
            <p className="text-sm text-emerald-600">{tplSaveState.success}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
