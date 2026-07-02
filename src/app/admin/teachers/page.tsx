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

export default async function TeachersPage(
  props: {
    searchParams: Promise<{ q?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const t = await getTranslations("admin.teachers");
  const tc = await getTranslations("common");
  const tAdmin = await getTranslations("admin");

  const q = searchParams.q?.trim() ?? "";

  // Try full select with phone; fall back if the db/users-phone.sql
  // migration hasn't run yet so the page keeps rendering.
  const withPhone = await supabase
    .from("users")
    .select("id, full_name, email, phone, created_at")
    .eq("role", "teacher")
    .order("created_at", { ascending: true });
  type TeacherRow = {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    created_at: string;
  };
  let teachers: TeacherRow[] | null = null;
  if (!withPhone.error) {
    teachers = (withPhone.data ?? []) as TeacherRow[];
  } else {
    const fallback = await supabase
      .from("users")
      .select("id, full_name, email, created_at")
      .eq("role", "teacher")
      .order("created_at", { ascending: true });
    teachers = ((fallback.data ?? []) as Omit<TeacherRow, "phone">[]).map(
      (t) => ({ ...t, phone: null }),
    );
  }
  if (q) {
    const needle = q.toLowerCase();
    teachers = teachers.filter(
      (t) =>
        t.full_name.toLowerCase().includes(needle) ||
        (t.email?.toLowerCase().includes(needle) ?? false) ||
        (t.phone?.includes(needle) ?? false),
    );
  }

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
              <TableHead>{t("contact")}</TableHead>
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
                  <TableCell className="text-muted-foreground text-sm">
                    {/* VN-first: prefer phone, but show both when set. */}
                    {teacher.phone || teacher.email ? (
                      <div className="space-y-0.5">
                        {teacher.phone ? (
                          <div className="text-foreground">
                            {teacher.phone}
                          </div>
                        ) : null}
                        {teacher.email ? (
                          <div className="text-muted-foreground text-xs">
                            {teacher.email}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      "—"
                    )}
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
