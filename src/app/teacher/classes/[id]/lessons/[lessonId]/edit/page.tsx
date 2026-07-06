import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchDailySuggestions } from "@/lib/comment-suggestions-server";
import { fetchWorksheetOptions } from "@/lib/worksheet-options";
import {
  LessonForm,
  type LessonDefaults,
  type StudentDefault,
} from "../../new/lesson-form";
import type { Template } from "../../new/page";

export const dynamic = "force-dynamic";

export default async function EditLessonPage(
  props: {
    params: Promise<{ id: string; lessonId: string }>;
  }
) {
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

  let lessonRes = await supabase
    .from("lessons")
    .select(
      "id, lesson_date, unit, lesson_number, topic, vocabulary, grammar_point, speaking_activity, homework, general_note, worksheet_id, class_id",
    )
    .eq("id", params.lessonId)
    .single();
  if (lessonRes.error) {
    console.warn(
      "[teacher/lessons/edit] lesson select with topic failed, falling back:",
      lessonRes.error.message,
    );
    lessonRes = await supabase
      .from("lessons")
      .select(
        "id, lesson_date, unit, lesson_number, vocabulary, grammar_point, speaking_activity, homework, general_note, worksheet_id, class_id",
      )
      .eq("id", params.lessonId)
      .single();
  }
  const lesson = lessonRes.data as
    | (typeof lessonRes.data & { topic?: string | null })
    | null;
  if (!lesson || lesson.class_id !== cls.id) notFound();

  const locale = await getLocale();
  const [{ data: students }, updatesRes, worksheetOptions, suggestions] =
    await Promise.all([
      supabase
        .from("students")
        .select("id, full_name")
        .eq("class_id", cls.id)
        .order("full_name", { ascending: true }),
      // Try with attendance column; fall back if migration not run.
      (async () => {
        const r1 = await supabase
          .from("student_lesson_updates")
          .select(
            "student_id, behavior_rating, individual_note, homework_completed, attendance",
          )
          .eq("lesson_id", lesson.id);
        if (r1.error) {
          return await supabase
            .from("student_lesson_updates")
            .select(
              "student_id, behavior_rating, individual_note, homework_completed",
            )
            .eq("lesson_id", lesson.id);
        }
        return r1;
      })(),
      fetchWorksheetOptions(supabase),
      // The day's suggestion bank — seeded by VN "today" (the day the
      // teacher is writing), not the lesson's own date.
      fetchDailySuggestions(supabase, locale),
    ]);
  const updates = updatesRes.data;

  const studentUpdates: Record<string, StudentDefault> = {};
  for (const u of updates ?? []) {
    studentUpdates[u.student_id as string] = {
      behavior_rating: (u.behavior_rating as string | null) ?? null,
      individual_note: (u.individual_note as string | null) ?? null,
      homework_completed: !!u.homework_completed,
      attendance:
        ((u as { attendance?: string | null }).attendance as string | null) ??
        null,
    };
  }

  const defaults: LessonDefaults = {
    lesson_date: lesson.lesson_date,
    unit: lesson.unit ?? null,
    lesson_number: lesson.lesson_number ?? null,
    topic: lesson.topic ?? null,
    vocabulary: lesson.vocabulary,
    grammar_point: lesson.grammar_point,
    speaking_activity: lesson.speaking_activity,
    homework: lesson.homework,
    general_note: lesson.general_note,
    worksheet_id: lesson.worksheet_id ?? null,
    studentUpdates,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("editTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("summary", {
            className: cls.name,
            count: students?.length ?? 0,
          })}
        </p>
      </div>

      {students && students.length > 0 ? (
        <LessonForm
          classId={cls.id}
          className={cls.name}
          students={students}
          defaultDate={defaults.lesson_date}
          templates={[] as Template[]}
          selectedTemplate={null}
          worksheets={worksheetOptions}
          suggestions={suggestions}
          mode="edit"
          lessonId={lesson.id}
          defaults={defaults}
        />
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {t("noStudents")}
        </p>
      )}
    </div>
  );
}
