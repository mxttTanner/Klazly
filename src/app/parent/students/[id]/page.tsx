import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const BEHAVIOR_TONES: Record<string, string> = {
  great: "bg-emerald-100 text-emerald-800",
  good: "bg-sky-100 text-sky-800",
  okay: "bg-amber-100 text-amber-800",
  needs_attention: "bg-rose-100 text-rose-800",
};

type LessonRow = {
  id: string;
  lesson_date: string;
  vocabulary: string | null;
  grammar_point: string | null;
  speaking_activity: string | null;
  homework: string | null;
  general_note: string | null;
};

type UpdateRow = {
  lesson_id: string;
  behavior_rating: keyof typeof BEHAVIOR_TONES | null;
  individual_note: string | null;
  homework_completed: boolean;
};

export default async function StudentProgressPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole("parent");
  const supabase = createClient();
  const t = await getTranslations("parent.student");
  const tBehavior = await getTranslations("behavior");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, full_name, age, parent_user_id, class:classes(id, name, teacher:users!classes_teacher_id_fkey(full_name))",
    )
    .eq("id", params.id)
    .single();

  if (!student || student.parent_user_id !== user.id) notFound();

  const cls = Array.isArray(student.class) ? student.class[0] : student.class;
  const teacher = cls
    ? Array.isArray(cls.teacher)
      ? cls.teacher[0]
      : cls.teacher
    : null;

  const lessonsRes = cls
    ? await supabase
        .from("lessons")
        .select(
          "id, lesson_date, vocabulary, grammar_point, speaking_activity, homework, general_note",
        )
        .eq("class_id", cls.id)
        .order("lesson_date", { ascending: false })
        .limit(20)
    : { data: [] as LessonRow[] };

  const lessons = (lessonsRes.data ?? []) as LessonRow[];

  const updatesRes = await supabase
    .from("student_lesson_updates")
    .select("lesson_id, behavior_rating, individual_note, homework_completed")
    .eq("student_id", student.id)
    .in(
      "lesson_id",
      lessons.map((l) => l.id),
    );

  const updateByLesson = new Map<string, UpdateRow>();
  for (const u of (updatesRes.data ?? []) as UpdateRow[]) {
    updateByLesson.set(u.lesson_id, u);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/parent"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          {t("back")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {student.full_name}
        </h1>
        <p className="text-muted-foreground text-sm">
          {cls
            ? teacher
              ? t("classWithTeacher", {
                  className: cls.name,
                  teacher: teacher.full_name,
                })
              : t("classLine", { className: cls.name })
            : t("noClass")}
        </p>
      </div>

      {lessons.length > 0 ? (
        <ul className="space-y-4">
          {lessons.map((l) => {
            const u = updateByLesson.get(l.id);
            const rating = u?.behavior_rating;
            const ratingTone = rating ? BEHAVIOR_TONES[rating] : null;
            const ratingLabel = rating ? tBehavior(rating) : null;
            return (
              <li key={l.id} className="bg-card rounded-lg border p-4 sm:p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-semibold">
                    {new Date(l.lesson_date).toLocaleDateString(dateLocale, {
                      weekday: "long",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </h2>
                  {ratingLabel && ratingTone ? (
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${ratingTone}`}
                    >
                      {ratingLabel}
                    </span>
                  ) : null}
                </div>

                <dl className="mt-3 space-y-2 text-sm">
                  {l.vocabulary ? (
                    <Field label={t("vocabulary")} value={l.vocabulary} />
                  ) : null}
                  {l.grammar_point ? (
                    <Field label={t("grammar")} value={l.grammar_point} />
                  ) : null}
                  {l.speaking_activity ? (
                    <Field label={t("speaking")} value={l.speaking_activity} />
                  ) : null}
                  {l.homework ? (
                    <Field label={t("homework")} value={l.homework} />
                  ) : null}
                  {l.general_note ? (
                    <Field label={t("generalNote")} value={l.general_note} />
                  ) : null}
                </dl>

                {u ? (
                  <div className="bg-muted/40 mt-4 rounded-md p-3 text-sm">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      {t("perStudentHeader")}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge
                        variant={u.homework_completed ? "default" : "outline"}
                      >
                        {u.homework_completed
                          ? t("homeworkDone")
                          : t("homeworkNotDone")}
                      </Badge>
                    </div>
                    {u.individual_note ? (
                      <p className="mt-2">{u.individual_note}</p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {t("noLessons")}
        </p>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 sm:grid-cols-[8rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
