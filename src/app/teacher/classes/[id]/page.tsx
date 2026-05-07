import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
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
  const user = await requireRole("teacher");
  const supabase = createClient();
  const t = await getTranslations("teacher.class");
  const tHome = await getTranslations("teacher.home");
  const tFullName = await getTranslations("admin.students");
  const tAge = tFullName;
  const tCommon = await getTranslations("common");
  void tCommon;
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, schedule_text, teacher_id")
    .eq("id", params.id)
    .single();

  if (!cls || cls.teacher_id !== user.id) notFound();

  const [{ data: students }, { data: lessons }] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, age")
      .eq("class_id", cls.id)
      .order("full_name", { ascending: true }),
    supabase
      .from("lessons")
      .select("id, lesson_date, vocabulary, grammar_point, general_note")
      .eq("class_id", cls.id)
      .order("lesson_date", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/teacher"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            {t("back")}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {cls.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            {cls.schedule_text ?? tHome("noSchedule")}
          </p>
        </div>
        <Link
          href={`/teacher/classes/${cls.id}/lessons/new`}
          className={buttonVariants()}
        >
          {t("newLesson")}
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">
          {t("studentsHeader", { count: students?.length ?? 0 })}
        </h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tFullName("fullName")}</TableHead>
                <TableHead className="w-20">{tAge("age")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students && students.length > 0 ? (
                students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.age ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={2}
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
        <h2 className="text-lg font-medium">{t("recentLessonsHeader")}</h2>
        {lessons && lessons.length > 0 ? (
          <ul className="space-y-3">
            {lessons.map((l) => (
              <li key={l.id} className="rounded-lg border p-4 text-sm">
                <p className="font-medium">
                  {new Date(l.lesson_date).toLocaleDateString(dateLocale, {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
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
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            {t("noLessons")}
          </p>
        )}
      </section>
    </div>
  );
}
