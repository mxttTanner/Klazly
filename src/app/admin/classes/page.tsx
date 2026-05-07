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

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const supabase = createClient();

  const [{ data: classes }, { data: teachers }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, schedule_text, teacher_id, teacher:users!classes_teacher_id_fkey(full_name)")
      .order("name", { ascending: true }),
    supabase
      .from("users")
      .select("id, full_name")
      .eq("role", "teacher")
      .order("full_name", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lớp học</h1>
        <p className="text-muted-foreground text-sm">
          Tạo lớp và phân công giáo viên phụ trách.
        </p>
      </div>

      <ClassForm teachers={teachers ?? []} />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên lớp</TableHead>
              <TableHead>Lịch học</TableHead>
              <TableHead className="w-64">Giáo viên</TableHead>
              <TableHead className="w-32 text-right">Hành động</TableHead>
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
                    <form action={deleteClass}>
                      <input type="hidden" name="id" value={c.id} />
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
                  colSpan={4}
                  className="text-muted-foreground py-6 text-center text-sm"
                >
                  Chưa có lớp nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
