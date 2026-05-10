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
import { StudentForm } from "./student-form";
import { InlineSelect } from "./inline-select";
import { deleteStudent } from "./actions";
import { SearchInput } from "@/components/search-input";
import { LevelSelect } from "@/components/level-select";
import { ConfirmSubmitButton } from "@/components/confirm-submit";
import { InlineImportSection } from "@/components/inline-import-section";

export const dynamic = "force-dynamic";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const t = await getTranslations("admin.students");
  const tc = await getTranslations("common");
  const tAdmin = await getTranslations("admin");
  const tLevel = await getTranslations("level");
  const tImport = await getTranslations("import");

  const q = searchParams.q?.trim() ?? "";

  let query = supabase
    .from("students")
    .select("id, full_name, age, class_id, parent_user_id, overall_level")
    .order("full_name", { ascending: true });
  if (q) query = query.ilike("full_name", `%${q}%`);

  const [{ data: students }, { data: classes }, { data: parents }] =
    await Promise.all([
      query,
      supabase
        .from("classes")
        .select("id, name")
        .order("name", { ascending: true }),
      supabase
        .from("users")
        .select("id, full_name")
        .eq("role", "parent")
        .order("full_name", { ascending: true }),
    ]);

  const classOptions = (classes ?? []).map((c) => ({ id: c.id, label: c.name }));
  const parentOptions = (parents ?? []).map((p) => ({
    id: p.id,
    label: p.full_name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <StudentForm classes={classes ?? []} parents={parents ?? []} />

      <InlineImportSection
        variant="students"
        toggleLabel={tImport("inlineToggleStudents")}
        helpText={tImport("studentsHelp")}
        exampleCsv={`full_name,age,class_name,parent_email
Phạm Minh An,8,Lớp Junior A,binh@parent.test
Nguyễn Bảo Ngọc,10,Lớp Junior A,hoa@parent.test`}
        noteText={tImport("studentsNote")}
      />

      <SearchInput placeholder={tAdmin("search")} />

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fullName")}</TableHead>
              <TableHead className="w-20">{t("age")}</TableHead>
              <TableHead className="w-44">{tLevel("header")}</TableHead>
              <TableHead className="w-56">{t("class")}</TableHead>
              <TableHead className="w-56">{t("parent")}</TableHead>
              <TableHead className="w-24 text-right">{tc("actions")}</TableHead>
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
                  <TableCell>
                    <LevelSelect
                      studentId={s.id}
                      currentLevel={s.overall_level ?? null}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineSelect
                      studentId={s.id}
                      field="class_id"
                      currentValue={s.class_id}
                      options={classOptions}
                      emptyLabel={t("unassignedClass")}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineSelect
                      studentId={s.id}
                      field="parent_user_id"
                      currentValue={s.parent_user_id}
                      options={parentOptions}
                      emptyLabel={t("unassignedParent")}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={deleteStudent}>
                      <input type="hidden" name="id" value={s.id} />
                      <ConfirmSubmitButton
                        confirmMessage={t("deleteConfirm", {
                          name: s.full_name,
                        })}
                      >
                        {tc("delete")}
                      </ConfirmSubmitButton>
                    </form>
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
