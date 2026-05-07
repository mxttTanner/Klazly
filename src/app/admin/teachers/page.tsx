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
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const supabase = createClient();
  const { data: teachers } = await supabase
    .from("users")
    .select("id, full_name, email, created_at")
    .eq("role", "teacher")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Giáo viên</h1>
        <p className="text-muted-foreground text-sm">
          Thêm tài khoản giáo viên cho trung tâm. Chia sẻ mật khẩu khởi tạo qua
          Zalo hoặc kênh nội bộ.
        </p>
      </div>

      <TeacherForm />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ và tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-32 text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers && teachers.length > 0 ? (
              teachers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.email}
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={removeTeacher}>
                      <input type="hidden" name="id" value={t.id} />
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
                  colSpan={3}
                  className="text-muted-foreground py-6 text-center text-sm"
                >
                  Chưa có giáo viên nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
