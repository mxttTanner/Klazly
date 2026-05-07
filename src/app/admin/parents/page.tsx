import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ParentForm } from "./parent-form";
import { removeParent } from "./actions";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ParentsPage() {
  const supabase = createClient();
  const { data: parents } = await supabase
    .from("users")
    .select("id, full_name, email, created_at")
    .eq("role", "parent")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Phụ huynh</h1>
        <p className="text-muted-foreground text-sm">
          Tạo tài khoản phụ huynh để liên kết với học sinh.
        </p>
      </div>

      <ParentForm />

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
            {parents && parents.length > 0 ? (
              parents.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.email}
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={removeParent}>
                      <input type="hidden" name="id" value={p.id} />
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
                  Chưa có phụ huynh nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
