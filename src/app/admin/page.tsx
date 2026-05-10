import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  BookMarked,
  BookOpen,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Clock3,
  GraduationCap,
  Heart,
  ListChecks,
  Users,
  UserSquare2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { toneForProgram } from "@/lib/programs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().split("T")[0];
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: { program?: string };
}) {
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
  let classesWithDetails: ClassFull[] = [];
  {
    const r1 = await supabase
      .from("classes")
      .select(classesFullSel)
      .order("name", { ascending: true });
    if (r1.error) {
      const r2 = await supabase
        .from("classes")
        .select(classesMidSel)
        .order("name", { ascending: true });
      if (r2.error) {
        const r3 = await supabase
          .from("classes")
          .select(classesBasicSel)
          .order("name", { ascending: true });
        classesWithDetails = (
          (r3.data ?? []) as Omit<ClassFull, "book" | "program">[]
        ).map((c) => ({ ...c, book: null, program: null }));
      } else {
        classesWithDetails = ((r2.data ?? []) as Omit<ClassFull, "program">[]).map(
          (c) => ({ ...c, program: null }),
        );
      }
    } else {
      classesWithDetails = (r1.data ?? []) as ClassFull[];
    }
  }

  // Center's editable program catalog (admin manages in /admin/settings).
  // Falls back to empty if the migration hasn't been run.
  const programsRes = await supabase
    .from("center_programs")
    .select("id, label")
    .order("sort_order", { ascending: true });
  const centerPrograms =
    programsRes.error || !programsRes.data
      ? []
      : (programsRes.data as Array<{ id: string; label: string }>);

  const [
    { count: teacherCount },
    { count: parentCount },
    { count: classCount },
    { count: studentCount },
    { data: teachers },
    { data: classesList },
    { data: studentsByClass },
    { data: lessons },
    { data: recentLessons },
  ] = await Promise.all([
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
  ]);

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

  const cards = [
    {
      label: t("teachers"),
      href: "/admin/teachers",
      count: teacherCount ?? 0,
      icon: UserSquare2,
      tone: "text-sky-600",
    },
    {
      label: t("parents"),
      href: "/admin/parents",
      count: parentCount ?? 0,
      icon: Heart,
      tone: "text-rose-600",
    },
    {
      label: t("classes"),
      href: "/admin/classes",
      count: classCount ?? 0,
      icon: BookOpen,
      tone: "text-violet-600",
    },
    {
      label: t("students"),
      href: "/admin/students",
      count: studentCount ?? 0,
      icon: GraduationCap,
      tone: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href}>
              <Card className="transition hover:bg-muted/40">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    {c.label}
                  </CardTitle>
                  <Icon className={`size-4 ${c.tone}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{c.count}</p>
                </CardContent>
              </Card>
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

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ListChecks className="text-primary size-5" />
          <h2 className="text-xl font-semibold tracking-tight">
            {t("teacherActivityHeader")}
          </h2>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
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
              {teachers && teachers.length > 0 ? (
                teachers.map((tr) => {
                  const weekVal = lessonsByTeacherWeek.get(tr.id) ?? 0;
                  return (
                    <TableRow key={tr.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          <UserSquare2 className="text-muted-foreground size-4" />
                          {tr.full_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {classesByTeacher.get(tr.id) ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            weekVal === 0
                              ? "text-rose-600 font-medium"
                              : "text-foreground"
                          }
                        >
                          {weekVal}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
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
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock3 className="text-primary size-5" />
          <h2 className="text-xl font-semibold tracking-tight">
            {t("recentLessonsHeader")}
          </h2>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
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
                  const tr = Array.isArray(l.teacher) ? l.teacher[0] : l.teacher;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(l.lesson_date).toLocaleDateString(dateLocale, {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
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
                    className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-center text-sm"
                  >
                    <Users className="size-4 opacity-50" />—
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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
      <div className="from-primary/10 absolute inset-x-0 top-0 h-1 bg-gradient-to-r to-violet-500/40" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-violet-600 inline-flex size-9 items-center justify-center rounded-lg bg-violet-50">
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
