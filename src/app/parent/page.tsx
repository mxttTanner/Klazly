import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ParentHomePage() {
  const user = await requireRole("parent");
  const supabase = createClient();

  const { data: students } = await supabase
    .from("students")
    .select(
      "id, full_name, age, class_id, class:classes(name, schedule_text, teacher:users!classes_teacher_id_fkey(full_name))",
    )
    .eq("parent_user_id", user.id)
    .order("full_name", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Con của bạn
        </h1>
        <p className="text-muted-foreground text-sm">
          Chọn con để xem tiến trình học tập gần đây.
        </p>
      </div>

      {students && students.length > 0 ? (
        <div className="space-y-3">
          {students.map((s) => {
            const cls = Array.isArray(s.class) ? s.class[0] : s.class;
            const teacher = cls
              ? Array.isArray(cls.teacher)
                ? cls.teacher[0]
                : cls.teacher
              : null;
            return (
              <Link key={s.id} href={`/parent/students/${s.id}`}>
                <Card className="transition hover:bg-muted/40">
                  <CardHeader className="pb-2">
                    <CardTitle>{s.full_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground space-y-1 text-sm">
                    {cls ? (
                      <>
                        <p>
                          <span className="text-foreground font-medium">
                            Lớp:
                          </span>{" "}
                          {cls.name}
                        </p>
                        {teacher ? (
                          <p>
                            <span className="text-foreground font-medium">
                              Giáo viên:
                            </span>{" "}
                            {teacher.full_name}
                          </p>
                        ) : null}
                        {cls.schedule_text ? (
                          <p>
                            <span className="text-foreground font-medium">
                              Lịch học:
                            </span>{" "}
                            {cls.schedule_text}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p>Chưa được xếp lớp.</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Tài khoản của bạn chưa được liên kết với học sinh nào. Vui lòng liên hệ
          trung tâm.
        </p>
      )}
    </div>
  );
}
