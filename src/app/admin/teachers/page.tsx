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
import { TeacherForm } from "./teacher-form";
import { removeTeacher } from "./actions";
import { SearchInput } from "@/components/search-input";
import { ConfirmSubmitButton } from "@/components/confirm-submit";

export const dynamic = "force-dynamic";

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const t = await getTranslations("admin.teachers");
  const tc = await getTranslations("common");
  const tAdmin = await getTranslations("admin");

  const q = searchParams.q?.trim() ?? "";

  let query = supabase
    .from("users")
    .select("id, full_name, email, created_at")
    .eq("role", "teacher")
    .order("created_at", { ascending: true });
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);

  const { data: teachers } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <TeacherForm />

      <SearchInput placeholder={tAdmin("search")} />

      <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fullName")}</TableHead>
              <TableHead>{t("email")}</TableHead>
              <TableHead className="w-32 text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers && teachers.length > 0 ? (
              teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">
                    {teacher.full_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {teacher.email}
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={removeTeacher}>
                      <input type="hidden" name="id" value={teacher.id} />
                      <ConfirmSubmitButton
                        confirmMessage={t("deleteConfirm", {
                          name: teacher.full_name,
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
                  colSpan={3}
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
