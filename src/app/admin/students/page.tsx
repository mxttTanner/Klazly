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
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const supabase = createClient();

  const [{ data: students }, { data: classes }, { data: parents }] =
    await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, age, class_id, parent_user_id")
        .order("full_name", { ascending: true }),
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
        <h1 className="text-2xl font-semibold tracking-tight">Học sinh</h1>
        <p className="text-muted-foreground text-sm">
          Thêm học sinh, xếp lớp và liên kết tài khoản phụ huynh.
        </p>
      </div>

      <StudentForm classes={classes ?? []} parents={parents ?? []} />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ và tên</TableHead>
              <TableHead className="w-20">Tuổi</TableHead>
              <TableHead className="w-56">Lớp</TableHead>
              <TableHead className="w-56">Phụ huynh</TableHead>
              <TableHead className="w-24 text-right">Hành động</TableHead>
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
                    <InlineSelect
                      studentId={s.id}
                      field="class_id"
                      currentValue={s.class_id}
                      options={classOptions}
                      emptyLabel="Chưa xếp lớp"
                    />
                  </TableCell>
                  <TableCell>
                    <InlineSelect
                      studentId={s.id}
                      field="parent_user_id"
                      currentValue={s.parent_user_id}
                      options={parentOptions}
                      emptyLabel="Chưa liên kết"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={deleteStudent}>
                      <input type="hidden" name="id" value={s.id} />
                      <button
                        type="submit"
                        className={buttonVariants({
                          variant: "destructive",
                          size: "sm",
                        })}
                      >
                        Xoá
                      </button>
                    </form>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground py-6 text-center text-sm"
                >
                  Chưa có học sinh nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
