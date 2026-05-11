import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  MessageSquareText,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/print-button";
import { parseDateOnly } from "@/lib/utils";
import { MessageThread } from "@/components/message-thread";
import { markThreadRead } from "@/app/messages-actions";

export const dynamic = "force-dynamic";

const BEHAVIOR_TONES: Record<string, string> = {
  great: "bg-emerald-100 text-emerald-800",
  good: "bg-sky-100 text-sky-800",
  okay: "bg-amber-100 text-amber-800",
  needs_attention: "bg-rose-100 text-rose-800",
};

const LEVEL_TONES: Record<string, string> = {
  good: "bg-emerald-100 text-emerald-800 border-emerald-200",
  okay: "bg-amber-100 text-amber-800 border-amber-200",
  needs_attention: "bg-rose-100 text-rose-800 border-rose-200",
};

type LessonRow = {
  id: string;
  lesson_date: string;
  unit: string | null;
  lesson_number: string | null;
  topic: string | null;
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
  attendance?: "present" | "absent" | "late" | null;
};

const ATTENDANCE_TONES: Record<string, string> = {
  present: "bg-emerald-100 text-emerald-800",
  late: "bg-amber-100 text-amber-800",
  absent: "bg-rose-100 text-rose-800",
};

export default async function StudentProgressPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole("parent");
  const supabase = createClient();
  const t = await getTranslations("parent.student");
  const tHome = await getTranslations("parent.home");
  const tBehavior = await getTranslations("behavior");
  const tLevel = await getTranslations("level");
  const tWorksheets = await getTranslations("worksheets");
  const tAttendance = await getTranslations("attendance");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  // Try the full center select (with report-settings columns from
  // db/report-settings.sql); fall back to the basic select if the report
  // columns don't exist yet so the page still renders.
  type CenterRow = {
    name: string | null;
    logo_url: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    report_intro_text: string | null;
    report_footer_text: string | null;
    report_show_summary: boolean | null;
    report_show_signatures: boolean | null;
    report_signature_label_left: string | null;
    report_signature_label_right: string | null;
  };
  const centerSelectFull =
    "name, logo_url, contact_email, contact_phone, report_intro_text, report_footer_text, report_show_summary, report_show_signatures, report_signature_label_left, report_signature_label_right";
  const centerSelectBasic = "name, logo_url, contact_email, contact_phone";

  const [studentRes, centerFullRes] = await Promise.all([
    supabase
      .from("students")
      .select(
        "id, full_name, age, parent_user_id, overall_level, class:classes(id, name, teacher:users!classes_teacher_id_fkey(full_name))",
      )
      .eq("id", params.id)
      .single(),
    supabase
      .from("centers")
      .select(centerSelectFull)
      .eq("id", user.center_id)
      .single(),
  ]);
  const student = studentRes.data;

  let center: CenterRow | null = (centerFullRes.data as CenterRow | null) ?? null;
  if (centerFullRes.error) {
    console.warn(
      "[parent/student] center select with report columns failed, falling back:",
      centerFullRes.error.message,
    );
    const basic = await supabase
      .from("centers")
      .select(centerSelectBasic)
      .eq("id", user.center_id)
      .single();
    if (basic.data) {
      center = {
        ...(basic.data as Pick<
          CenterRow,
          "name" | "logo_url" | "contact_email" | "contact_phone"
        >),
        report_intro_text: null,
        report_footer_text: null,
        report_show_summary: true,
        report_show_signatures: true,
        report_signature_label_left: null,
        report_signature_label_right: null,
      };
    }
  }

  if (!student || student.parent_user_id !== user.id) notFound();

  // Mark teacher → parent messages as read when the parent opens the page.
  // Best-effort; ignore errors so the page renders even if the migration
  // hasn't been applied.
  {
    const fd = new FormData();
    fd.append("student_id", student.id);
    await markThreadRead(fd).catch(() => {});
  }

  const cls = Array.isArray(student.class) ? student.class[0] : student.class;
  const teacher = cls
    ? Array.isArray(cls.teacher)
      ? cls.teacher[0]
      : cls.teacher
    : null;

  // Lessons. Try with the `topic` column first; if that errors (e.g. the
  // db/lesson-topic.sql migration hasn't been run yet) fall back to a
  // query without it so the page still renders.
  let lessons: LessonRow[] = [];
  if (cls) {
    const withTopic = await supabase
      .from("lessons")
      .select(
        "id, lesson_date, unit, lesson_number, topic, worksheet:worksheets(id, name, public_url)",
      )
      .eq("class_id", cls.id)
      .order("lesson_date", { ascending: false })
      .limit(20);
    if (withTopic.error) {
      console.warn(
        "[parent/student] lessons select with topic failed, falling back:",
        withTopic.error.message,
      );
      const fallback = await supabase
        .from("lessons")
        .select(
          "id, lesson_date, unit, lesson_number, worksheet:worksheets(id, name, public_url)",
        )
        .eq("class_id", cls.id)
        .order("lesson_date", { ascending: false })
        .limit(20);
      if (fallback.error) {
        console.error(
          "[parent/student] lessons fallback also failed:",
          fallback.error.message,
        );
      }
      lessons = (fallback.data ?? []).map((l) => ({
        ...(l as Omit<LessonRow, "topic">),
        topic: null,
      }));
    } else {
      lessons = (withTopic.data ?? []) as LessonRow[];
    }
  }

  // Try with attendance column; fall back if migration not run.
  const updatesWithAttendance = await supabase
    .from("student_lesson_updates")
    .select(
      "lesson_id, behavior_rating, individual_note, homework_completed, attendance",
    )
    .eq("student_id", student.id)
    .in(
      "lesson_id",
      lessons.map((l) => l.id),
    );
  let updatesData = updatesWithAttendance.data;
  if (updatesWithAttendance.error) {
    const fallback = await supabase
      .from("student_lesson_updates")
      .select("lesson_id, behavior_rating, individual_note, homework_completed")
      .eq("student_id", student.id)
      .in(
        "lesson_id",
        lessons.map((l) => l.id),
      );
    updatesData = (fallback.data ?? []).map((r) => ({ ...r, attendance: null }));
  }
  const updatesRes = { data: updatesData };

  const updateByLesson = new Map<string, UpdateRow>();
  for (const u of (updatesRes.data ?? []) as UpdateRow[]) {
    updateByLesson.set(u.lesson_id, u);
  }

  // Last-30-days summary across the lessons we just fetched. We compute on the
  // server so the parent-facing card is in the initial HTML.
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const monthlyLessons = lessons.filter((l) => {
    const d = parseDateOnly(l.lesson_date);
    return d !== null && d >= thirtyDaysAgo;
  });
  const monthlyUpdates = monthlyLessons
    .map((l) => updateByLesson.get(l.id))
    .filter((u): u is UpdateRow => Boolean(u));
  const monthHomeworkTotal = monthlyUpdates.length;
  const monthHomeworkDone = monthlyUpdates.filter(
    (u) => u.homework_completed,
  ).length;
  const monthHomeworkPct =
    monthHomeworkTotal > 0
      ? Math.round((monthHomeworkDone / monthHomeworkTotal) * 100)
      : null;
  const behaviorCounts: Record<string, number> = {
    great: 0,
    good: 0,
    okay: 0,
    needs_attention: 0,
  };
  for (const u of monthlyUpdates) {
    if (u.behavior_rating && u.behavior_rating in behaviorCounts) {
      behaviorCounts[u.behavior_rating]++;
    }
  }
  const behaviorTotal = Object.values(behaviorCounts).reduce(
    (a, b) => a + b,
    0,
  );

  const printedOn = new Date().toLocaleDateString(dateLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Date range for the report period (oldest → newest among rendered lessons).
  const fmtDate = (d: string) =>
    parseDateOnly(d)?.toLocaleDateString(dateLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) ?? "";
  const periodFrom =
    lessons.length > 0
      ? fmtDate(lessons[lessons.length - 1].lesson_date)
      : null;
  const periodTo = lessons.length > 0 ? fmtDate(lessons[0].lesson_date) : null;

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

      {/* On-screen hero card — friendly, colorful summary of the child */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-violet-100/50 to-rose-100/40 p-6 sm:p-7 print:hidden">
        <div className="absolute -right-10 -top-10 size-40 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute -left-8 -bottom-8 size-32 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="relative space-y-5">
          {center?.name ? (
            <div className="flex items-center gap-2">
              {center?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={center.logo_url}
                  alt={center?.name ?? ""}
                  className="size-7 rounded-md object-contain bg-background/60 p-0.5"
                />
              ) : null}
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                {center?.name}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="bg-amber-100 text-amber-700 ring-card flex size-14 shrink-0 items-center justify-center rounded-full text-xl font-bold ring-4 sm:size-16 sm:text-2xl">
              {student.full_name.trim().split(/\s+/).slice(-1)[0]?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-[10rem] space-y-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {student.full_name}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                {student.overall_level &&
                LEVEL_TONES[student.overall_level] ? (
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${LEVEL_TONES[student.overall_level]}`}
                    title={tLevel("header")}
                  >
                    {tLevel(
                      student.overall_level as
                        | "good"
                        | "okay"
                        | "needs_attention",
                    )}
                  </span>
                ) : null}
                {student.age !== null && student.age !== undefined ? (
                  <span className="text-muted-foreground text-xs">
                    {tHome("ageLabel", { n: student.age })}
                  </span>
                ) : null}
              </div>
              <p className="text-muted-foreground text-sm">{classLineText}</p>
            </div>
          </div>

          {/* Quick stats row */}
          {lessons.length > 0 ? (
            <dl className="grid grid-cols-3 gap-2 rounded-xl bg-background/70 p-3 backdrop-blur-sm sm:gap-3 sm:p-4">
              <div>
                <dt className="text-muted-foreground text-xs uppercase tracking-wide">
                  {t("heroLessonsLabel")}
                </dt>
                <dd className="mt-0.5 text-xl font-bold sm:text-2xl">
                  {monthlyLessons.length || lessons.length}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase tracking-wide">
                  {t("heroHomeworkLabel")}
                </dt>
                <dd className="mt-0.5 text-xl font-bold text-emerald-700 sm:text-2xl">
                  {monthHomeworkPct === null ? "—" : `${monthHomeworkPct}%`}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs uppercase tracking-wide">
                  {t("heroBehaviorLabel")}
                </dt>
                <dd className="mt-1 inline-flex items-center gap-1">
                  {(["great", "good", "okay", "needs_attention"] as const)
                    .filter((k) => behaviorCounts[k] > 0)
                    .slice(0, 4)
                    .map((k) => (
                      <span
                        key={k}
                        className={`size-2.5 rounded-full ${
                          k === "great"
                            ? "bg-emerald-500"
                            : k === "good"
                              ? "bg-sky-500"
                              : k === "okay"
                                ? "bg-amber-500"
                                : "bg-rose-500"
                        }`}
                        title={`${behaviorCounts[k]}`}
                      />
                    ))}
                  {behaviorTotal === 0 ? (
                    <span className="text-muted-foreground text-sm">—</span>
                  ) : null}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      </section>

      {/* Print-only formal report header */}
      <div className="print-only">
        <div className="report-letterhead">
          <div className="flex items-start gap-3">
            {center?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={center.logo_url}
                alt={center?.name ?? ""}
                style={{ width: "56px", height: "56px", objectFit: "contain" }}
              />
            ) : null}
            <div className="report-center-name">{center?.name}</div>
          </div>
          {center?.contact_email || center?.contact_phone ? (
            <div className="report-contact">
              {center?.contact_phone ? <div>{center.contact_phone}</div> : null}
              {center?.contact_email ? <div>{center.contact_email}</div> : null}
            </div>
          ) : null}
        </div>

        <div className="report-title">{t("printHeading")}</div>
        {periodFrom && periodTo ? (
          <div className="report-period">
            {t("reportPeriod", { from: periodFrom, to: periodTo })}
          </div>
        ) : null}
        {center?.report_intro_text ? (
          <p
            className="report-intro"
            style={{
              marginTop: "0.6rem",
              fontSize: "10pt",
              whiteSpace: "pre-wrap",
            }}
          >
            {center.report_intro_text}
          </p>
        ) : null}

        <div className="report-info">
          <dl>
            <dt>{t("infoStudent")}</dt>
            <dd>{student.full_name}</dd>
            <dt>{t("infoAge")}</dt>
            <dd>{student.age ?? "—"}</dd>
            <dt>{t("infoClass")}</dt>
            <dd>{cls?.name ?? "—"}</dd>
            <dt>{t("infoTeacher")}</dt>
            <dd>{teacher?.full_name ?? "—"}</dd>
            <dt>{tLevel("header")}</dt>
            <dd>
              {student.overall_level
                ? tLevel(
                    student.overall_level as
                      | "good"
                      | "okay"
                      | "needs_attention",
                  )
                : tLevel("none")}
            </dd>
            <dt>{t("infoLessonsRecorded")}</dt>
            <dd>{lessons.length}</dd>
          </dl>
        </div>
      </div>

      {/* 30-day summary: hidden on screen (parents found it noisy) but
          still rendered in the printed report when report_show_summary
          is on, so the formal PDF keeps the stats block. */}
      {monthlyLessons.length > 0 && center?.report_show_summary !== false ? (
        <section
          className="hidden rounded-lg border bg-card p-4 shadow-sm print:block print:break-inside-avoid print:border-black print:bg-transparent"
        >
          <h2 className="text-sm font-semibold tracking-tight">
            {t("monthlyTitle")}
          </h2>
          <p className="text-muted-foreground text-xs">
            {t("monthlySubtitle", { count: monthlyLessons.length })}
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                {t("monthlyLessonsLabel")}
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {monthlyLessons.length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                {t("monthlyHomeworkLabel")}
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {monthHomeworkPct === null ? "—" : `${monthHomeworkPct}%`}
              </p>
              {monthHomeworkTotal > 0 ? (
                <p className="text-muted-foreground text-xs">
                  {t("monthlyHomeworkDetail", {
                    done: monthHomeworkDone,
                    total: monthHomeworkTotal,
                  })}
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                {t("monthlyBehaviorLabel")}
              </p>
              {behaviorTotal > 0 ? (
                <ul className="mt-1 space-y-0.5 text-sm">
                  {(
                    [
                      "great",
                      "good",
                      "okay",
                      "needs_attention",
                    ] as const
                  )
                    .filter((k) => behaviorCounts[k] > 0)
                    .map((k) => (
                      <li key={k} className="flex items-center gap-2">
                        <span
                          className={`inline-block size-2.5 rounded-full ${
                            k === "great"
                              ? "bg-emerald-500"
                              : k === "good"
                                ? "bg-sky-500"
                                : k === "okay"
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                          }`}
                        />
                        <span className="font-medium">{behaviorCounts[k]}</span>
                        <span className="text-muted-foreground">
                          {tBehavior(k)}
                        </span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-muted-foreground mt-1 text-sm">—</p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Private message thread with the teacher (hidden in print) */}
      <section className="space-y-3 print:hidden">
        <div className="flex items-center gap-2">
          <MessageSquareText className="text-primary size-5" />
          <h2 className="text-xl font-semibold tracking-tight">
            {t("messagesHeading")}
          </h2>
        </div>
        <p className="text-muted-foreground text-sm">
          {t("messagesHelp")}
        </p>
        <MessageThread
          studentId={student.id}
          currentUserId={user.id}
          emptyHint={t("messagesEmpty")}
        />
      </section>

      {/* Print-only section heading before the lesson log */}
      {lessons.length > 0 ? (
        <div className="report-section-heading print-only">
          {t("lessonLogHeading")}
        </div>
      ) : null}

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
            const dateText =
              parseDateOnly(l.lesson_date)?.toLocaleDateString(dateLocale, {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
              }) ?? "";
            return (
              <li
                key={l.id}
                className="rounded-lg border bg-card p-4 shadow-sm print:break-inside-avoid print:bg-transparent print:border-black print:p-3"
              >
                {/* Header line: unit/lesson identifier + behavior badge */}
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold">
                      {(() => {
                        const parts = [l.unit, l.lesson_number, l.topic].filter(
                          Boolean,
                        );
                        return parts.length > 0
                          ? parts.join(" — ")
                          : dateText;
                      })()}
                    </h2>
                    {l.unit || l.lesson_number || l.topic ? (
                      <p className="text-muted-foreground text-xs">
                        {dateText}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {u?.attendance && ATTENDANCE_TONES[u.attendance] ? (
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${ATTENDANCE_TONES[u.attendance]} print:bg-transparent print:border print:border-black`}
                      >
                        {tAttendance(u.attendance)}
                      </span>
                    ) : null}
                    {ratingLabel && ratingTone ? (
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${ratingTone} print:bg-transparent print:border print:border-black`}
                      >
                        {ratingLabel}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Per-child feedback (the parent only sees the unit/lesson
                    label above plus their own child's feedback below — the
                    vocab/grammar/etc. is for teachers, not parents). */}
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

      {/* Print-only signature + footer */}
      <div className="print-only">
        {center?.report_show_signatures !== false ? (
          <div className="report-signatures">
            <div className="report-sig-block">
              <div className="report-sig-label">
                {center?.report_signature_label_left?.trim() || t("sigTeacher")}
              </div>
              <div className="report-sig-hint">{t("sigSignAndDate")}</div>
              <div className="report-sig-line">{teacher?.full_name ?? ""}</div>
            </div>
            <div className="report-sig-block">
              <div className="report-sig-label">
                {center?.report_signature_label_right?.trim() || t("sigParent")}
              </div>
              <div className="report-sig-hint">{t("sigSignAndDate")}</div>
              <div className="report-sig-line">&nbsp;</div>
            </div>
          </div>
        ) : null}
        {center?.report_footer_text ? (
          <p
            style={{
              marginTop: "1rem",
              fontSize: "9.5pt",
              whiteSpace: "pre-wrap",
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            {center.report_footer_text}
          </p>
        ) : null}
        <div className="report-footer">
          <span>{center?.name}</span>
          <span>{t("printedOn", { date: printedOn })}</span>
        </div>
      </div>
    </div>
  );
}
