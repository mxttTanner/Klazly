import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  GraduationCap,
  MessageSquareText,
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
  title: string | null;
  worksheet:
    | { id: string; name: string; public_url: string }
    | { id: string; name: string; public_url: string }[]
    | null;
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
  const tWorksheets = await getTranslations("worksheets");
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
      .select("name, logo_url")
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
          "id, lesson_date, title, worksheet:worksheets(id, name, public_url)",
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

      <header className="space-y-2 print:break-inside-avoid">
        <div className="flex items-center gap-3">
          {center?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={center.logo_url}
              alt={center?.name ?? ""}
              className="size-10 rounded-md object-contain"
            />
          ) : null}
          <div className="space-y-0.5">
            <p className="text-muted-foreground text-xs uppercase tracking-wide print:hidden">
              {center?.name}
            </p>
            <p className="hidden text-sm font-medium print:block">
              {center?.name}
            </p>
            <p className="hidden text-xs uppercase tracking-wide print:block">
              {t("printHeading")}
            </p>
          </div>
        </div>
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
        <ul className="space-y-3">
          {lessons.map((l) => {
            const u = updateByLesson.get(l.id);
            const rating = u?.behavior_rating;
            const ratingTone = rating ? BEHAVIOR_TONES[rating] : null;
            const ratingLabel = rating ? tBehavior(rating) : null;
            const ws = Array.isArray(l.worksheet)
              ? l.worksheet[0]
              : l.worksheet;
            const dateText = new Date(l.lesson_date).toLocaleDateString(
              dateLocale,
              {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
              },
            );
            return (
              <li
                key={l.id}
                className="rounded-lg border bg-card p-4 shadow-sm print:break-inside-avoid print:bg-transparent print:border-black print:p-3"
              >
                {/* Header line: title (or fallback to date) + behavior badge */}
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold">
                      {l.title ?? dateText}
                    </h2>
                    {l.title ? (
                      <p className="text-muted-foreground text-xs">
                        {dateText}
                      </p>
                    ) : null}
                  </div>
                  {ratingLabel && ratingTone ? (
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${ratingTone} print:bg-transparent print:border print:border-black`}
                    >
                      {ratingLabel}
                    </span>
                  ) : null}
                </div>

                {/* Per-child feedback (the only "reading" content for parents) */}
                {u ? (
                  <div className="mt-3 space-y-2 text-sm">
                    {u.individual_note ? (
                      <p className="flex gap-2">
                        <MessageSquareText className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                        <span>{u.individual_note}</span>
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={u.homework_completed ? "default" : "outline"}
                        className="print:bg-transparent print:text-foreground print:border print:border-black"
                      >
                        {u.homework_completed
                          ? t("homeworkDone")
                          : t("homeworkNotDone")}
                      </Badge>
                      {ws ? (
                        <a
                          href={ws.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-0.5 text-xs font-medium hover:bg-muted/40 print:hidden"
                        >
                          <FileText className="size-3.5" />
                          {tWorksheets("viewAttachment")}
                        </a>
                      ) : null}
                    </div>
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
