import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  CalendarClock,
  Camera,
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
import { unreadCountsByStudent } from "@/lib/message-reads";
import { VN_TZ, vnTodayYMD } from "@/lib/vn-time";
import { signPhotoUrls } from "@/lib/photo-url";
import { buttonVariants } from "@/components/ui/button";
import { LevelSelect } from "@/components/level-select";
import { ConfirmSubmitButton } from "@/components/confirm-submit";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { parseDateOnly } from "@/lib/utils";
import { deleteLesson } from "./lessons/new/actions";
import { deleteStudentPhoto } from "./photo-actions";
import { PhotoUploadForm } from "./photo-upload-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ClassDetailPage(
  props: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ tab?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const user = await requireRole(["teacher", "admin"]);
  const activeTab: "students" | "lessons" | "messages" | "photos" =
    searchParams.tab === "lessons"
      ? "lessons"
      : searchParams.tab === "messages"
        ? "messages"
        : searchParams.tab === "photos"
          ? "photos"
          : "students";
  const supabase = await createClient();
  const t = await getTranslations("teacher.class");
  const tPhotos = await getTranslations("photos");
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
      .limit(50);
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
    const [msgRes, unreadByStudent] = await Promise.all([
      supabase
        .from("parent_teacher_messages")
        .select("student_id, sender_user_id, body, created_at")
        .in("student_id", studentIds)
        .order("created_at", { ascending: false })
        .limit(500),
      // Per-user unread counts (message_reads), not the shared read_at
      // flag — and counted server-side, so the 500-row preview cap above
      // can't undercount a chatty class.
      unreadCountsByStudent(supabase, studentIds, user.id),
    ]);
    if (!msgRes.error && msgRes.data) {
      type MsgRow = {
        student_id: string;
        sender_user_id: string;
        body: string;
        created_at: string;
      };
      const rows = msgRes.data as MsgRow[];
      for (const sid of studentIds) {
        const mine = rows.filter((r) => r.student_id === sid);
        const latest = mine[0];
        messageStats.set(sid, {
          total: mine.length,
          unread: unreadByStudent.get(sid) ?? 0,
          lastBody: latest?.body ?? null,
          lastAt: latest?.created_at ?? null,
        });
      }
    }
  }

  // Class photos, RLS-scoped (teacher → own uploads, admin → whole center),
  // narrowed to photos tagged to this class's roster. Fails silently to
  // zero if the db/student-photos.sql migration hasn't been run yet.
  // The full row fetch + signed-URL minting (a storage-API round trip)
  // happens ONLY on the photos tab; the other tabs need just the badge
  // count, which a head-only query answers.
  type PhotoRow = {
    id: string;
    storage_path: string;
    caption: string | null;
    taken_at: string;
    uploaded_by: string | null;
    tags: { student_id: string }[];
  };
  let photos: PhotoRow[] = [];
  let photoCount = 0;
  if (studentIds.length > 0) {
    if (activeTab === "photos") {
      const photosRes = await supabase
        .from("student_photos")
        .select(
          "id, storage_path, caption, taken_at, uploaded_by, tags:student_photo_tags!inner(student_id)",
        )
        .in("tags.student_id", studentIds)
        .order("taken_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      if (photosRes.error) {
        console.warn(
          "[teacher/class] student_photos select failed (migration not run?):",
          photosRes.error.message,
        );
      } else {
        photos = (photosRes.data ?? []) as PhotoRow[];
        photoCount = photos.length;
      }
    } else {
      const countRes = await supabase
        .from("student_photos")
        .select("id, tags:student_photo_tags!inner(student_id)", {
          count: "exact",
          head: true,
        })
        .in("tags.student_id", studentIds);
      if (!countRes.error) photoCount = countRes.count ?? 0;
    }
  }
  // Sign the private-bucket URLs in one batch; a photo that fails to sign
  // is simply not rendered.
  const photoUrls = await signPhotoUrls(photos);
  const studentNameById = new Map(
    (students ?? []).map((s) => [s.id, s.full_name]),
  );

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

      {/* Compute message stats once so the tab badge and the Messages
          tab body share the same data. */}
      {(() => null)()}

      {/* Top tabs — Students / Lessons / Messages. The previous layout
          floated messages as a sidebar; that worked but meant students
          and lessons crammed into one column with a long scroll. Tabs
          give each surface the full width and match the parent page
          pattern so teachers and parents have the same mental model. */}
      <nav className="border-b">
        {(() => {
          const totalUnread = (students ?? []).reduce(
            (sum, s) => sum + (messageStats.get(s.id)?.unread ?? 0),
            0,
          );
          const tabs = [
            {
              key: "students" as const,
              label: t("tabStudents"),
              icon: GraduationCap,
              count: students?.length ?? 0,
              showCount: true,
            },
            {
              key: "lessons" as const,
              label: t("tabLessons"),
              icon: ClipboardList,
              count: lessons?.length ?? 0,
              showCount: true,
            },
            {
              key: "photos" as const,
              label: tPhotos("tabPhotos"),
              icon: Camera,
              count: photoCount,
              showCount: photoCount > 0,
            },
            {
              key: "messages" as const,
              label: t("tabMessages"),
              icon: MessageSquareText,
              count: totalUnread,
              showCount: totalUnread > 0,
              urgent: totalUnread > 0,
            },
          ];
          return (
            <div className="-mb-px flex gap-1 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                const href =
                  tab.key === "students"
                    ? `/teacher/classes/${cls.id}`
                    : `/teacher/classes/${cls.id}?tab=${tab.key}`;
                return (
                  <Link
                    key={tab.key}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={
                      "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition " +
                      (active
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground")
                    }
                  >
                    <Icon className="size-4" />
                    {tab.label}
                    {tab.showCount ? (
                      <span
                        className={
                          "tabular-nums rounded-full px-1.5 text-[10px] font-semibold " +
                          (tab.urgent
                            ? "bg-primary text-primary-foreground"
                            : active
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground")
                        }
                      >
                        {tab.count}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          );
        })()}
      </nav>

      {/* Students tab */}
      {activeTab === "students" ? (
        <section className="space-y-3">
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
      ) : null}

      {/* Lessons tab — grouped by month, most recent open. */}
      {activeTab === "lessons" ? (
        <section className="space-y-4">
          {lessons && lessons.length > 0 ? (
            (() => {
              const byMonth = new Map<string, typeof lessons>();
              for (const l of lessons) {
                const d = parseDateOnly(l.lesson_date);
                if (!d) continue;
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                if (!byMonth.has(key)) byMonth.set(key, []);
                byMonth.get(key)!.push(l);
              }
              const monthLabel = (key: string) => {
                const [y, m] = key.split("-").map(Number);
                return new Date(y, m - 1).toLocaleDateString(dateLocale, {
                  year: "numeric",
                  month: "long",
                });
              };
              return Array.from(byMonth.entries()).map(
                ([monthKey, monthLessons], monthIdx) => (
                  <details
                    key={monthKey}
                    open={monthIdx === 0}
                    className="bg-card group rounded-xl border shadow-sm"
                  >
                    <summary className="hover:bg-muted/40 flex cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3 [&::-webkit-details-marker]:hidden">
                      <span className="inline-flex items-center gap-2">
                        <ClipboardList className="text-primary size-4" />
                        <span className="text-base font-semibold capitalize tracking-tight">
                          {monthLabel(monthKey)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          ({monthLessons.length})
                        </span>
                      </span>
                      <span className="text-muted-foreground text-xs transition group-open:rotate-180">
                        ▾
                      </span>
                    </summary>
                    <ul className="space-y-3 px-3 pb-3">
                      {monthLessons.map((l) => {
                        const titleParts = [
                          l.unit,
                          l.lesson_number,
                          l.topic,
                        ].filter(Boolean);
                        const hasTitle = titleParts.length > 0;
                        const fullDate =
                          parseDateOnly(l.lesson_date)?.toLocaleDateString(
                            dateLocale,
                            {
                              weekday: "long",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            },
                          ) ?? "";
                        const shortDate =
                          parseDateOnly(l.lesson_date)?.toLocaleDateString(
                            dateLocale,
                            {
                              weekday: "short",
                              day: "2-digit",
                              month: "2-digit",
                            },
                          ) ?? "";
                        return (
                          <li
                            key={l.id}
                            className="bg-card rounded-xl border p-4 shadow-sm transition hover:border-primary/30 hover:shadow-md sm:p-5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1 space-y-1.5">
                                <span className="bg-primary/10 text-primary inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
                                  {shortDate}
                                </span>
                                <h3 className="text-base font-semibold leading-tight sm:text-lg">
                                  {hasTitle ? titleParts.join(" — ") : fullDate}
                                </h3>
                                {hasTitle ? (
                                  <p className="text-muted-foreground text-xs">
                                    {fullDate}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 gap-1">
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
                                  <input
                                    type="hidden"
                                    name="lesson_id"
                                    value={l.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="class_id"
                                    value={cls.id}
                                  />
                                  <ConfirmSubmitButton
                                    confirmMessage={tForm("deleteConfirm")}
                                    ariaLabel={tForm("delete")}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </ConfirmSubmitButton>
                                </form>
                              </div>
                            </div>
                            {l.vocabulary || l.grammar_point || l.general_note ? (
                              <div className="mt-4 space-y-2.5 text-sm">
                                {l.vocabulary ? (
                                  <div className="bg-muted/40 rounded-lg border-l-4 border-primary/40 p-3">
                                    <p className="text-muted-foreground mb-0.5 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
                                      {t("vocabulary")}
                                    </p>
                                    <p className="text-foreground leading-relaxed">
                                      {l.vocabulary}
                                    </p>
                                  </div>
                                ) : null}
                                {l.grammar_point ? (
                                  <div className="bg-muted/40 rounded-lg border-l-4 border-primary/40 p-3">
                                    <p className="text-muted-foreground mb-0.5 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
                                      {t("grammar")}
                                    </p>
                                    <p className="text-foreground leading-relaxed">
                                      {l.grammar_point}
                                    </p>
                                  </div>
                                ) : null}
                                {l.general_note ? (
                                  <p className="text-muted-foreground italic leading-relaxed">
                                    {l.general_note}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                ),
              );
            })()
          ) : (
            <div className="bg-muted/30 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
              <div className="bg-background flex size-12 items-center justify-center rounded-full border">
                <ClipboardList className="text-muted-foreground size-5" />
              </div>
              <p className="text-muted-foreground text-sm">{t("noLessons")}</p>
            </div>
          )}
        </section>
      ) : null}

      {/* Photos tab — upload once, tag the students in the shot; each
          tagged student's parent sees the photo in their child's
          timeline. */}
      {activeTab === "photos" ? (
        <section className="space-y-4">
          {students && students.length > 0 ? (
            <PhotoUploadForm
              classId={cls.id}
              students={students.map((s) => ({
                id: s.id,
                full_name: s.full_name,
              }))}
              defaultDate={vnTodayYMD()}
            />
          ) : null}

          {photos.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {photos.map((p) => {
                const url = photoUrls.get(p.id);
                if (!url) return null;
                const dateLabel =
                  parseDateOnly(p.taken_at)?.toLocaleDateString(dateLocale, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  }) ?? p.taken_at;
                const names = p.tags
                  .map((tag) => studentNameById.get(tag.student_id))
                  .filter(Boolean)
                  .join(", ");
                const canDelete =
                  user.role === "admin" || p.uploaded_by === user.id;
                return (
                  <li
                    key={p.id}
                    className="space-y-1.5 rounded-lg border bg-card p-2 shadow-sm"
                  >
                    <PhotoLightbox
                      url={url}
                      alt={p.caption ?? tPhotos("photoAlt")}
                      caption={p.caption}
                      dateLabel={names ? `${dateLabel} — ${names}` : dateLabel}
                    />
                    {p.caption ? (
                      <p className="truncate text-xs" title={p.caption}>
                        {p.caption}
                      </p>
                    ) : null}
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className="text-muted-foreground min-w-0 truncate text-[11px]"
                        title={names}
                      >
                        {dateLabel}
                        {names ? ` — ${names}` : ""}
                      </p>
                      {canDelete ? (
                        <form action={deleteStudentPhoto}>
                          <input type="hidden" name="id" value={p.id} />
                          <input
                            type="hidden"
                            name="class_id"
                            value={cls.id}
                          />
                          <ConfirmSubmitButton
                            confirmMessage={tPhotos("deleteConfirm")}
                            ariaLabel={tPhotos("delete")}
                          >
                            <Trash2 className="size-3.5" />
                          </ConfirmSubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="bg-muted/30 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
              <div className="bg-background flex size-12 items-center justify-center rounded-full border">
                <Camera className="text-muted-foreground size-5" />
              </div>
              <p className="text-muted-foreground max-w-sm text-sm">
                {tPhotos("emptyClass")}
              </p>
            </div>
          )}
        </section>
      ) : null}

      {/* Messages tab — per-student thread list (was the sidebar). */}
      {activeTab === "messages"
        ? (() => {
            const messageableStudents = (students ?? []).filter(
              (s) => s.parent_user_id,
            );
            if (messageableStudents.length === 0) {
              return (
                <div className="bg-muted/30 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
                  <div className="bg-background flex size-12 items-center justify-center rounded-full border">
                    <MessageSquareText className="text-muted-foreground size-5" />
                  </div>
                  <p className="text-muted-foreground max-w-sm text-sm">
                    {tMessages("teacherSectionHelp")}
                  </p>
                </div>
              );
            }

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

            return (
              <section className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  {tMessages("teacherSectionHelp")}
                </p>
                <ul className="space-y-2">
                  {sorted.map((s) => {
                    const stats = messageStats.get(s.id);
                    const lastWhen = stats?.lastAt
                      ? new Date(stats.lastAt).toLocaleString(dateLocale, {
                          timeZone: VN_TZ,
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
                            unread > 0 ? "border-primary/30" : ""
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium">
                                {s.full_name}
                              </p>
                              {unread > 0 ? (
                                <span className="bg-primary text-primary-foreground inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
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
          })()
        : null}
    </div>
  );
}
