import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LessonForm } from "./lesson-form";

export const dynamic = "force-dynamic";

export default async function NewLessonPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole("teacher");
  const supabase = createClient();

  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, teacher_id")
    .eq("id", params.id)
    .single();
  if (!cls || cls.teacher_id !== user.id) notFound();

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name")
    .eq("class_id", cls.id)
    .order("full_name", { ascending: true });

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const defaultDate = `${yyyy}-${mm}-${dd}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Ghi nhận bài học mới
        </h1>
        <p className="text-muted-foreground text-sm">
          Lớp {cls.name} • {students?.length ?? 0} học sinh
        </p>
      </div>

      {students && students.length > 0 ? (
        <LessonForm
          classId={cls.id}
          className={cls.name}
          students={students}
          defaultDate={defaultDate}
        />
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Lớp chưa có học sinh nào. Vui lòng yêu cầu quản trị viên xếp học sinh
          vào lớp.
        </p>
      )}
    </div>
  );
}
