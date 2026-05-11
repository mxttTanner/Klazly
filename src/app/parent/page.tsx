import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  BookOpen,
  CalendarClock,
  ChevronRight,
  GraduationCap,
  MessageSquareText,
  Sparkles,
  UserCircle2,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseDateOnly } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Warm avatar tones, picked deterministically from the student name so each
// child keeps the same colour across visits.
const AVATAR_TONES = [
  "bg-rose-100 text-rose-700 ring-rose-200",
  "bg-amber-100 text-amber-700 ring-amber-200",
  "bg-emerald-100 text-emerald-700 ring-emerald-200",
  "bg-sky-100 text-sky-700 ring-sky-200",
  "bg-violet-100 text-violet-700 ring-violet-200",
  "bg-pink-100 text-pink-700 ring-pink-200",
  "bg-teal-100 text-teal-700 ring-teal-200",
  "bg-indigo-100 text-indigo-700 ring-indigo-200",
];

const HEADER_GRADIENTS = [
  "from-rose-400/30 to-amber-400/30",
  "from-amber-400/30 to-emerald-400/30",
  "from-emerald-400/30 to-sky-400/30",
  "from-sky-400/30 to-violet-400/30",
  "from-violet-400/30 to-pink-400/30",
  "from-pink-400/30 to-rose-400/30",
  "from-teal-400/30 to-emerald-400/30",
  "from-indigo-400/30 to-sky-400/30",
];

function hashIndex(s: string, mod: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % mod;
}

const LEVEL_TONES: Record<string, string> = {
  good: "bg-emerald-100 text-emerald-800 border-emerald-200",
  okay: "bg-amber-100 text-amber-800 border-amber-200",
  needs_attention: "bg-rose-100 text-rose-800 border-rose-200",
};

const BEHAVIOR_DOT: Record<string, string> = {
  great: "bg-emerald-500",
  good: "bg-sky-500",
  okay: "bg-amber-500",
  needs_attention: "bg-rose-500",
};

function initial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  const last = parts[parts.length - 1];
  return last.charAt(0).toUpperCase();
}

