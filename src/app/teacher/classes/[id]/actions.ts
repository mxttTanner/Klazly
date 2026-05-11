"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoUser } from "@/lib/demo-guard";

const VALID_LEVELS = ["good", "okay", "needs_attention", "none"] as const;

export async function setStudentLevel(formData: FormData) {
  const user = await requireRole(["admin", "teacher"]);
  const studentId = String(formData.get("student_id") ?? "");
  const levelRaw = String(formData.get("level") ?? "");
  if (!studentId || !VALID_LEVELS.includes(levelRaw as never)) return;
  if (isDemoUser(user)) return;
  const level = levelRaw === "none" ? null : levelRaw;

  const supabase = createAdminClient();

  // Verify the student belongs to the same center, and that a teacher caller
  // teaches the student's class. Admin can update anyone in their center.
  const { data: student } = await supabase
    .from("students")
    .select("id, center_id, class_id")
    .eq("id", studentId)
    .single();
  if (!student || student.center_id !== user.center_id) return;

  if (user.role === "teacher") {
    if (!student.class_id) return;
    const { data: cls } = await supabase
      .from("classes")
      .select("teacher_id")
      .eq("id", student.class_id)
      .single();
    if (!cls || cls.teacher_id !== user.id) return;
  }

  await supabase
    .from("students")
    .update({ overall_level: level })
    .eq("id", studentId);

  revalidatePath(`/teacher/classes/${student.class_id ?? ""}`);
  revalidatePath("/admin/students");
}
