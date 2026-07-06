import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  Camera,
  ClipboardList,
  FileText,
  MessageSquareText,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signWorksheetUrls } from "@/lib/worksheet-url";
import { signPhotoUrls } from "@/lib/photo-url";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/print-button";
import { ShareReportButton } from "@/components/share-report-button";
import { parseDateOnly } from "@/lib/utils";
import { VN_TZ } from "@/lib/vn-time";
import { MessageThread } from "@/components/message-thread";
import { markThreadRead } from "@/app/messages-actions";

export const dynamic = "force-dynamic";

// Behavior rating is real information → restrained green → amber → red.
const BEHAVIOR_TONES: Record<string, string> = {
  great: "bg-emerald-100 text-emerald-800",
  good: "bg-emerald-50 text-emerald-700",
  okay: "bg-amber-100 text-amber-800",
  needs_attention: "bg-red-100 text-red-800",
};

const LEVEL_TONES: Record<string, string> = {
  good: "bg-emerald-100 text-emerald-800 border-emerald-200",
  okay: "bg-amber-100 text-amber-800 border-amber-200",
  needs_attention: "bg-red-100 text-red-800 border-red-200",
};

type LessonRow = {
  id: string;
  lesson_date: string;
  unit: string | null;
  lesson_number: string | null;
  topic: string | null;
  /** Vocabulary, grammar, and the teacher's general note are pulled
   *  in for the printable PDF redesign. They're hidden from the
   *  on-screen lesson list (parents only need their child's
   *  individual feedback) but show up on the PDF as vocab chips,
   *  grammar callouts, and the teacher's monthly message. */
  vocabulary: string | null;
  grammar_point: string | null;
  general_note: string | null;
  worksheet:
    | { id: string; name: string; storage_path: string | null; public_url: string }
    | { id: string; name: string; storage_path: string | null; public_url: string }[]
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
  absent: "bg-red-100 text-red-800",
};

type PhotoView = { id: string; url: string; caption: string | null };

/** Label row + thumbnail grid for one day's photos — shared by the lesson
 *  card strip and the photo-only day card so the two can't drift. */
function PhotoStripBlock({
  photos,
  dateText,
  label,
}: {
  photos: PhotoView[];
  dateText: string;
  label: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
        <Camera className="size-3" />
        {label}
      </p>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {photos.map((p) => (
          <PhotoLightbox
            key={p.id}
            url={p.url}
            alt={p.caption ?? label}
            caption={p.caption}
            dateLabel={dateText}
          />
        ))}
      </div>
    </div>
  );
}

