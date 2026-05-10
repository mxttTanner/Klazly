import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClassForm } from "./class-form";
import { ChangeTeacherForm } from "./change-teacher-form";
import { InlineBook } from "./inline-book";
import { InlineProgram } from "./inline-program";
import { deleteClass } from "./actions";
import { buttonVariants } from "@/components/ui/button";
import { SearchInput } from "@/components/search-input";
import { ConfirmSubmitButton } from "@/components/confirm-submit";

export const dynamic = "force-dynamic";

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const t = await getTranslations("admin.classes");
  const tc = await getTranslations("common");
  const tAdmin = await getTranslations("admin");

  const q = searchParams.q?.trim() ?? "";

  // Optional columns (book, program) — fall back if migrations not run.
  const selectFull =
    "id, name, schedule_text, teacher_id, book, program, teacher:users!classes_teacher_id_fkey(full_name)";
  const selectMid =
    "id, name, schedule_text, teacher_id, book, teacher:users!classes_teacher_id_fkey(full_name)";
  const selectBasic =
    "id, name, schedule_text, teacher_id, teacher:users!classes_teacher_id_fkey(full_name)";

  type ClassRow = {
    id: string;
    name: string;
    schedule_text: string | null;
    teacher_id: string | null;
    book?: string | null;
    program?: string | null;
    teacher: { full_name: string } | { full_name: string }[] | null;
  };
  let classes: ClassRow[] = [];
  {
    let q1 = supabase
      .from("classes")
      .select(selectFull)
      .order("name", { ascending: true });
    if (q) q1 = q1.ilike("name", `%${q}%`);
    const r1 = await q1;
    if (r1.error) {
      let q2 = supabase
        .from("classes")
        .select(selectMid)
        .order("name", { ascending: true });
      if (q) q2 = q2.ilike("name", `%${q}%`);
      const r2 = await q2;
      if (r2.error) {
        let q3 = supabase
          .from("classes")
          .select(selectBasic)
          .order("name", { ascending: true });
        if (q) q3 = q3.ilike("name", `%${q}%`);
        const r3 = await q3;
        classes = (r3.data ?? []) as ClassRow[];
      } else {
        classes = (r2.data ?? []) as ClassRow[];
      }
    } else {
      classes = (r1.data ?? []) as ClassRow[];
    }
  }

  const { data: teachers } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "teacher")
    .order("full_name", { ascending: true });

  // Center's program catalog (admin-managed in /admin/settings).
  const programsRes = await supabase
    .from("center_programs")
    .select("id, label")
    .order("sort_order", { ascending: true });
  const programs =
    programsRes.error || !programsRes.data
      ? []
      : (programsRes.data as Array<{ id: string; label: string }>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <ClassForm teachers={teachers ?? []} programs={programs} />

      <SearchInput placeholder={tAdmin("search")} />

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("className")}</TableHead>
              <TableHead className="w-44">{t("program")}</TableHead>
              <TableHead className="w-56">{t("book")}</TableHead>
              <TableHead>{t("schedule")}</TableHead>
              <TableHead className="w-56">{t("teacher")}</TableHead>
              <TableHead className="w-48 text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes && classes.length > 0 ? (
              classes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <InlineProgram
                      classId={c.id}
                      currentProgram={c.program ?? null}
                      programs={programs}
                      noneLabel={t("programNone")}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineBook
                      classId={c.id}
                      currentBook={c.book ?? null}
                      placeholder={t("bookPlaceholder")}
                      emptyLabel={t("bookEmpty")}
                      saveLabel={tc("save")}
                      cancelLabel={tc("cancel")}
                      editLabel={t("bookEdit")}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.schedule_text ?? "—"}
                  </TableCell>
                  <TableCell>
                    <ChangeTeacherForm
                      classId={c.id}
                      currentTeacherId={c.teacher_id}
                      teachers={teachers ?? []}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Link
                        href={`/teacher/classes/${c.id}`}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        {t("openClass")}
                      </Link>
                      <form action={deleteClass}>
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmSubmitButton
                          confirmMessage={t("deleteConfirm", { name: c.name })}
                        >
                          {tc("delete")}
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-6 text-center text-sm"
                >
                  {q ? tAdmin("searchEmpty") : t("empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
