import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
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
  const user = await requireRole("teacher");
  const supabase = createClient();
  const t = await getTranslations("teacher.class");
  const tHome = await getTranslations("teacher.home");
  const tStudent = await getTranslations("admin.students");
  const tForm = await getTranslations("teacher.lessonForm");
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
      .select("id, lesson_date, title, vocabulary, grammar_point, general_note")
      .eq("class_id", cls.id)
      .order("lesson_date", { ascending: false })
      .limit(10),
  ]);

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
        <Link
          href={`/teacher/classes/${cls.id}/lessons/new`}
          className={`${buttonVariants()} inline-flex items-center gap-1.5`}
        >
          <Plus className="size-4" />
          {t("newLesson")}
        </Link>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-primary size-5" />
          <h2 className="text-xl font-semibold tracking-tight">
            {t("studentsHeader", { count: students?.length ?? 0 })}
          </h2>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tStudent("fullName")}</TableHead>
                <TableHead className="w-20">{tStudent("age")}</TableHead>
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
                      {l.title ??
                        new Date(l.lesson_date).toLocaleDateString(dateLocale, {
                          weekday: "long",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                    </p>
                    {l.title ? (
                      <p className="text-muted-foreground text-xs">
                        {new Date(l.lesson_date).toLocaleDateString(dateLocale, {
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
                      <button
                        type="submit"
                        className={buttonVariants({
                          variant: "destructive",
                          size: "sm",
                        })}
                        aria-label={tForm("delete")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
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