export default async function StudentProgressPage(
  props: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ tab?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const user = await requireRole("parent");
  const activeTab: "lessons" | "messages" =
    searchParams.tab === "messages" ? "messages" : "lessons";
  const supabase = await createClient();
  const t = await getTranslations("parent.student");
  const tHome = await getTranslations("parent.home");
  const tBehavior = await getTranslations("behavior");
  const tLevel = await getTranslations("level");
  const tWorksheets = await getTranslations("worksheets");
  const tPhotos = await getTranslations("photos");
  const tAttendance = await getTranslations("attendance");
  const tMessages = await getTranslations("messages");
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
    brand_color: string | null;
    show_pdf_credit: boolean | null;
  };
  const centerSelectFull =
    "name, logo_url, contact_email, contact_phone, report_intro_text, report_footer_text, report_show_summary, report_show_signatures, report_signature_label_left, report_signature_label_right, brand_color, show_pdf_credit";
  const centerSelectFallback =
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
    // If brand_color / show_pdf_credit columns aren't migrated yet
    // (center-branding.sql), retry with the prior column set so the
    // existing report customisation still works.
    if (/brand_color|show_pdf_credit/i.test(centerFullRes.error.message)) {
      const fb = await supabase
        .from("centers")
        .select(centerSelectFallback)
        .eq("id", user.center_id)
        .single();
      if (fb.data) {
        center = {
          ...(fb.data as Omit<CenterRow, "brand_color" | "show_pdf_credit">),
          brand_color: null,
          show_pdf_credit: true,
        };
      }
    } else {
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
          report_show_signatures: false,
          report_signature_label_left: null,
          report_signature_label_right: null,
          brand_color: null,
          show_pdf_credit: true,
        };
      }
    }
  }

  if (!student || student.parent_user_id !== user.id) notFound();

  // Mark teacher → parent messages as read — only when the parent is
  // actually on the messages tab. Marking on the default lessons tab would
  // flag messages read before they're seen (false "read" signal to the
  // teacher). We pass { revalidate: false } so the action doesn't call
  // revalidatePath during this render (which throws); read_at is committed
  // by the RPC and this force-dynamic page recomputes unread on next load.
  // Best-effort; ignore errors so the page renders regardless.
  if (activeTab === "messages") {
    const fd = new FormData();
    fd.append("student_id", student.id);
    await markThreadRead(fd, { revalidate: false }).catch(() => {});
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
        "id, lesson_date, unit, lesson_number, topic, vocabulary, grammar_point, general_note, worksheet:worksheets(id, name, storage_path, public_url)",
      )
      .eq("class_id", cls.id)
      .order("lesson_date", { ascending: false })
      .limit(100);
    if (withTopic.error) {
      console.warn(
        "[parent/student] lessons select with topic failed, falling back:",
        withTopic.error.message,
      );
      const fallback = await supabase
        .from("lessons")
        .select(
          "id, lesson_date, unit, lesson_number, vocabulary, grammar_point, general_note, worksheet:worksheets(id, name, storage_path, public_url)",
        )
        .eq("class_id", cls.id)
        .order("lesson_date", { ascending: false })
        .limit(100);
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

  // Swap each lesson's worksheet.public_url for a short-lived signed URL.
  // We flatten the (possibly array-wrapped) embedded worksheet rows across
  // all lessons, sign them in ONE batch, then write the signed URL back onto
  // each row under the same `public_url` field so the render below is
  // unchanged. Signing fails soft — rows keep their public_url fallback.
  const worksheetRows = lessons
    .map((l) => (Array.isArray(l.worksheet) ? l.worksheet[0] : l.worksheet))
    .filter((w): w is NonNullable<typeof w> => !!w);
  if (worksheetRows.length > 0) {
    const signed = await signWorksheetUrls(worksheetRows);
    for (const w of worksheetRows) {
      w.public_url = signed.get(w.id) ?? w.public_url;
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

  // Photos tagged to THIS child. RLS only ever returns photos with a tag
  // pointing at the caller's own child; the !inner filter narrows to this
  // student. Fails silently to [] if the db/student-photos.sql migration
  // hasn't been run yet. URLs are signed in one batch (private bucket) and
  // a photo that fails to sign is simply not rendered — no broken images.
  // Fetched only on the lessons tab: the messages tab never shows photos
  // (they're print:hidden inside the print-only timeline), so the fetch +
  // signing round trips would be pure waste there.
  const photosByDate = new Map<string, PhotoView[]>();
  if (activeTab === "lessons") {
    const photosRes = await supabase
      .from("student_photos")
      .select(
        "id, storage_path, caption, taken_at, tags:student_photo_tags!inner(student_id)",
      )
      .eq("tags.student_id", student.id)
      .order("taken_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (photosRes.error) {
      console.warn(
        "[parent/student] student_photos select failed (migration not run?):",
        photosRes.error.message,
      );
    } else {
      const rows = (photosRes.data ?? []) as Array<{
        id: string;
        storage_path: string;
        caption: string | null;
        taken_at: string;
      }>;
      const signed = await signPhotoUrls(rows);
      for (const row of rows) {
        const url = signed.get(row.id);
        if (!url) continue;
        const list = photosByDate.get(row.taken_at) ?? [];
        list.push({ id: row.id, url, caption: row.caption });
        photosByDate.set(row.taken_at, list);
      }
    }
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

  // Attendance summary across the same monthly window. Present + late
  // both count as "showed up" — being a few minutes late shouldn't drop
  // a kid's attendance below 100% on this card.
  const monthAttendanceTotal = monthlyUpdates.filter(
    (u) => u.attendance,
  ).length;
  const monthPresentish = monthlyUpdates.filter(
    (u) => u.attendance === "present" || u.attendance === "late",
  ).length;
  const monthAttendancePct =
    monthAttendanceTotal > 0
      ? Math.round((monthPresentish / monthAttendanceTotal) * 100)
      : null;

  // Dominant behavior rating in the period for the "behavior" card.
  const topBehaviorEntry = (
    Object.entries(behaviorCounts) as [keyof typeof BEHAVIOR_TONES, number][]
  )
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])[0];
  const topBehavior = topBehaviorEntry ? topBehaviorEntry[0] : null;

  const printedOn = new Date().toLocaleDateString(dateLocale, {
    timeZone: VN_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Report period = the rolling 30-day window the summary stats cover
  // (thirtyDaysAgo → today). Anchoring to the window — rather than the
  // oldest/newest lesson on file — keeps the header range consistent
  // with the "30 ngày gần nhất" figures below, instead of spanning the
  // student's entire lesson history.
  const fmtDateObj = (d: Date) =>
    d.toLocaleDateString(dateLocale, {
      timeZone: VN_TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  const periodFrom = lessons.length > 0 ? fmtDateObj(thirtyDaysAgo) : null;
  const periodTo = lessons.length > 0 ? fmtDateObj(new Date()) : null;

  // ---------------- PDF-only derived content -----------------
  // Everything below is consumed by the print-only blocks lower in
  // the file. Keeping the derivations here so the JSX stays scannable.

  /** Two-letter initials from the center name for the auto-generated
   *  letterhead avatar (shown when no logo_url is set). Takes the
   *  first letter of the first two non-trivial words, falls back to
   *  the first two letters of a single-word name. */
  const centerInitials = (() => {
    const name = (center?.name ?? "").trim();
    if (!name) return "?";
    const words = name.split(/\s+/).filter((w) => w.length > 0);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  })();

  /** Vocabulary chips for the printed report. The teacher writes
   *  vocabulary as free text (commas, semicolons, or newlines —
   *  whichever feels natural). Split + trim + cap at 8 visible so
   *  one lesson card doesn't dominate the page. */
  function vocabChipsFromLesson(raw: string | null): string[] {
    if (!raw) return [];
    return raw
      .split(/[\n,;·]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 40)
      .slice(0, 8);
  }

  /** Auto-generate up to 3 highlights from the monthly data. The
   *  parent's screenshottable moment — pick the most positive,
   *  specific signals available. */
  const highlights: string[] = [];
  if (monthAttendancePct !== null && monthAttendancePct >= 90) {
    highlights.push(
      t("highlightAttendance", { pct: monthAttendancePct }),
    );
  }
  if (
    monthHomeworkPct !== null &&
    monthHomeworkTotal > 0 &&
    monthHomeworkPct >= 80
  ) {
    highlights.push(
      t("highlightHomework", {
        done: monthHomeworkDone,
        total: monthHomeworkTotal,
      }),
    );
  }
  if (behaviorCounts.great > 0) {
    highlights.push(
      t("highlightBehaviorGreat", { n: behaviorCounts.great }),
    );
  } else if (behaviorCounts.good > 0 && highlights.length < 3) {
    highlights.push(t("highlightBehaviorGood", { n: behaviorCounts.good }));
  }

  /** Auto-generate gentle recommendations — only when actually
   *  needed. Worded as growth, never as criticism. */
  const recommendations: string[] = [];
  if (
    monthHomeworkPct !== null &&
    monthHomeworkTotal > 0 &&
    monthHomeworkPct < 70
  ) {
    recommendations.push(
      t("recommendHomework", {
        done: monthHomeworkDone,
        total: monthHomeworkTotal,
      }),
    );
  }
  if (monthAttendancePct !== null && monthAttendancePct < 85) {
    recommendations.push(t("recommendAttendance"));
  }
  if (behaviorCounts.needs_attention > 0) {
    recommendations.push(t("recommendBehavior"));
  }

  /** Teacher's monthly message — sourced from the most recent
   *  lesson's general_note. If teachers want to write a per-month
   *  narrative just for this student, that lives in a future
   *  feature; for now the most recent class-wide note is the
   *  closest existing field. */
  const teacherMonthlyNote = (() => {
    for (const l of monthlyLessons) {
      const note = (l.general_note ?? "").trim();
      if (note.length > 0) return note;
    }
    return null;
  })();

  /** Teacher's initial for the avatar circle in the monthly-note
   *  block. Falls back to "?" so the layout never breaks. */
  const teacherInitial = (() => {
    const name: string = String(teacher?.full_name ?? "").trim();
    if (!name) return "?";
    const words: string[] = name.split(/\s+/).filter((w) => w.length > 0);
    return (words[words.length - 1]?.[0] ?? name[0] ?? "?").toUpperCase();
  })();

  /** Brand color for the PDF accent bar. Reads center.brand_color
   *  when the column exists (db/center-branding.sql), falls back to
   *  the platform's default blue. Inlined as a CSS variable in
   *  page-level style so print stylesheet rules can use it without
   *  hard-coding hex values. */
  const brandColor =
    (center as { brand_color?: string | null } | null)?.brand_color?.trim() ||
    "#2563EB";
  const showCredit =
    (center as { show_pdf_credit?: boolean | null } | null)
      ?.show_pdf_credit !== false;

  // Strip a leading "Lớp " the class name may already carry so the
  // "Lớp {className}" template can't double up ("Lớp Lớp Senior B").
  const cleanClassName = (cls?.name ?? "").replace(/^\s*Lớp\s+/i, "").trim();
  const classLineText = cls
    ? teacher
      ? t("classWithTeacher", {
          className: cleanClassName,
          teacher: teacher.full_name,
        })
      : t("classLine", { className: cleanClassName })
    : t("noClass");

  return (
    <div className="app-dark-screen -mx-4 -my-6 min-h-[calc(100dvh-7rem)] space-y-6 bg-navy px-4 py-6 text-white print:m-0 print:min-h-0 print:space-y-0 print:bg-white print:p-0 print:text-black sm:-mx-6 sm:px-6 sm:py-8">
      <div className="flex items-start justify-between gap-3 print:hidden">
        <Link
          href="/parent"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" />
          {t("back")}
        </Link>
        <div className="flex items-center gap-2">
          <ShareReportButton
            label={t("share")}
            copiedLabel={t("shareCopied")}
            shareTitle={t("shareTitle", { name: student.full_name })}
          />
          <PrintButton label={t("print")} generatingLabel={t("printing")} />
        </div>
      </div>
      {/* On-screen hero card — calm white surface, single-accent
          initials avatar. No role-colored wash or strip. */}
      <section className="relative overflow-hidden rounded-2xl border bg-card shadow-sm print:hidden">
        <div className="space-y-5 p-5 sm:p-7">
          {center?.name ? (
            <div className="flex items-center gap-2">
              {center?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                (<img
                  src={center.logo_url}
                  alt={center?.name ?? ""}
                  className="size-7 rounded-md object-contain p-0.5"
                />)
              ) : null}
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                {center?.name}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="bg-emerald/15 text-emerald-light ring-emerald/30 flex size-14 shrink-0 items-center justify-center rounded-full text-xl font-bold ring-1 sm:size-16 sm:text-2xl">
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
        </div>
      </section>
      {/* Stats strip — neutral cards. Attendance/homework still carry
          their tier through the number color (real status); lessons +
          behavior are plain. Hidden on print since the formal
          letterhead summarises. */}
      {lessons.length > 0 ? (
        <section className="grid grid-cols-2 gap-3 print:hidden sm:grid-cols-4">
          <div className="bg-card flex flex-col gap-1 rounded-xl border p-3 shadow-sm sm:p-4">
            <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide sm:text-xs">
              {t("heroLessonsLabel")}
            </span>
            <span className="text-2xl font-semibold tabular-nums sm:text-3xl">
              {monthlyLessons.length || lessons.length}
            </span>
          </div>

          <div className="bg-card flex flex-col gap-1 rounded-xl border p-3 shadow-sm sm:p-4">
            <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide sm:text-xs">
              {t("heroAttendanceLabel")}
            </span>
            <span
              className={`text-2xl font-semibold tabular-nums sm:text-3xl ${
                monthAttendancePct === null
                  ? ""
                  : monthAttendancePct >= 90
                    ? "text-emerald-light"
                    : monthAttendancePct >= 75
                      ? "text-amber-light"
                      : "text-red-400"
              }`}
            >
              {monthAttendancePct === null ? "—" : `${monthAttendancePct}%`}
            </span>
          </div>

          <div className="bg-card flex flex-col gap-1 rounded-xl border p-3 shadow-sm sm:p-4">
            <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide sm:text-xs">
              {t("heroHomeworkLabel")}
            </span>
            <span
              className={`text-2xl font-semibold tabular-nums sm:text-3xl ${
                monthHomeworkPct === null
                  ? ""
                  : monthHomeworkPct >= 80
                    ? "text-emerald-light"
                    : monthHomeworkPct >= 60
                      ? "text-amber-light"
                      : "text-red-400"
              }`}
            >
              {monthHomeworkPct === null ? "—" : `${monthHomeworkPct}%`}
            </span>
          </div>

          <div className="bg-card flex flex-col gap-1 rounded-xl border p-3 shadow-sm sm:p-4">
            <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide sm:text-xs">
              {t("heroBehaviorLabel")}
            </span>
            {topBehavior ? (
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-sm font-semibold ${BEHAVIOR_TONES[topBehavior]}`}
                >
                  {tBehavior(topBehavior)}
                </span>
                {behaviorTotal > 1 ? (
                  <span className="text-muted-foreground text-xs">
                    {behaviorCounts[topBehavior]}/{behaviorTotal}
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="text-muted-foreground text-2xl">—</span>
            )}
          </div>
        </section>
      ) : null}
      {/* Print-only report — redesigned letterhead, stat cards,
          highlights, suggestions, teacher message. Each block is
          print-only; the on-screen view above is untouched. The
          per-element style="--brand-color" sets a CSS custom
          property the print stylesheet reads for the accent strip
          and section underlines. */}
      <div
        className="print-only"
        style={
          { "--brand-color": brandColor } as React.CSSProperties
        }
      >
        {/* Letterhead */}
        <div className="report-letterhead">
          <div className="report-brand-row">
            {center?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              (<img
                src={center.logo_url}
                alt={center?.name ?? ""}
                className="report-logo"
              />)
            ) : (
              <div className="report-initials" aria-hidden="true">
                {centerInitials}
              </div>
            )}
            <div className="report-brand-text">
              <div className="report-center-name">{center?.name}</div>
              {center?.contact_phone || center?.contact_email ? (
                <div className="report-contact">
                  {center?.contact_phone ?? ""}
                  {center?.contact_phone && center?.contact_email
                    ? " · "
                    : ""}
                  {center?.contact_email ?? ""}
                </div>
              ) : null}
            </div>
          </div>
          <div className="report-printed-on">
            {t("printedOn", { date: printedOn })}
          </div>
        </div>
        <div className="report-accent-bar" />

        {/* Headline */}
        <div className="report-headline">
          <div className="report-eyebrow">{t("reportEyebrow")}</div>
          <h1 className="report-student-name">{student.full_name}</h1>
          <div className="report-class-line">
            {cls?.name ?? "—"}
            {teacher ? ` · ${teacher.full_name}` : ""}
          </div>
          {periodFrom && periodTo ? (
            <div className="report-period">
              {t("reportPeriod", { from: periodFrom, to: periodTo })}
            </div>
          ) : null}
        </div>

        {center?.report_intro_text ? (
          <p className="report-intro">{center.report_intro_text}</p>
        ) : null}

        {/* Stat cards */}
        <div className="report-stats">
          <div className="report-stat stat-blue">
            <div className="stat-label">{t("statLessonsLabel")}</div>
            <div className="stat-value">{monthlyLessons.length}</div>
            <div className="stat-context">
              {t("statLessonsContext", {
                total: lessons.length,
              })}
            </div>
          </div>
          {monthHomeworkPct !== null ? (
            <div className="report-stat stat-emerald">
              <div className="stat-label">{t("statHomeworkLabel")}</div>
              <div className="stat-value">{monthHomeworkPct}%</div>
              <div className="stat-context">
                {monthHomeworkDone}/{monthHomeworkTotal} {t("statHomeworkSuffix")}
              </div>
            </div>
          ) : null}
          {monthAttendancePct !== null ? (
            <div
              className={
                "report-stat " +
                (monthAttendancePct >= 90
                  ? "stat-emerald"
                  : monthAttendancePct >= 70
                    ? "stat-amber"
                    : "stat-rose")
              }
            >
              <div className="stat-label">{t("statAttendanceLabel")}</div>
              <div className="stat-value">{monthAttendancePct}%</div>
              <div className="stat-context">
                {monthAttendancePct >= 90
                  ? t("statAttendanceLabelGreat")
                  : monthAttendancePct >= 70
                    ? t("statAttendanceLabelGood")
                    : t("statAttendanceLabelLow")}
              </div>
            </div>
          ) : null}
          {topBehavior ? (
            <div className="report-stat stat-violet">
              <div className="stat-label">{t("statBehaviorLabel")}</div>
              <div className="stat-value stat-value-text">
                {tBehavior(topBehavior)}
              </div>
              <div className="stat-context">
                {behaviorCounts[topBehavior]}/{behaviorTotal}{" "}
                {t("statBehaviorSuffix")}
              </div>
            </div>
          ) : null}
        </div>

        {/* Highlights (auto-generated) */}
        {highlights.length > 0 ? (
          <section className="report-callout report-callout-highlights">
            <h2 className="report-callout-heading">
              ★ {t("highlightsHeading")}
            </h2>
            <ul className="report-callout-list">
              {highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Suggestions (auto-generated) */}
        {recommendations.length > 0 ? (
          <section className="report-callout report-callout-suggestions">
            <h2 className="report-callout-heading">
              {t("suggestionsHeading")}
            </h2>
            <ul className="report-callout-list">
              {recommendations.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Teacher message (from most recent general_note) */}
        {teacherMonthlyNote ? (
          <section className="report-teacher-note">
            <h2 className="report-section-heading">
              {t("teacherMessageHeading")}
            </h2>
            <div className="report-teacher-line">
              <span className="report-teacher-avatar" aria-hidden="true">
                {teacherInitial}
              </span>
              <span className="report-teacher-name">
                {teacher?.full_name ?? "—"}
              </span>
            </div>
            <p className="report-teacher-body">{teacherMonthlyNote}</p>
          </section>
        ) : null}
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
                                ? "bg-emerald-400"
                                : k === "okay"
                                  ? "bg-amber-500"
                                  : "bg-red-500"
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
      {/* Tab bar — splits the page into Buổi học / Tin nhắn so parents
          land on a focused view instead of scrolling through everything.
          Hidden on print: the printed report still includes both the
          lesson log and the (printable) summary. */}
      <nav className="border-b print:hidden">
        <div className="-mb-px flex gap-1 overflow-x-auto">
          {(
            [
              { key: "lessons", label: t("tabLessons"), icon: ClipboardList },
              { key: "messages", label: t("tabMessages"), icon: MessageSquareText },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            const href =
              tab.key === "lessons"
                ? `/parent/students/${student.id}`
                : `/parent/students/${student.id}?tab=${tab.key}`;
            return (
              <Link
                key={tab.key}
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition " +
                  (active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground")
                }
              >
                <Icon className="size-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
      {/* On-screen tab content — only the active tab renders. */}
      {activeTab === "messages" ? (
        <section className="space-y-3 print:hidden">
          <div className="flex items-center gap-2">
            <MessageSquareText className="text-primary size-5" />
            <h2 className="text-xl font-semibold tracking-tight">
              {tMessages("messagesHeading")}
            </h2>
          </div>
          <p className="text-muted-foreground text-sm">
            {tMessages("messagesHelp")}
          </p>
          <MessageThread
            studentId={student.id}
            currentUserId={user.id}
            emptyHint={tMessages("messagesEmpty")}
          />
        </section>
      ) : null}
      {/* Print-only section heading before the lesson log */}
      {lessons.length > 0 ? (
        <div className="report-section-heading print-only">
          {t("lessonLogHeading")}
        </div>
      ) : null}
      {/* Lessons tab content (also always rendered for print). The lessons
          are grouped by month with <details> so a long history doesn't
          require scrolling past 30 cards — older months collapse. The
          most recent month is open by default. */}
      <div
        className={
          activeTab === "lessons"
            ? "space-y-4 print:space-y-2"
            : "hidden print:block print:space-y-2"
        }
      >
        {lessons.length > 0 || photosByDate.size > 0 ? (
          (() => {
            // Merge lessons and photo-days into ONE timeline: photos taken
            // on a lesson day render inside that day's lesson card; photos
            // on days without a lesson get their own dated card.
            type TimelineItem = {
              date: string;
              lesson: (typeof lessons)[number] | null;
              photos: PhotoView[];
            };
            const lessonDates = new Set(lessons.map((l) => l.lesson_date));
            const items: TimelineItem[] = [
              ...lessons.map((l) => ({
                date: l.lesson_date,
                lesson: l as (typeof lessons)[number] | null,
                photos: photosByDate.get(l.lesson_date) ?? [],
              })),
              ...Array.from(photosByDate.entries())
                .filter(([date]) => !lessonDates.has(date))
                .map(([date, photos]) => ({ date, lesson: null, photos })),
            ].sort((a, b) => b.date.localeCompare(a.date));

            // Group by year-month, newest first.
            const byMonth = new Map<string, TimelineItem[]>();
            for (const item of items) {
              const d = parseDateOnly(item.date);
              if (!d) continue;
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              if (!byMonth.has(key)) byMonth.set(key, []);
              byMonth.get(key)!.push(item);
            }
            const monthLabel = (key: string) => {
              const [y, m] = key.split("-").map(Number);
              return new Date(y, m - 1).toLocaleDateString(dateLocale, {
                year: "numeric",
                month: "long",
              });
            };
            const entries = Array.from(byMonth.entries());
            // The print/PDF report only shows OPEN <details>. Open the
            // newest month that actually contains lessons — a newer
            // photo-only month (photos are print:hidden) must not steal
            // the slot and produce an empty printed report.
            const firstLessonMonthIdx = entries.findIndex(([, items]) =>
              items.some((i) => i.lesson),
            );
            const openIdx = firstLessonMonthIdx === -1 ? 0 : firstLessonMonthIdx;
            return entries.map(([monthKey, monthItems], monthIdx) => {
              const monthLessonCount = monthItems.filter(
                (i) => i.lesson,
              ).length;
              return (
              <details
                key={monthKey}
                open={monthIdx === openIdx}
                className={
                  "bg-card group rounded-xl border shadow-sm print:border-0 print:bg-transparent print:shadow-none" +
                  // A month with only photo-days contributes nothing to the
                  // printed report — don't print its empty shell.
                  (monthLessonCount === 0 ? " print:hidden" : "")
                }
              >
                <summary className="hover:bg-muted/40 flex cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden print:hidden">
                  <span className="inline-flex items-center gap-2">
                    <ClipboardList className="text-primary size-4" />
                    <span className="text-base font-semibold capitalize tracking-tight">
                      {monthLabel(monthKey)}
                    </span>
                    {monthLessonCount > 0 ? (
                      <span className="text-muted-foreground text-xs">
                        ({monthLessonCount})
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground text-xs transition group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <ul className="space-y-3 px-3 pb-3 print:p-0">
                  {monthItems.map((item) => {
            // A day with photos but no lesson gets its own compact card
            // (screen only — the printed report stays lessons-only).
            if (!item.lesson) {
              const dateText =
                parseDateOnly(item.date)?.toLocaleDateString(dateLocale, {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                }) ?? "";
              return (
                <li
                  key={`photos-${item.date}`}
                  className="rounded-xl border bg-card p-3.5 shadow-sm sm:p-5 print:hidden"
                >
                  <span className="bg-primary/10 text-primary inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
                    {dateText}
                  </span>
                  <div className="mt-3">
                    <PhotoStripBlock
                      photos={item.photos}
                      dateText={dateText}
                      label={tPhotos("timelineLabel")}
                    />
                  </div>
                </li>
              );
            }
            const l = item.lesson;
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
            const titleParts = [l.unit, l.lesson_number, l.topic].filter(
              Boolean,
            );
            const titleText =
              titleParts.length > 0 ? titleParts.join(" — ") : null;
            return (
              <li
                key={l.id}
                className="rounded-xl border bg-card p-3.5 shadow-sm transition duration-200 hover:border-primary/30 hover:shadow-md sm:p-5 print:break-inside-avoid print:bg-transparent print:border-black print:p-3"
              >
                {/* Header: date chip + topic on one row; badges on a
                    second row on mobile so they don't crowd the title
                    on a narrow viewport. Badges stay inline-with-title
                    at sm+ where there's room. */}
                <div className="space-y-2 sm:flex sm:flex-wrap sm:items-start sm:justify-between sm:gap-3 sm:space-y-0">
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="bg-primary/10 text-primary inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide print:bg-transparent print:border print:border-black">
                      {dateText}
                    </span>
                    <h3 className="text-base font-semibold leading-tight sm:text-xl">
                      {titleText ?? dateText}
                    </h3>
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

                {/* On-screen vocabulary chips — the pitch shows parents
                    "today's vocabulary", so the words the class learned
                    are surfaced on the phone, not only on the PDF. The
                    printed report renders its own compact vocab/grammar
                    block below (this one is print:hidden to avoid a
                    duplicate). */}
                {(() => {
                  const vocabChips = vocabChipsFromLesson(l.vocabulary);
                  if (vocabChips.length === 0) return null;
                  return (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 print:hidden">
                      <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
                        {t("printVocabLabel")}
                      </span>
                      {vocabChips.map((v) => (
                        <span
                          key={v}
                          className="bg-primary/10 text-primary inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  );
                })()}

                {/* Print-only vocab/grammar enrichment. Rendered on the
                    PDF so the report shows what was actually taught.
                    Chips are kept compact so even a long vocab list fits
                    on one printed page. */}
                {(() => {
                  const vocabChips = vocabChipsFromLesson(l.vocabulary);
                  const grammar = (l.grammar_point ?? "").trim();
                  if (vocabChips.length === 0 && !grammar) return null;
                  return (
                    <div className="hidden print:mt-2 print:block print:space-y-1.5">
                      {vocabChips.length > 0 ? (
                        <div className="report-vocab-row">
                          <span className="report-vocab-label">
                            {t("printVocabLabel")}
                          </span>
                          <span className="report-vocab-chips">
                            {vocabChips.map((v) => (
                              <span key={v} className="report-vocab-chip">
                                {v}
                              </span>
                            ))}
                          </span>
                        </div>
                      ) : null}
                      {grammar ? (
                        <div className="report-grammar-row">
                          <span className="report-grammar-label">
                            {t("printGrammarLabel")}
                          </span>
                          <span className="report-grammar-text">
                            {grammar}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}

                {/* Per-child feedback (parent only sees the unit/lesson
                    label above plus their own child's feedback below).
                    The note callout uses a quiet muted panel with a
                    single-accent left rule so it reads as personal
                    without a decorative role tint. */}
                {u ? (
                  <div className="mt-3.5 space-y-3 text-sm sm:mt-4">
                    {u.individual_note ? (
                      <div className="bg-muted/50 border-l-4 border-primary rounded-r-md p-3 print:bg-transparent print:border-black">
                        <p className="text-primary mb-0.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide print:text-foreground">
                          <MessageSquareText className="size-3" />
                          {t("teacherNoteLabel")}
                        </p>
                        <p className="text-foreground leading-relaxed">
                          {u.individual_note}
                        </p>
                      </div>
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
                          className="text-primary inline-flex min-h-9 items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted/40 print:hidden"
                        >
                          <FileText className="size-3.5" />
                          {tWorksheets("viewAttachment")}
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {/* Photos from this day, tagged to this child (screen
                    only — the printed report stays text-based). */}
                {item.photos.length > 0 ? (
                  <div className="mt-3.5 print:hidden">
                    <PhotoStripBlock
                      photos={item.photos}
                      dateText={dateText}
                      label={tPhotos("timelineLabel")}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
                </ul>
              </details>
              );
            });
          })()
        ) : (
          <div className="bg-muted/30 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center print:hidden">
            <div className="bg-background flex size-12 items-center justify-center rounded-full border">
              <ClipboardList className="text-muted-foreground size-5" />
            </div>
            <p className="text-muted-foreground text-sm">{t("noLessons")}</p>
          </div>
        )}
      </div>
      {/* Print-only signature + footer */}
      <div
        className="print-only"
        style={
          { "--brand-color": brandColor } as React.CSSProperties
        }
      >
        {/* Signatures are now off by default — parents don't sign
            PDFs. Centers who actually want them (e.g. for printed
            archives) can opt back in via report_show_signatures. */}
        {center?.report_show_signatures === true ? (
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

        {/* Tagline — center-provided custom thank-you, or the
            default 'Cảm ơn anh/chị đã tin tưởng X' worded with the
            center's name when no custom value is set. */}
        <p className="report-tagline">
          {center?.report_footer_text?.trim() ||
            t("reportTaglineDefault", { center: center?.name ?? "" })}
        </p>

        {/* Contact strip — repeated at the bottom so the parent can
            reach the center without scrolling back to the header. */}
        {center?.contact_phone || center?.contact_email ? (
          <div className="report-contact-strip">
            {t("contactLabel")}:{" "}
            {center?.contact_phone ?? ""}
            {center?.contact_phone && center?.contact_email ? " · " : ""}
            {center?.contact_email ?? ""}
          </div>
        ) : null}

        <div className="report-footer">
          <span>
            {showCredit
              ? t("createdWithCredit")
              : ""}
          </span>
          <span>{t("printedOn", { date: printedOn })}</span>
        </div>
      </div>
    </div>
  );
}
