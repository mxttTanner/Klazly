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

  let query = supabase
    .from("classes")
    .select(
      "id, name, schedule_text, teacher_id, teacher:users!classes_teacher_id_fkey(full_name)",
    )
    .order("name", { ascending: true });
  if (q) query = query.ilike("name", `%${q}%`);

  const [{ data: classes }, { data: teachers }] = await Promise.all([
    query,
    supabase
      .from("users")
      .select("id, full_name")
      .eq("role", "teacher")
      .order("full_name", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <ClassForm teachers={teachers ?? []} />

      <SearchInput placeholder={tAdmin("search")} />

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("className")}</TableHead>
              <TableHead>{t("schedule")}</TableHead>
              <TableHead className="w-64">{t("teacher")}</TableHead>
              <TableHead className="w-48 text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes && classes.length > 0 ? (
              classes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
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
                  colSpan={4}
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
