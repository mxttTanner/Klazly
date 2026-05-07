import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
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

const BEHAVIOR_TONES: Record<string, string> = {
  great: "bg-emerald-500",
  good: "bg-sky-500",
  okay: "bg-amber-500",
  needs_attention: "bg-rose-500",
};

function weekAgoIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().split("T")[0];
}

export default async function AdminHomePage() {
  const supabase = createClient();
  const t = await getTranslations("admin.dashboard");
  const tBehavior = await getTranslations("behavior");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";
  const weekStart = weekAgoIsoDate();

  type LessonAgg = {
    id: string;
    teacher_id: string;
    class_id: string;
    lesson_date: string;
  };
  type ClassAgg = { teacher_id: string | null };
  type UpdateAgg = {
    lesson_id: string;
    behavior_rating: string | null;
    homework_completed: boolean;
  };

  const [
    { count: teacherCount },
    { count: parentCount },
    { count: classCount },
    { count: studentCount },
    { data: teachers },
    { data: classesList },
    { data: lessons },
    { data: updates },
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
    supabase
      .from("lessons")
      .select("id, teacher_id, class_id, lesson_date")
      .order("lesson_date", { ascending: false }),
    supabase
      .from("student_lesson_updates")
      .select("lesson_id, behavior_rating, homework_completed"),
    supabase
      .from("lessons")
      .select(
        "id, lesson_date, class:classes(name), teacher:users!lessons_teacher_id_fkey(full_name)",
      )
      .order("lesson_date", { ascending: false })
      .limit(5),
  ]);

  const allLessons = (lessons ?? []) as LessonAgg[];
  const allUpdates = (updates ?? []) as UpdateAgg[];
  const weekLessons = allLessons.filter((l) => l.lesson_date >= weekStart);
  const weekLessonIds = new Set(weekLessons.map((l) => l.id));
  const weekUpdates = allUpdates.filter((u) => weekLessonIds.has(u.lesson_id));

  const homeworkRate = weekUpdates.length
    ? Math.round(
        (weekUpdates.filter((u) => u.homework_completed).length /
          weekUpdates.length) *
          100,
      )
    : null;

  const behaviorCounts: Record<string, number> = {
    great: 0,
    good: 0,
    okay: 0,
    needs_attention: 0,
  };
  for (const u of weekUpdates) {
    if (u.behavior_rating && u.behavior_rating in behaviorCounts) {
      behaviorCounts[u.behavior_rating]++;
    }
  }
  const totalBehavior = Object.values(behaviorCounts).reduce((a, b) => a + b, 0);

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
    { label: t("teachers"), href: "/admin/teachers", count: teacherCount ?? 0 },
    { label: t("parents"), href: "/admin/parents", count: parentCount ?? 0 },
    { label: t("classes"), href: "/admin/classes", count: classCount ?? 0 },
    { label: t("students"), href: "/admin/students", count: studentCount ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className="transition hover:bg-muted/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {c.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{c.count}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t("weekHeader")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {t("lessonsLogged")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{weekLessons.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {t("homeworkCompletion")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">
                {homeworkRate === null ? "—" : `${homeworkRate}%`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {t("behaviorBreakdown")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {totalBehavior > 0 ? (
                <ul className="space-y-2 text-sm">
                  {(["great", "good", "okay", "needs_attention"] as const).map(
                    (key) => {
                      const c = behaviorCounts[key];
                      const pct = Math.round((c / totalBehavior) * 100);
                      return (
                        <li key={key}>
                          <div className="flex justify-between gap-2">
                            <span>{tBehavior(key)}</span>
                            <span className="text-muted-foreground">
                              {c} ({pct}%)
                            </span>
                          </div>
                          <div className="bg-muted mt-1 h-1.5 rounded-full">
                            <div
                              className={`h-1.5 rounded-full ${BEHAVIOR_TONES[key]}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    },
                  )}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("noWeekData")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t("teacherActivityHeader")}</h2>
        <div className="rounded-lg border">
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
                teachers.map((tr) => (
                  <TableRow key={tr.id}>
                    <TableCell className="font-medium">{tr.full_name}</TableCell>
                    <TableCell className="text-right">
                      {classesByTeacher.get(tr.id) ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {lessonsByTeacherWeek.get(tr.id) ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {lessonsByTeacherTotal.get(tr.id) ?? 0}
                    </TableCell>
                  </TableRow>
                ))
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

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t("recentLessonsHeader")}</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("lessonDateCol")}</TableHead>
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
                      <TableCell>{cls?.name ?? "—"}</TableCell>
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
                    —
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
