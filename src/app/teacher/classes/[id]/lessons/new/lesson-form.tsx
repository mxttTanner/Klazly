"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { Bookmark, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/submit-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { createLesson, saveLessonTemplate } from "./actions";
import type { Template } from "./page";

const initialState: { error?: string } = {};
const templateState: { error?: string; success?: string } = {};

export function LessonForm({
  classId,
  className,
  students,
  defaultDate,
  templates,
  selectedTemplate,
}: {
  classId: string;
  className: string;
  students: { id: string; full_name: string }[];
  defaultDate: string;
  templates: Template[];
  selectedTemplate: Template | null;
}) {
  const t = useTranslations("teacher.lessonForm");
  const tBehavior = useTranslations("behavior");
  const tCommon = useTranslations("common");
  const tTemplates = useTranslations("teacher.templates");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, action] = useFormState(createLesson, initialState);
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

  // Forcing a remount when the template changes lets the uncontrolled
  // textareas re-read their defaultValue prop.
  const formKey = selectedTemplate?.id ?? "blank";

  return (
    <div className="space-y-6">
      {templates.length > 0 ? (
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
              defaultValue={selectedTemplate?.vocabulary ?? ""}
              placeholder={t("vocabularyPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="grammar_point">{t("grammar")}</Label>
            <Textarea
              id="grammar_point"
              name="grammar_point"
              rows={2}
              defaultValue={selectedTemplate?.grammar_point ?? ""}
              placeholder={t("grammarPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="speaking_activity">{t("speaking")}</Label>
            <Textarea
              id="speaking_activity"
              name="speaking_activity"
              rows={2}
              defaultValue={selectedTemplate?.speaking_activity ?? ""}
              placeholder={t("speakingPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="homework">{t("homework")}</Label>
            <Textarea
              id="homework"
              name="homework"
              rows={2}
              defaultValue={selectedTemplate?.homework ?? ""}
              placeholder={t("homeworkPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="general_note">{t("generalNote")}</Label>
            <Textarea
              id="general_note"
              name="general_note"
              rows={3}
              defaultValue={selectedTemplate?.general_note ?? ""}
              placeholder={t("generalNotePlaceholder")}
            />
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSaveTpl((v) => !v)}
            className="inline-flex items-center gap-1.5"
          >
            <Bookmark className="size-4" />
            {tTemplates("saveButton")}
          </Button>
          <div className="flex gap-3">
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
        </div>
      </form>

      {showSaveTpl ? (
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
            {/* Snapshot of the current form values, captured server-side. */}
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
