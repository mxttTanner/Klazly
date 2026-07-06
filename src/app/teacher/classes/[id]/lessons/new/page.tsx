import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { vnTodayYMD } from "@/lib/vn-time";
import { fetchDailySuggestions } from "@/lib/comment-suggestions-server";
import { fetchWorksheetOptions } from "@/lib/worksheet-options";
import { LessonForm, type LessonDefaults } from "./lesson-form";

export const dynamic = "force-dynamic";

export type Template = {
  id: string;
  name: string;
  vocabulary: string | null;
  grammar_point: string | null;
  speaking_activity: string | null;
  homework: string | null;
  general_note: string | null;
};

export default async function NewLessonPage(
  props: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ template?: string; from?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const user = await requireRole(["teacher", "admin"]);
  const supabase = await createClient();
  const t = await getTranslations("teacher.lessonForm");

  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, teacher_id, center_id")
    .eq("id", params.id)
    .single();
  if (!cls) notFound();
  if (cls.center_id !== user.center_id) notFound();
  if (user.role === "teacher" && cls.teacher_id !== user.id) notFound();

  const locale = await getLocale();
  const [{ data: students }, { data: templates }, worksheetOptions, suggestions] =
    await Promise.all([
      supabase
        .from("students")
        .select("id, full_name")
        .eq("class_id", cls.id)
        .order("full_name", { ascending: true }),
      supabase
        .from("lesson_templates")
        .select(
          "id, name, vocabulary, grammar_point, speaking_activity, homework, general_note",
        )
        .order("name", { ascending: true }),
      fetchWorksheetOptions(supabase),
      // The day's comment-suggestion bank in the teacher's language (hidden
      // if the migration isn't applied). Seeded by VN "today" so the 5 per
      // category flip at VN midnight for every teacher at once.
      fetchDailySuggestions(supabase, locale),
    ]);

  const allTemplates = (templates ?? []) as Template[];
  const selectedTemplate =
    searchParams.template
      ? allTemplates.find((tpl) => tpl.id === searchParams.template) ?? null
      : null;

  // "Today" must be Vietnam's today — the server runs in UTC, so plain
  // getFullYear/getMonth would give yesterday between 00:00–07:00 VN.
  const defaultDate = vnTodayYMD();

  // "Start from last lesson": copy lesson body (vocabulary, grammar, etc.)
  // and worksheet from a previous lesson, but reset date to today and DON'T
  // carry over per-student updates — each lesson is its own evaluation.
  let duplicateDefaults: LessonDefaults | undefined;
  if (searchParams.from) {
    let srcRes = await supabase
      .from("lessons")
      .select(
        "id, class_id, unit, lesson_number, topic, vocabulary, grammar_point, speaking_activity, homework, general_note, worksheet_id",
      )
      .eq("id", searchParams.from)
      .single();
    if (srcRes.error) {
      console.warn(
        "[teacher/lessons/new] lesson select with topic failed, falling back:",
        srcRes.error.message,
      );
      srcRes = await supabase
        .from("lessons")
        .select(
          "id, class_id, unit, lesson_number, vocabulary, grammar_point, speaking_activity, homework, general_note, worksheet_id",
        )
        .eq("id", searchParams.from)
        .single();
    }
    const src = srcRes.data as
      | (typeof srcRes.data & { topic?: string | null })
      | null;
    if (src && src.class_id === cls.id) {
      duplicateDefaults = {
        lesson_date: defaultDate,
        unit: src.unit ?? null,
        lesson_number: src.lesson_number ?? null,
        topic: src.topic ?? null,
        vocabulary: src.vocabulary,
        grammar_point: src.grammar_point,
        speaking_activity: src.speaking_activity,
        homework: src.homework,
        general_note: src.general_note,
        worksheet_id: src.worksheet_id ?? null,
        studentUpdates: {},
      };
    }
  }

  return (
    <div>
      {students && students.length > 0 ? (
        <LessonForm
          classId={cls.id}
          className={cls.name}
          students={students}
          defaultDate={defaultDate}
          templates={allTemplates}
          selectedTemplate={selectedTemplate}
          worksheets={worksheetOptions}
          suggestions={suggestions}
          defaults={duplicateDefaults}
        />
      ) : (
        <div className="bg-muted/30 flex flex-col items-center gap-4 rounded-lg border border-dashed p-10 text-center">
          <div className="bg-background flex size-12 items-center justify-center rounded-full border">
            <Users className="text-muted-foreground size-5" />
          </div>
          <p className="text-muted-foreground max-w-sm text-sm">
            {t("noStudents")}
          </p>
          {user.role === "admin" ? (
            <Link
              href="/admin/students"
              className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              {t("noStudentsAddCta")}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
