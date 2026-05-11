import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  Copy,
  GraduationCap,
  MessageSquareText,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { LevelSelect } from "@/components/level-select";
import { ConfirmSubmitButton } from "@/components/confirm-submit";
import { parseDateOnly } from "@/lib/utils";
import { deleteLesson } from "./lessons/new/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ClassDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole(["teacher", "admin"]);
  const supabase = createClient();
  const t = await getTranslations("teacher.class");
  const tHome = await getTranslations("teacher.home");
  const tStudent = await getTranslations("admin.students");
  const tForm = await getTranslations("teacher.lessonForm");
  const tLevel = await getTranslations("level");
  const tBehavior = await getTranslations("behavior");
  const tMessages = await getTranslations("messages");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, schedule_text, teacher_id, center_id")
    .eq("id", params.id)
    .single();

  if (!cls) notFound();
  if (cls.center_id !== user.center_id) notFound();
  if (user.role === "teacher" && cls.teacher_id !== user.id) notFound();

  // Try with the `topic` column; fall back if the migration hasn't been run.
  const lessonSelectWithTopic =
    "id, lesson_date, unit, lesson_number, topic, vocabulary, grammar_point, general_note";
  const lessonSelectNoTopic =
    "id, lesson_date, unit, lesson_number, vocabulary, grammar_point, general_note";

  const [{ data: students }, lessonsRes] = await Promise.all([
    supabase
      .from("students")
      .select(
        "id, full_name, age, overall_level, parent_user_id, parent:users!students_parent_user_id_fkey(full_name)",
      )
      .eq("class_id", cls.id)
      .order("full_name", { ascending: true }),
    supabase
      .from("lessons")
      .select(lessonSelectWithTopic)
      .eq("class_id", cls.id)
      .order("lesson_date", { ascending: false })
      .limit(10),
  ]);

  type LessonListRow = {
    id: string;
    lesson_date: string;
    unit: string | null;
    lesson_number: string | null;
    topic: string | null;
    vocabulary: string | null;
    grammar_point: string | null;
    general_note: string | null;
  };

  let lessons: LessonListRow[];
  if (lessonsRes.error) {
    console.warn(
      "[teacher/class] lessons select with topic failed, falling back:",
      lessonsRes.error.message,
    );
    const fallback = await supabase
      .from("lessons")
      .select(lessonSelectNoTopic)
      .eq("class_id", cls.id)
      .order("lesson_date", { ascending: false })
      .limit(10);
    lessons = ((fallback.data ?? []) as Omit<LessonListRow, "topic">[]).map(
      (l) => ({ ...l, topic: null }),
    );
  } else {
    lessons = (lessonsRes.data ?? []) as LessonListRow[];
  }

  // Per-student behavior trend: ratings from the 5 most recent lessons,
  // ordered newest-first, capped at 3 dots per student.
  const recentLessonIds = (lessons ?? []).slice(0, 5).map((l) => l.id);
  type UpdateRow = {
    student_id: string;
    lesson_id: string;
    behavior_rating: string | null;
  };
  const recentUpdatesRes = recentLessonIds.length
    ? await supabase
        .from("student_lesson_updates")
        .select("student_id, lesson_id, behavior_rating")
        .in("lesson_id", recentLessonIds)
    : { data: [] };
  const recentUpdates = (recentUpdatesRes.data ?? []) as UpdateRow[];

  const lessonOrder = new Map<string, number>();
  (lessons ?? []).forEach((l, idx) => lessonOrder.set(l.id, idx));

  const updatesByStudent: Record<string, UpdateRow[]> = {};
  for (const u of recentUpdates) {
    (updatesByStudent[u.student_id] ??= []).push(u);
  }
  const trendByStudent = new Map<string, Array<string | null>>();
  for (const sid of Object.keys(updatesByStudent)) {
    const updates = updatesByStudent[sid];
    updates.sort(
      (a, b) =>
        (lessonOrder.get(a.lesson_id) ?? 99) -
        (lessonOrder.get(b.lesson_id) ?? 99),
    );
    trendByStudent.set(
      sid,
      updates.slice(0, 3).map((u: UpdateRow) => u.behavior_rating),
    );
  }

  const TREND_DOT_TONES: Record<string, string> = {
    great: "bg-emerald-500",
    good: "bg-sky-500",
    okay: "bg-amber-500",
    needs_attention: "bg-rose-500",
  };

  // Per-student parent ↔ teacher message stats. Fail silently if the
  // migration hasn't been run yet.
  type StudentMessageStats = {
    total: number;
    unread: number;
    lastBody: string | null;
    lastAt: string | null;
  };
  const messageStats = new Map<string, StudentMessageStats>();
  const studentIds = (students ?? []).map((s) => s.id);
  if (studentIds.length > 0) {
    const msgRes = await supabase
      .from("parent_teacher_messages")
      .select("student_id, sender_user_id, body, created_at, read_at")
      .in("student_id", studentIds)
      .order("created_at", { ascending: false })
      .limit(500);
    if (!msgRes.error && msgRes.data) {
      type MsgRow = {
        student_id: string;
        sender_user_id: string;
        body: string;
        created_at: string;
        read_at: string | null;
      };
      const rows = msgRes.data as MsgRow[];
      for (const sid of studentIds) {
        const mine = rows.filter((r) => r.student_id === sid);
        const unread = mine.filter(
          (r) => r.sender_user_id !== user.id && r.read_at === null,
        ).length;
        const latest = mine[0];
        messageStats.set(sid, {
          total: mine.length,
          unread,
          lastBody: latest?.body ?? null,
          lastAt: latest?.created_at ?? null,
        });
      }
    }
  }
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/teacher"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="size-3.5" />
            {tHome("title")}
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {cls.name}
          </h1>
          <p className="text-muted-foreground mt-1 inline-flex items-center gap-1.5 text-sm">
            <CalendarClock className="size-3.5" />
            {cls.schedule_text ?? tHome("noSchedule")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {lessons && lessons.length > 0 ? (
            <Link
              href={`/teacher/classes/${cls.id}/lessons/new?from=${lessons[0].id}`}
              className={`${buttonVariants({ variant: "outline" })} inline-flex items-center gap-1.5`}
            >
              <Copy className="size-4" />
              {t("startFromLast")}
            </Link>
          ) : null}
          <Link
            href={`/teacher/classes/${cls.id}/lessons/new`}
            className={`${buttonVariants()} inline-flex items-center gap-1.5`}
          >
            <Plus className="size-4" />
            {t("newLesson")}
          </Link>
        </div>
      </div>

      {/* Messages section — first thing below the header so teacher sees
          new parent activity without scrolling. Capped height with internal
          scroll so a class with 30+ parents doesn't push everything down. */}
      {(() => {
        const messageableStudents = (students ?? []).filter(
          (s) => s.parent_user_id,
        );
        if (messageableStudents.length === 0) return null;

        const sorted = [...messageableStudents].sort((a, b) => {
          const sa = messageStats.get(a.id);
          const sb = messageStats.get(b.id);
          const ua = sa?.unread ?? 0;
          const ub = sb?.unread ?? 0;
          if (ua !== ub) return ub - ua;
          const ta = sa?.lastAt ? new Date(sa.lastAt).getTime() : 0;
          const tb = sb?.lastAt ? new Date(sb.lastAt).getTime() : 0;
          if (ta !== tb) return tb - ta;
          return a.full_name.localeCompare(b.full_name);
        });

        const totalUnread = sorted.reduce(
          (sum, s) => sum + (messageStats.get(s.id)?.unread ?? 0),
          0,
        );

        return (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquareText className="text-primary size-5" />
              <h2 className="text-xl font-semibold tracking-tight">
                {tMessages("classHeading")}
              </h2>
              {totalUnread > 0 ? (
                <span className="bg-rose-500 text-white inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold">
                  {totalUnread}
                </span>
              ) : null}
            </div>
            <p className="text-muted-foreground text-sm">
              {tMessages("teacherSectionHelp")}
            </p>
            <ul className="max-h-[20rem] space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-2 sm:max-h-[24rem]">
              {sorted.map((s) => {
                const stats = messageStats.get(s.id);
                const lastWhen = stats?.lastAt
                  ? new Date(stats.lastAt).toLocaleString(dateLocale, {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : null;
                const parent = Array.isArray(s.parent)
                  ? s.parent[0]
                  : s.parent;
                const hasMessages = (stats?.total ?? 0) > 0;
                const unread = stats?.unread ?? 0;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/teacher/classes/${cls.id}/messages/${s.id}`}
                      className={`bg-card hover:bg-muted/40 flex items-center justify-between gap-3 rounded-lg border p-3 transition ${
                        unread > 0 ? "border-rose-200" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium">
                            {s.full_name}
                          </p>
                          {unread > 0 ? (
                            <span className="bg-rose-500 text-white inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                              {unread}
                            </span>
                          ) : null}
                          {parent ? (
                            <span className="text-muted-foreground text-xs">
                              {tMessages("teacherSectionParent", {
                                name: parent.full_name,
                              })}
                            </span>
                          ) : null}
                        </div>
                        {hasMessages && stats?.lastBody ? (
                          <p className="text-muted-foreground truncate text-xs">
                            {stats.lastBody}
                          </p>
                        ) : (
                          <p className="text-muted-foreground truncate text-xs italic">
                            {tMessages("teacherSectionStart")}
                          </p>
                        )}
                      </div>
                      {lastWhen ? (
                        <span className="text-muted-foreground whitespace-nowrap text-xs">
                          {lastWhen}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })()}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-primary size-5" />
          <h2 className="text-xl font-semibold tracking-tight">
            {t("studentsHeader", { count: students?.length ?? 0 })}
          </h2>
        </div>
        <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tStudent("fullName")}</TableHead>
                <TableHead className="w-20">{tStudent("age")}</TableHead>
                <TableHead className="w-44">{tLevel("header")}</TableHead>
                <TableHead className="w-32">{t("recentTrend")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students && students.length > 0 ? (
                students.map((s) => {
                  const trend = trendByStudent.get(s.id) ?? [];
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.full_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.age ?? "—"}
                      </TableCell>
                      <TableCell>
                        <LevelSelect
                          studentId={s.id}
                          currentLevel={s.overall_level ?? null}
                        />
                      </TableCell>
                      <TableCell>
                        {trend.length > 0 ? (
                          <span
                            className="inline-flex items-center gap-1"
                            title={trend
                              .map((r) =>
                                r ? tBehavior(r as "great") : "—",
                              )
                              .join(" • ")}
                          >
                            {trend.map((r, i) => (
                              <span
                                key={i}
                                className={`size-2.5 rounded-full ${
                                  r && TREND_DOT_TONES[r]
                                    ? TREND_DOT_TONES[r]
                                    : "bg-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground py-6 text-center text-sm"
                  >
                    {t("noStudents")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="text-primary size-5" />
          <h2 className="text-xl font-semibold tracking-tight">
            {t("recentLessonsHeader")}
          </h2>
        </div>
        {lessons && lessons.length > 0 ? (
          <ul className="space-y-3">
            {lessons.map((l) => (
              <li
                key={l.id}
                className="rounded-lg border bg-card p-4 text-sm shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {(() => {
                        const parts = [l.unit, l.lesson_number, l.topic].filter(
                          Boolean,
                        );
                        return parts.length > 0
                          ? parts.join(" — ")
                          : parseDateOnly(l.lesson_date)?.toLocaleDateString(
                              dateLocale,
                              {
                                weekday: "long",
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              },
                            ) ?? "";
                      })()}
                    </p>
                    {l.unit || l.lesson_number || l.topic ? (
                      <p className="text-muted-foreground text-xs">
                        {parseDateOnly(l.lesson_date)?.toLocaleDateString(dateLocale, {
                          weekday: "long",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    <Link
                      href={`/teacher/classes/${cls.id}/lessons/${l.id}/edit`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                      aria-label={tForm("edit")}
                    >
                      <Pencil className="size-3.5" />
                    </Link>
                    <form action={deleteLesson}>
                      <input type="hidden" name="lesson_id" value={l.id} />
                      <input type="hidden" name="class_id" value={cls.id} />
                      <ConfirmSubmitButton
                        confirmMessage={tForm("deleteConfirm")}
                        ariaLabel={tForm("delete")}
                      >
                        <Trash2 className="size-3.5" />
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>
                {l.vocabulary ? (
                  <p className="text-muted-foreground mt-1">
                    <span className="text-foreground font-medium">
                      {t("vocabulary")}:
                    </span>{" "}
                    {l.vocabulary}
                  </p>
                ) : null}
                {l.grammar_point ? (
                  <p className="text-muted-foreground">
                    <span className="text-foreground font-medium">
                      {t("grammar")}:
                    </span>{" "}
                    {l.grammar_point}
                  </p>
                ) : null}
                {l.general_note ? (
                  <p className="text-muted-foreground mt-1">{l.general_note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-10 text-center text-sm">
            <ClipboardList className="size-8 opacity-50" />
            <p>{t("noLessons")}</p>
          </div>
        )}
      </section>

    </div>
  );
}