export default async function ParentHomePage() {
  const user = await requireRole("parent");
  const supabase = createClient();
  const t = await getTranslations("parent.home");
  const tLevel = await getTranslations("level");
  const tBehavior = await getTranslations("behavior");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  const { data: studentsData } = await supabase
    .from("students")
    .select(
      "id, full_name, age, overall_level, class_id, class:classes(id, name, schedule_text, teacher:users!classes_teacher_id_fkey(full_name))",
    )
    .eq("parent_user_id", user.id)
    .order("full_name", { ascending: true });

  type StudentRow = {
    id: string;
    full_name: string;
    age: number | null;
    overall_level: string | null;
    class_id: string | null;
    class: {
      id: string;
      name: string;
      schedule_text: string | null;
      teacher: { full_name: string } | { full_name: string }[] | null;
    } | {
      id: string;
      name: string;
      schedule_text: string | null;
      teacher: { full_name: string } | { full_name: string }[] | null;
    }[] | null;
  };
  const students = (studentsData ?? []) as StudentRow[];

  // Fetch the last few lesson dates + this student's behavior ratings for
  // each child so the card can show a 3-dot trend and a "last seen" line.
  const studentIds = students.map((s) => s.id);
  const classIds = students
    .map((s) => {
      const c = Array.isArray(s.class) ? s.class[0] : s.class;
      return c?.id ?? null;
    })
    .filter((v): v is string => Boolean(v));

  type LessonRow = { id: string; class_id: string; lesson_date: string };
  type UnreadRow = { student_id: string };

  // Lessons (needs classIds) and unread messages (only needs studentIds)
  // can run in parallel. Updates has to wait for lessons.
  const [lessonsRes, unreadRes] = await Promise.all([
    classIds.length
      ? supabase
          .from("lessons")
          .select("id, class_id, lesson_date")
          .in("class_id", classIds)
          .order("lesson_date", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] as LessonRow[], error: null }),
    studentIds.length
      ? supabase
          .from("parent_teacher_messages")
          .select("student_id")
          .in("student_id", studentIds)
          .neq("sender_user_id", user.id)
          .is("read_at", null)
      : Promise.resolve({ data: [] as UnreadRow[], error: null }),
  ]);
  const allLessons = (lessonsRes.data ?? []) as LessonRow[];

  type UpdateRow = {
    student_id: string;
    lesson_id: string;
    behavior_rating: string | null;
  };
  const updatesRes =
    studentIds.length && allLessons.length
      ? await supabase
          .from("student_lesson_updates")
          .select("student_id, lesson_id, behavior_rating")
          .in("student_id", studentIds)
          .in(
            "lesson_id",
            allLessons.map((l) => l.id),
          )
      : { data: [] as UpdateRow[] };
  const allUpdates = (updatesRes.data ?? []) as UpdateRow[];

  // Unread message count per student (messages NOT sent by this parent and
  // with no read_at). Fails soft if the messages table doesn't exist.
  const unreadByStudent = new Map<string, number>();
  if (!("error" in unreadRes ? unreadRes.error : null) && unreadRes.data) {
    for (const row of unreadRes.data as UnreadRow[]) {
      unreadByStudent.set(
        row.student_id,
        (unreadByStudent.get(row.student_id) ?? 0) + 1,
      );
    }
  }

  // Build helpers per student.
  const lessonsByClass = new Map<string, LessonRow[]>();
  for (const l of allLessons) {
    (lessonsByClass.get(l.class_id) ?? lessonsByClass.set(l.class_id, []).get(l.class_id))!.push(l);
  }
  const updatesByStudent = new Map<string, UpdateRow[]>();
  for (const u of allUpdates) {
    const arr = updatesByStudent.get(u.student_id) ?? [];
    arr.push(u);
    updatesByStudent.set(u.student_id, arr);
  }

  return (
    <div className="space-y-8">
      {/* Friendly greeting */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-violet-100/40 to-rose-100/40 p-6 sm:p-8">
        <div className="absolute -right-8 -top-8 size-32 rounded-full bg-amber-200/40 blur-2xl" />
        <div className="absolute -left-6 -bottom-6 size-28 rounded-full bg-sky-200/40 blur-2xl" />
        <div className="relative space-y-1.5">
          <p className="text-primary inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
            <Sparkles className="size-3.5" />
            {t("greetingEyebrow")}
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {user.full_name
              ? t("greetingNamed", { name: user.full_name })
              : t("title")}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {students.length === 0
              ? t("subtitle")
              : students.length === 1
                ? t("greetingOneChild")
                : t("greetingManyChildren", { n: students.length })}
          </p>
        </div>
      </div>

      {students.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {students.map((s) => {
            const cls = Array.isArray(s.class) ? s.class[0] : s.class;
            const teacher = cls
              ? Array.isArray(cls.teacher)
                ? cls.teacher[0]
                : cls.teacher
              : null;
            const avatarTone = AVATAR_TONES[hashIndex(s.full_name, AVATAR_TONES.length)];
            const headerGrad =
              HEADER_GRADIENTS[hashIndex(s.full_name, HEADER_GRADIENTS.length)];

            // Trend = behavior ratings for this student in the last 3 of their
            // class's lessons (already sorted desc by date).
            const myClassLessons = cls
              ? (lessonsByClass.get(cls.id) ?? []).slice(0, 3)
              : [];
            const myUpdates = updatesByStudent.get(s.id) ?? [];
            const trend = myClassLessons.map((l) => {
              const u = myUpdates.find((u) => u.lesson_id === l.id);
              return u?.behavior_rating ?? null;
            });
            const lastDate = myClassLessons[0]?.lesson_date;
            const lastDateText = lastDate
              ? parseDateOnly(lastDate)?.toLocaleDateString(dateLocale, {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                }) ?? null
              : null;

            return (
              <Link
                key={s.id}
                href={`/parent/students/${s.id}`}
                className="group bg-card relative flex flex-col overflow-hidden rounded-2xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className={`relative h-16 bg-gradient-to-br ${headerGrad}`}>
                  {(unreadByStudent.get(s.id) ?? 0) > 0 ? (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                      <MessageSquareText className="size-3" />
                      {unreadByStudent.get(s.id)}
                    </span>
                  ) : null}
                </div>
                <div className="-mt-8 flex flex-col items-start gap-3 px-5 pb-5">
                  <div
                    className={`flex size-16 items-center justify-center rounded-full ring-4 ring-card text-2xl font-bold ${avatarTone}`}
                  >
                    {initial(s.full_name)}
                  </div>
                  <div className="w-full space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-xl font-semibold tracking-tight">
                        {s.full_name}
                      </h2>
                      <ChevronRight className="text-muted-foreground group-hover:text-foreground size-4 transition" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {s.overall_level && LEVEL_TONES[s.overall_level] ? (
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${LEVEL_TONES[s.overall_level]}`}
                        >
                          {tLevel(
                            s.overall_level as
                              | "good"
                              | "okay"
                              | "needs_attention",
                          )}
                        </span>
                      ) : null}
                      {s.age !== null && s.age !== undefined ? (
                        <span className="text-muted-foreground text-xs">
                          {t("ageLabel", { n: s.age })}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-muted-foreground w-full space-y-1.5 text-sm">
                    {cls ? (
                      <>
                        <p className="inline-flex items-center gap-2">
                          <BookOpen className="text-violet-600 size-3.5" />
                          <span className="text-foreground font-medium">
                            {cls.name}
                          </span>
                        </p>
                        {teacher ? (
                          <p className="inline-flex items-center gap-2">
                            <UserCircle2 className="size-3.5" />
                            {teacher.full_name}
                          </p>
                        ) : null}
                        {cls.schedule_text ? (
                          <p className="inline-flex items-center gap-2">
                            <CalendarClock className="size-3.5" />
                            {cls.schedule_text}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p>{t("noClass")}</p>
                    )}
                  </div>

                  {/* Trend + last seen */}
                  {trend.length > 0 ? (
                    <div className="bg-muted/40 mt-1 flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">
                          {t("recentTrend")}
                        </span>
                        <span className="mt-1 inline-flex items-center gap-1.5">
                          {trend.map((r, i) => (
                            <span
                              key={i}
                              className={`size-2.5 rounded-full ${
                                r && BEHAVIOR_DOT[r]
                                  ? BEHAVIOR_DOT[r]
                                  : "bg-muted-foreground/30"
                              }`}
                              title={
                                r
                                  ? tBehavior(
                                      r as
                                        | "great"
                                        | "good"
                                        | "okay"
                                        | "needs_attention",
                                    )
                                  : ""
                              }
                              aria-label={
                                r
                                  ? tBehavior(
                                      r as
                                        | "great"
                                        | "good"
                                        | "okay"
                                        | "needs_attention",
                                    )
                                  : ""
                              }
                            />
                          ))}
                        </span>
                      </div>
                      {lastDateText ? (
                        <div className="text-right">
                          <span className="text-muted-foreground text-xs">
                            {t("lastLesson")}
                          </span>
                          <p className="text-foreground text-sm font-medium">
                            {lastDateText}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-12 text-center text-sm">
          <GraduationCap className="size-8 opacity-50" />
          <p>{t("empty")}</p>
        </div>
      )}
    </div>
  );
}
