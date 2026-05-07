import Link from "next/link";
import { notFound } from "next/navigation";
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
            ← Lớp của tôi
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {cls.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            {cls.schedule_text ?? "Chưa có lịch học."}
          </p>
        </div>
        <Link
          href={`/teacher/classes/${cls.id}/lessons/new`}
          className={buttonVariants()}
        >
          Ghi nhận bài học mới
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Học sinh ({students?.length ?? 0})</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Họ và tên</TableHead>
                <TableHead className="w-20">Tuổi</TableHead>
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
                    Lớp chưa có học sinh.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Bài học gần đây</h2>
        {lessons && lessons.length > 0 ? (
          <ul className="space-y-3">
            {lessons.map((l) => (
              <li
                key={l.id}
                className="rounded-lg border p-4 text-sm"
              >
                <p className="font-medium">
                  {new Date(l.lesson_date).toLocaleDateString("vi-VN", {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
                {l.vocabulary ? (
                  <p className="text-muted-foreground mt-1">
                    <span className="font-medium text-foreground">Từ vựng:</span>{" "}
                    {l.vocabulary}
                  </p>
                ) : null}
                {l.grammar_point ? (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Ngữ pháp:</span>{" "}
                    {l.grammar_point}
                  </p>
                ) : null}
                {l.general_note ? (
                  <p className="text-muted-foreground mt-1">
                    {l.general_note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            Chưa có bài học nào được ghi nhận.
          </p>
        )}
      </section>
    </div>
  );
}
