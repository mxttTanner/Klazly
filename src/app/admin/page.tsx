import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  GraduationCap,
  Heart,
  ListChecks,
  Rocket,
  Users,
  UserSquare2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { parseDateOnly } from "@/lib/utils";
import { toneForProgram } from "@/lib/programs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function weekAgoIsoDate(): string {
  // Compute "6 days ago in the server's local time" without bouncing through
  // toISOString — that conversion runs in UTC and shifts the date by one in
  // any timezone east of UTC (i.e. Vietnam), making the week filter exclude
  // lessons that happened "today".
  const d = new Date();
  d.setDate(d.getDate() - 6);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: { program?: string; activity?: string };
}) {
  const activeActivity: "teachers" | "lessons" =
    searchParams.activity === "lessons" ? "lessons" : "teachers";
  const supabase = createClient();
  const t = await getTranslations("admin.dashboard");
  const tClasses = await getTranslations("admin.classes");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";
  const weekStart = weekAgoIsoDate();

  // Filter: any non-empty string is treated as a program label (the catalog
  // lives in the DB now, so we don't validate against a hardcoded list).
  // Special "unset" sentinel = classes with no program.
  const filterProgram = searchParams.program?.trim() || null;

  type LessonAgg = {
    id: string;
    teacher_id: string;
    class_id: string;
    lesson_date: string;
  };
  type ClassAgg = { teacher_id: string | null };

  // Fetch class details. Program/book are optional columns from later
  // migrations — fall back gracefully if the DB doesn't have them yet.
  type ClassFull = {
    id: string;
    name: string;
    schedule_text: string | null;
    book: string | null;
    program: string | null;
    teacher_id: string | null;
    teacher: { full_name: string } | { full_name: string }[] | null;
  };
  const classesFullSel =
    "id, name, schedule_text, book, program, teacher_id, teacher:users!classes_teacher_id_fkey(full_name)";
  const classesMidSel =
    "id, name, schedule_text, book, teacher_id, teacher:users!classes_teacher_id_fkey(full_name)";
  const classesBasicSel =
    "id, name, schedule_text, teacher_id, teacher:users!classes_teacher_id_fkey(full_name)";
  // Kick off three independent groups in parallel:
  //   1. the classes-detail fallback chain (serial within itself — each
  //      retry uses a smaller column set if the previous schema migration
  //      hasn't run yet),
  //   2. center_programs catalog,
  //   3. the dashboard count + list batch.
  // Before this, all three ran sequentially; merging them saves a round trip.
  const classesWithDetailsPromise: Promise<ClassFull[]> = (async () => {
    const r1 = await supabase
      .from("classes")
      .select(classesFullSel)
      .order("name", { ascending: true });
    if (!r1.error) return (r1.data ?? []) as ClassFull[];
    const r2 = await supabase
      .from("classes")
      .select(classesMidSel)
      .order("name", { ascending: true });
    if (!r2.error) {
      return ((r2.data ?? []) as Omit<ClassFull, "program">[]).map((c) => ({
        ...c,
        program: null,
      }));
    }
    const r3 = await supabase
      .from("classes")
      .select(classesBasicSel)
      .order("name", { ascending: true });
    return ((r3.data ?? []) as Omit<ClassFull, "book" | "program">[]).map(
      (c) => ({ ...c, book: null, program: null }),
    );
  })();

  const [
    classesWithDetails,
    programsRes,
    [
      { count: teacherCount },
      { count: parentCount },
      { count: classCount },
      { count: studentCount },
      { data: teachers },
      { data: classesList },
      { data: studentsByClass },
      { data: lessons },
      { data: recentLessons },
    ],
  ] = await Promise.all([
    classesWithDetailsPromise,
    supabase
      .from("center_programs")
      .select("id, label")
      .order("sort_order", { ascending: true }),
    Promise.all([
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "teacher"),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "parent"),
      supabase.from("classes").select("id", { count: "exact", head: true }),
      supabase.from("students").select("id", { count: "exact", head: true }),
      supabase
        .from("users")
        .select("id, full_name")
        .eq("role", "teacher")
        .order("full_name", { ascending: true }),
      supabase.from("classes").select("teacher_id"),
      supabase.from("students").select("class_id"),
      supabase
        .from("lessons")
        .select("id, teacher_id, class_id, lesson_date")
        .order("lesson_date", { ascending: false }),
      supabase
        .from("lessons")
        .select(
          "id, lesson_date, class:classes(name), teacher:users!lessons_teacher_id_fkey(full_name)",
        )
        .order("lesson_date", { ascending: false })
        .limit(5),
    ]),
  ]);

  const centerPrograms =
    programsRes.error || !programsRes.data
      ? []
      : (programsRes.data as Array<{ id: string; label: string }>);

  const allLessons = (lessons ?? []) as LessonAgg[];

  // Per-class rollups for the new dashboard cards.
  const studentsPerClass = new Map<string, number>();
  for (const s of (studentsByClass ?? []) as { class_id: string | null }[]) {
    if (s.class_id) {
      studentsPerClass.set(
        s.class_id,
        (studentsPerClass.get(s.class_id) ?? 0) + 1,
      );
    }
  }
  const lessonsPerClass = new Map<string, number>();
  const lastLessonDatePerClass = new Map<string, string>();
  for (const l of allLessons) {
    lessonsPerClass.set(
      l.class_id,
      (lessonsPerClass.get(l.class_id) ?? 0) + 1,
    );
    const existing = lastLessonDatePerClass.get(l.class_id);
    if (!existing || l.lesson_date > existing) {
      lastLessonDatePerClass.set(l.class_id, l.lesson_date);
    }
  }

  const classesByTeacher = new Map<string, number>();
  for (const c of (classesList ?? []) as ClassAgg[]) {
    if (c.teacher_id) {
      classesByTeacher.set(
        c.teacher_id,
        (classesByTeacher.get(c.teacher_id) ?? 0) + 1,
      );
    }
  }

  const lessonsByTeacherTotal = new Map<string, number>();
  const lessonsByTeacherWeek = new Map<string, number>();
  for (const l of allLessons) {
    // Skip lessons whose teacher has since been removed — teacher_id can
    // be null after the schema fix that lets us actually delete teachers
    // who logged lessons (lessons.teacher_id ON DELETE SET NULL).
    if (!l.teacher_id) continue;
    lessonsByTeacherTotal.set(
      l.teacher_id,
      (lessonsByTeacherTotal.get(l.teacher_id) ?? 0) + 1,
    );
    if (l.lesson_date >= weekStart) {
      lessonsByTeacherWeek.set(
        l.teacher_id,
        (lessonsByTeacherWeek.get(l.teacher_id) ?? 0) + 1,
      );
    }
  }

  // Neutral white cards differentiated by icon + label, not color — a
  // single primary accent on every icon chip.
  const cards = [
    {
      label: t("teachers"),
      href: "/admin/teachers",
      count: teacherCount ?? 0,
      icon: UserSquare2,
    },
    {
      label: t("parents"),
      href: "/admin/parents",
      count: parentCount ?? 0,
      icon: Heart,
    },
    {
      label: t("classes"),
      href: "/admin/classes",
      count: classCount ?? 0,
      icon: BookOpen,
    },
    {
      label: t("students"),
      href: "/admin/students",
      count: studentCount ?? 0,
      icon: GraduationCap,
    },
  ];

  const onboardingSteps = [
    {
      done: (teacherCount ?? 0) > 0,
      label: t("onboardingStep1"),
      href: "/admin/teachers",
    },
    {
      done: (classCount ?? 0) > 0,
      label: t("onboardingStep2"),
      href: "/admin/classes",
    },
    {
      done: (parentCount ?? 0) > 0,
      label: t("onboardingStep3"),
      href: "/admin/parents",
    },
    {
      done: (studentCount ?? 0) > 0,
      label: t("onboardingStep4"),
      href: "/admin/students",
    },
  ];
  const showOnboarding = onboardingSteps.some((s) => !s.done);
  const completedCount = onboardingSteps.filter((s) => s.done).length;

  return (
    <div className="space-y-10">
      {/* Greeting card — substantial 2-column treatment so the page
          doesn't open with a tiny title floating in white space.
          Left: eyebrow + h1 + subtitle + date chip.
          Right: decorative summary tiles showing the four KPIs in
          mini form so the admin sees the business at a glance the
          second they land. Hidden on mobile (the full KPI grid
          below is the source of truth there). */}
      <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm sm:p-8 lg:p-10">
        <div className="relative grid items-center gap-6 lg:grid-cols-[1.3fr_1fr] lg:gap-10">
          <div className="space-y-3">
            <p className="text-primary inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
              <UserSquare2 className="size-3.5" />
              {t("title")}
            </p>
            <h1 className="text-balance text-xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              {t("subtitle")}
            </h1>
            <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs sm:text-sm">
              <CalendarClock className="size-3.5 shrink-0" />
              <span className="truncate">
                {new Date().toLocaleDateString(dateLocale, {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </p>
          </div>
          {/* Right-side mini-KPI summary — neutral compact stat chips.
              Same four numbers as the cards below, but here they sit
              inside the greeting so the page has presence at first
              paint. Hidden <lg so mobile users see the full KPI grid
              first. */}
          <div className="hidden grid-cols-2 gap-3 lg:grid">
            {cards.map((c) => (
              <div
                key={c.href}
                className="flex items-center gap-3 rounded-xl border bg-background p-3"
              >
                <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <c.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums leading-none">
                    {c.count}
                  </p>
                  <p className="text-muted-foreground truncate text-[10px] font-medium uppercase tracking-wide">
                    {c.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showOnboarding ? (
        // Calmer than the prior gradient-ring treatment: plain card +
        // primary side stripe (matches the sky role identity by being
        // a vertical accent), with a thin progress bar under the
        // headline so admins see momentum without reading the count.
        <section className="bg-card relative overflow-hidden rounded-xl border p-5 shadow-sm sm:p-6">
          <div className="bg-primary absolute inset-y-0 left-0 w-1" />
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Rocket className="size-5" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">
                  {t("onboardingTitle")}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {t("onboardingSubtitle", {
                    done: completedCount,
                    total: onboardingSteps.length,
                  })}
                </p>
              </div>
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{
                    width: `${(completedCount / onboardingSteps.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
          <ol className="mt-5 grid gap-2 sm:grid-cols-2">
            {onboardingSteps.map((step, i) => (
              <li key={step.href}>
                <Link
                  href={step.href}
                  className={`bg-background/60 group flex min-h-12 items-center gap-3 rounded-lg border p-3 transition hover:border-primary/40 hover:bg-background ${
                    step.done ? "opacity-60" : ""
                  }`}
                >
                  <div
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      step.done
                        ? "bg-success/15 text-success"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {step.done ? <Check className="size-4" /> : i + 1}
                  </div>
                  <span
                    className={`flex-1 text-sm ${
                      step.done ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {step.label}
                  </span>
                  {!step.done ? (
                    <ArrowRight className="text-muted-foreground group-hover:text-primary size-4 transition" />
                  ) : null}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* KPI grid — bigger numerals, no redundant "see all" footer
          (the entire card is already a link → click anywhere). Hover
          reveals a chevron in the top-right instead. Tabular-nums
          keeps the four numbers vertically aligned at a glance.
          Staggered entrance animations: each card delays in 80ms
          apart so the row reads as a fluid sweep on first paint. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              style={{ animationDelay: `${i * 80}ms` }}
              className="group bg-card relative h-full overflow-hidden rounded-xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:fill-mode-backwards"
            >
              <div className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-5" />
                  </span>
                  <ChevronRight className="text-muted-foreground/40 group-hover:text-primary mt-1 size-4 shrink-0 transition-all group-hover:translate-x-0.5" />
                </div>
                <div className="space-y-1">
                  <p className="text-4xl font-semibold tabular-nums leading-none tracking-tight">
                    {c.count}
                  </p>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    {c.label}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Programs section: tile drilldown by program. */}
      <ProgramsSection
        classes={classesWithDetails}
        catalog={centerPrograms}
        studentsPerClass={studentsPerClass}
        lessonsPerClass={lessonsPerClass}
        lastLessonDatePerClass={lastLessonDatePerClass}
        filterProgram={filterProgram}
        dateLocale={dateLocale}
        labels={{
          programsHeader: t("programsHeader"),
          backToPrograms: t("backToPrograms"),
          manageClasses: t("manageClasses"),
          classCardStudents: t("classCardStudents"),
          classCardLessons: t("classCardLessons"),
          classCardLast: t("classCardLast"),
          classCardNoTeacher: t("classCardNoTeacher"),
          classesEmpty: t("classesEmpty"),
          createFirstClass: t("createFirstClass"),
          tileClassesCount: (n: number) => t("tileClassesCount", { n }),
          tileStudentsCount: (n: number) => t("tileStudentsCount", { n }),
          bookEmpty: tClasses("bookEmpty"),
          unsetProgramTileTitle: t("unsetProgramTileTitle"),
          manageProgramsHint: t("manageProgramsHint"),
        }}
      />

      {/* Recent Activity — combined panel with sub-tabs so the dashboard
          doesn't sprawl down with two separate full-width tables. Defaults
          to teacher compliance (the actionable "who's slacking" view).
          Each tab caps rows at 5 with a "see all" link, so the page stays
          one screen-ish regardless of how many teachers or lessons exist. */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ListChecks className="text-primary size-5" />
          <h2 className="text-xl font-semibold tracking-tight">
            {t("activityHeader")}
          </h2>
        </div>

        <nav className="border-b">
          <div className="-mb-px flex gap-1 overflow-x-auto">
            {(
              [
                {
                  key: "teachers" as const,
                  label: t("teacherActivityHeader"),
                  icon: UserSquare2,
                },
                {
                  key: "lessons" as const,
                  label: t("recentLessonsHeader"),
                  icon: Clock3,
                },
              ]
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeActivity === tab.key;
              const href =
                tab.key === "teachers" ? "/admin" : "/admin?activity=lessons";
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
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Teachers tab — top 5 by lessons-this-week, falling back to total.
            'See all teachers' if there are more. The week column is the
            primary signal: 0 lessons this week shows the destructive
            color so the admin sees compliance gaps immediately. */}
        {activeActivity === "teachers" ? (
          (() => {
            const sortedTeachers = [...(teachers ?? [])].sort((a, b) => {
              const wa = lessonsByTeacherWeek.get(a.id) ?? 0;
              const wb = lessonsByTeacherWeek.get(b.id) ?? 0;
              if (wa !== wb) return wb - wa;
              const ta = lessonsByTeacherTotal.get(a.id) ?? 0;
              const tb = lessonsByTeacherTotal.get(b.id) ?? 0;
              if (ta !== tb) return tb - ta;
              return a.full_name.localeCompare(b.full_name);
            });
            const visible = sortedTeachers.slice(0, 5);
            const extra = sortedTeachers.length - visible.length;
            return (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("teachers")}</TableHead>
                        <TableHead className="w-28 text-right">
                          {t("teacherClassesCol")}
                        </TableHead>
                        <TableHead className="w-28 text-right">
                          {t("teacherLessonsWeek")}
                        </TableHead>
                        <TableHead className="w-32 text-right">
                          {t("teacherLessonsTotal")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.length > 0 ? (
                        visible.map((tr) => {
                          const weekVal = lessonsByTeacherWeek.get(tr.id) ?? 0;
                          return (
                            <TableRow key={tr.id}>
                              <TableCell>
                                <div className="flex items-center gap-2 font-medium">
                                  <UserSquare2 className="text-muted-foreground size-4" />
                                  {tr.full_name}
                                </div>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {classesByTeacher.get(tr.id) ?? 0}
                              </TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={
                                    "tabular-nums " +
                                    (weekVal === 0
                                      ? "text-destructive font-medium"
                                      : "text-foreground")
                                  }
                                >
                                  {weekVal}
                                </span>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {lessonsByTeacherTotal.get(tr.id) ?? 0}
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
                            —
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {extra > 0 ? (
                  <div className="flex justify-end">
                    <Link
                      href="/admin/teachers"
                      className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
                    >
                      {t("seeAllTeachers", { n: extra })}
                      <ChevronRight className="size-3.5" />
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          })()
        ) : null}

        {/* Recent lessons tab — 5 most recent across the center. Visual
            pass: primary-tinted date pill instead of muted plain text. */}
        {activeActivity === "lessons" ? (
          <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">{t("lessonDateCol")}</TableHead>
                  <TableHead>{t("lessonClassCol")}</TableHead>
                  <TableHead>{t("lessonTeacherCol")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLessons && recentLessons.length > 0 ? (
                  recentLessons.map((l) => {
                    const cls = Array.isArray(l.class) ? l.class[0] : l.class;
                    const tr = Array.isArray(l.teacher)
                      ? l.teacher[0]
                      : l.teacher;
                    return (
                      <TableRow key={l.id}>
                        <TableCell>
                          <span className="bg-primary/10 text-primary inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide tabular-nums">
                            {parseDateOnly(l.lesson_date)?.toLocaleDateString(
                              dateLocale,
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              },
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ClipboardList className="text-muted-foreground size-4" />
                            {cls?.name ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tr?.full_name ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-muted-foreground py-6 text-center text-sm"
                    >
                      <Users className="mr-1 inline size-4 opacity-50" />
                      —
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

// --------------------------------------------------------------------------
// Programs section: tiles → drilldown.
// When `filterProgram` is null, render program tiles (one per program in the
// catalog that has at least one class, plus an "Unassigned" tile if there
// are classes without a program). When set to a program value (or "unset"),
// render only the matching class cards and a "back" link.
// --------------------------------------------------------------------------

type ClassDetail = {
  id: string;
  name: string;
  schedule_text: string | null;
  book: string | null;
  program: string | null;
  teacher_id: string | null;
  teacher: { full_name: string } | { full_name: string }[] | null;
};

function ProgramsSection({
  classes,
  catalog,
  studentsPerClass,
  lessonsPerClass,
  lastLessonDatePerClass,
  filterProgram,
  dateLocale,
  labels,
}: {
  classes: ClassDetail[];
  catalog: { id: string; label: string }[];
  studentsPerClass: Map<string, number>;
  lessonsPerClass: Map<string, number>;
  lastLessonDatePerClass: Map<string, string>;
  filterProgram: string | null;
  dateLocale: string;
  labels: {
    programsHeader: string;
    backToPrograms: string;
    manageClasses: string;
    classCardStudents: string;
    classCardLessons: string;
    classCardLast: string;
    classCardNoTeacher: string;
    classesEmpty: string;
    createFirstClass: string;
    tileClassesCount: (n: number) => string;
    tileStudentsCount: (n: number) => string;
    bookEmpty: string;
    unsetProgramTileTitle: string;
    manageProgramsHint: string;
  };
}) {
  const headerEl = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <BookMarked className="text-primary size-5" />
        <h2 className="text-xl font-semibold tracking-tight">
          {labels.programsHeader}
        </h2>
      </div>
      <Link
        href="/admin/settings"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        {labels.manageProgramsHint}
        <ChevronRight className="size-3.5" />
      </Link>
    </div>
  );

  // Empty: no classes AND no catalog programs yet → onboarding nudge.
  if (classes.length === 0 && catalog.length === 0) {
    return (
      <section className="space-y-4">
        {headerEl}
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-12 text-center text-sm">
          <BookOpen className="size-8 opacity-50" />
          <p>{labels.classesEmpty}</p>
          <Link href="/admin/classes" className="text-primary hover:underline">
            {labels.createFirstClass}
          </Link>
        </div>
      </section>
    );
  }

  // ----- Drilldown view: filter is set, render matching class cards.
  if (filterProgram) {
    const filtered = classes.filter((c) =>
      filterProgram === "unset" ? !c.program : c.program === filterProgram,
    );
    const filterLabel =
      filterProgram === "unset" ? labels.unsetProgramTileTitle : filterProgram;

    return (
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
            >
              <ChevronRight className="size-3.5 rotate-180" />
              {labels.backToPrograms}
            </Link>
            <span className="text-muted-foreground">/</span>
            <h2 className="text-xl font-semibold tracking-tight">
              {filterLabel}
            </h2>
          </div>
          <Link
            href="/admin/classes"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
          >
            {labels.manageClasses}
            <ChevronRight className="size-3.5" />
          </Link>
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <ClassCard
                key={c.id}
                cls={c}
                studentsPerClass={studentsPerClass}
                lessonsPerClass={lessonsPerClass}
                lastLessonDatePerClass={lastLessonDatePerClass}
                dateLocale={dateLocale}
                labels={labels}
              />
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-12 text-center text-sm">
            <BookOpen className="size-8 opacity-50" />
            <p>{labels.classesEmpty}</p>
          </div>
        )}
      </section>
    );
  }

  // ----- Tile view: build tile per program label (catalog ∪ orphan labels
  // actually used by classes), plus an Unassigned tile.
  const usedLabels = new Set<string>();
  const catalogLabels = new Set(catalog.map((p) => p.label));
  const seen = new Set<string>();
  for (const c of classes) {
    if (c.program) usedLabels.add(c.program);
  }

  const tiles: Array<{
    value: string;
    label: string;
    tone: string;
    classCount: number;
    studentCount: number;
  }> = [];

  // Every catalog program shows up as a tile, even with 0 classes — the
  // admin has explicitly defined these programs so they should be visible.
  for (const p of catalog) {
    if (seen.has(p.label)) continue;
    seen.add(p.label);
    const inProgram = classes.filter((c) => c.program === p.label);
    tiles.push({
      value: p.label,
      label: p.label,
      tone: toneForProgram(p.label),
      classCount: inProgram.length,
      studentCount: inProgram.reduce(
        (sum, c) => sum + (studentsPerClass.get(c.id) ?? 0),
        0,
      ),
    });
  }
  // Then any orphan labels (used by classes but not in catalog).
  Array.from(usedLabels).forEach((label) => {
    if (catalogLabels.has(label) || seen.has(label)) return;
    seen.add(label);
    const inProgram = classes.filter((c) => c.program === label);
    tiles.push({
      value: label,
      label: label,
      tone: toneForProgram(label),
      classCount: inProgram.length,
      studentCount: inProgram.reduce(
        (sum, c) => sum + (studentsPerClass.get(c.id) ?? 0),
        0,
      ),
    });
  });
  // (Untagged classes are intentionally not surfaced as a tile — admin can
  // see them on /admin/classes. Showing an "Unassigned" tile cluttered the
  // dashboard for centers who don't care about tagging every class.)

  return (
    <section className="space-y-4">
      {headerEl}
      {tiles.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-12 text-center text-sm">
          <BookOpen className="size-8 opacity-50" />
          <p>{labels.classesEmpty}</p>
          <Link href="/admin/classes" className="text-primary hover:underline">
            {labels.createFirstClass}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tiles.map((tile) => (
            <Link
              key={tile.value}
              href={`/admin?program=${encodeURIComponent(tile.value)}`}
              className="group bg-card relative overflow-hidden rounded-xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`inline-flex size-10 items-center justify-center rounded-lg ${tile.tone}`}
                >
                  <BookMarked className="size-5" />
                </div>
                <ChevronRight className="text-muted-foreground group-hover:text-foreground mt-1 size-4 transition" />
              </div>
              <h3 className="mt-3 text-lg font-semibold">{tile.label}</h3>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {labels.tileClassesCount(tile.classCount)} ·{" "}
                {labels.tileStudentsCount(tile.studentCount)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function ClassCard({
  cls: c,
  studentsPerClass,
  lessonsPerClass,
  lastLessonDatePerClass,
  dateLocale,
  labels,
}: {
  cls: ClassDetail;
  studentsPerClass: Map<string, number>;
  lessonsPerClass: Map<string, number>;
  lastLessonDatePerClass: Map<string, string>;
  dateLocale: string;
  labels: {
    classCardStudents: string;
    classCardLessons: string;
    classCardLast: string;
    classCardNoTeacher: string;
    bookEmpty: string;
  };
}) {
  const teacherName = Array.isArray(c.teacher)
    ? c.teacher[0]?.full_name
    : c.teacher?.full_name;
  const studentN = studentsPerClass.get(c.id) ?? 0;
  const lessonN = lessonsPerClass.get(c.id) ?? 0;
  const lastDate = lastLessonDatePerClass.get(c.id);
  return (
    <Link
      href={`/teacher/classes/${c.id}`}
      className="group bg-card relative overflow-hidden rounded-xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-primary inline-flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="size-5" />
          </div>
          <h3 className="mt-3 truncate text-lg font-semibold">{c.name}</h3>
          {c.book ? (
            <p className="text-foreground mt-1 inline-flex items-center gap-1.5 text-sm">
              <BookMarked className="text-muted-foreground size-3.5 shrink-0" />
              <span className="truncate">{c.book}</span>
            </p>
          ) : (
            <p className="text-muted-foreground mt-1 inline-flex items-center gap-1.5 text-xs italic">
              <BookMarked className="size-3.5 shrink-0" />
              {labels.bookEmpty}
            </p>
          )}
        </div>
        <ChevronRight className="text-muted-foreground group-hover:text-foreground mt-1 size-4 shrink-0 transition" />
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
        <div>
          <dt className="text-muted-foreground uppercase tracking-wide">
            {labels.classCardStudents}
          </dt>
          <dd className="text-foreground mt-0.5 text-sm font-semibold">
            {studentN}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground uppercase tracking-wide">
            {labels.classCardLessons}
          </dt>
          <dd className="text-foreground mt-0.5 text-sm font-semibold">
            {lessonN}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground uppercase tracking-wide">
            {labels.classCardLast}
          </dt>
          <dd className="text-foreground mt-0.5 text-sm font-semibold">
            {lastDate
              ? new Date(lastDate).toLocaleDateString(dateLocale, {
                  day: "2-digit",
                  month: "2-digit",
                })
              : "—"}
          </dd>
        </div>
      </dl>
      <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1">
          <UserSquare2 className="size-3.5" />
          {teacherName ?? labels.classCardNoTeacher}
        </span>
        {c.schedule_text ? (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="size-3.5" />
            {c.schedule_text}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
