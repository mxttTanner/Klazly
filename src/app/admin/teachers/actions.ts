"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const inviteSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(120),
  password: z.string().min(8).max(72),
});

export async function inviteTeacher(_prev: unknown, formData: FormData) {
  const admin = await requireRole("admin");

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      error: "Vui lòng nhập email hợp lệ, tên đầy đủ và mật khẩu ít nhất 8 ký tự.",
    };
  }

  const supabase = createAdminClient();

  const { data: created, error: authErr } = await supabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (authErr) {
    return { error: `Không thể tạo tài khoản: ${authErr.message}` };
  }

  const { error: profileErr } = await supabase.from("users").insert({
    id: created.user!.id,
    email: parsed.data.email,
    full_name: parsed.data.full_name,
    role: "teacher",
    center_id: admin.center_id,
  });
  if (profileErr) {
    await supabase.auth.admin.deleteUser(created.user!.id);
    return { error: `Không thể lưu hồ sơ giáo viên: ${profileErr.message}` };
  }

  revalidatePath("/admin/teachers");
  revalidatePath("/admin");
  return { success: `Đã thêm giáo viên ${parsed.data.full_name}.` };
}

export async function removeTeacher(formData: FormData) {
  const admin = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createAdminClient();

  const { data: target } = await supabase
    .from("users")
    .select("id, center_id, role")
    .eq("id", id)
    .single();

  if (!target || target.center_id !== admin.center_id || target.role !== "teacher") {
    return;
  }

  await supabase.auth.admin.deleteUser(id);
  revalidatePath("/admin/teachers");
  revalidatePath("/admin");
}
