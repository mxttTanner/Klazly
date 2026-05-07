import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function TeacherHomePage() {
  const user = await requireRole("teacher");
  const supabase = createClient();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, schedule_text")
    .eq("teacher_id", user.id)
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Lớp của tôi
        </h1>
        <p className="text-muted-foreground text-sm">
          Chọn lớp để xem học sinh và ghi nhận bài học mới.
        </p>
      </div>

      {classes && classes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {classes.map((c) => (
            <Link key={c.id} href={`/teacher/classes/${c.id}`}>
              <Card className="transition hover:bg-muted/40">
                <CardHeader>
                  <CardTitle>{c.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {c.schedule_text ?? "Chưa có lịch học."}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Bạn chưa được phân công lớp nào. Liên hệ quản trị viên để được phân lớp.
        </p>
      )}
    </div>
  );
}
