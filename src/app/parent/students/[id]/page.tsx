import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  GraduationCap,
  MessageSquareText,
  Mic2,
  PencilLine,
  ScrollText,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/print-button";

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

  const [{ data: student }, { data: center }] = await Promise.all([
    supabase
      .from("students")
      .select(
        "id, full_name, age, parent_user_id, class:classes(id, name, teacher:users!classes_teacher_id_fkey(full_name))",
      )
      .eq("id", params.id)
      .single(),
    supabase
      .from("centers")
      .select("name")
      .eq("id", user.center_id)
      .single(),
  ]);

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

  const printedOn = new Date().toLocaleDateString(dateLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const classLineText = cls
    ? teacher
      ? t("classWithTeacher", {
          className: cls.name,
          teacher: teacher.full_name,
        })
      : t("classLine", { className: cls.name })
    : t("noClass");

  const sections = [
    { key: "vocabulary" as const, icon: BookOpen, value: null as string | null },
    { key: "grammar" as const, icon: PencilLine, value: null as string | null },
    { key: "speaking" as const, icon: Mic2, value: null as string | null },
    { key: "homework" as const, icon: ScrollText, value: null as string | null },
    {
      key: "generalNote" as const,
      icon: MessageSquareText,
      value: null as string | null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 print:hidden">
        <Link
          href="/parent"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" />
          {t("back")}
        </Link>
        <PrintButton label={t("print")} />
      </div>

      <header className="space-y-1 print:break-inside-avoid">
        <p className="text-muted-foreground text-xs uppercase tracking-wide print:hidden">
          {center?.name}
        </p>
        <p className="hidden text-sm font-medium print:block">
          {center?.name}
        </p>
        <p className="hidden text-xs uppercase tracking-wide print:block">
          {t("printHeading")}
        </p>
        <h1 className="inline-flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <GraduationCap className="text-amber-600 size-7 print:hidden" />
          {student.full_name}
        </h1>
        <p className="text-muted-foreground text-sm">{classLineText}</p>
        <p className="hidden text-xs print:block">
          {t("printedOn", { date: printedOn })}
        </p>
      </header>

      {lessons.length > 0 ? (
        <ul className="space-y-4">
          {lessons.map((l) => {
            const u = updateByLesson.get(l.id);
            const rating = u?.behavior_rating;
            const ratingTone = rating ? BEHAVIOR_TONES[rating] : null;
            const ratingLabel = rating ? tBehavior(rating) : null;
            const fields = [
              { ...sections[0], value: l.vocabulary },
              { ...sections[1], value: l.grammar_point },
              { ...sections[2], value: l.speaking_activity },
              { ...sections[3], value: l.homework },
              { ...sections[4], value: l.general_note },
            ].filter((f) => f.value);
            return (
              <li
                key={l.id}
                className="rounded-lg border bg-card p-4 shadow-sm print:break-inside-avoid print:bg-transparent print:border-black print:p-3 sm:p-5"
              >
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
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${ratingTone} print:bg-transparent print:border print:border-black`}
                    >
                      {ratingLabel}
                    </span>
                  ) : null}
                </div>

                {fields.length > 0 ? (
                  <dl className="mt-3 space-y-2.5 text-sm">
                    {fields.map((f) => {
                      const Icon = f.icon;
                      return (
                        <div
                          key={f.key}
                          className="grid grid-cols-[7rem_1fr] items-start gap-2 sm:grid-cols-[9rem_1fr]"
                        >
                          <dt className="text-muted-foreground inline-flex items-center gap-1.5">
                            <Icon className="size-3.5" />
                            {t(f.key)}
                          </dt>
                          <dd>{f.value}</dd>
                        </div>
                      );
                    })}
                  </dl>
                ) : null}

                {u ? (
                  <div className="bg-muted/40 mt-4 rounded-md p-3 text-sm print:bg-transparent print:border print:border-dashed print:border-black">
                    <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
                      <MessageSquareText className="size-3.5" />
                      {t("perStudentHeader")}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge
                        variant={u.homework_completed ? "default" : "outline"}
                        className="print:bg-transparent print:text-foreground print:border print:border-black"
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
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-12 text-center text-sm">
          <ClipboardList className="size-8 opacity-50" />
          <p>{t("noLessons")}</p>
        </div>
      )}
    </div>
  );
}
