"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoUser } from "@/lib/demo-guard";

const createSchema = z.object({
  full_name: z.string().min(1).max(120),
  age: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(30)])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  class_id: z.string().uuid().nullable(),
  parent_user_id: z.string().uuid().nullable(),
});

function nullable(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "");
  return s && s !== "none" ? s : null;
}

export async function createStudent(_prev: unknown, formData: FormData) {
  const admin = await requireRole("admin");
  const t = await getTranslations("admin.students");
  const tc = await getTranslations("common");
  if (isDemoUser(admin)) return { error: tc("demoReadOnly") };

  const parsed = createSchema.safeParse({
    full_name: formData.get("full_name"),
    age: formData.get("age") ?? "",
    class_id: nullable(formData.get("class_id")),
    parent_user_id: nullable(formData.get("parent_user_id")),
  });
  if (!parsed.success) return { error: t("validation") };

  const supabase = createAdminClient();

  if (parsed.data.class_id) {
    const { data: cls } = await supabase
      .from("classes")
      .select("center_id")
      .eq("id", parsed.data.class_id)
      .single();
    if (!cls || cls.center_id !== admin.center_id) {
      return { error: t("invalidClass") };
    }
  }
  if (parsed.data.parent_user_id) {
    const { data: p } = await supabase
      .from("users")
      .select("center_id, role")
      .eq("id", parsed.data.parent_user_id)
      .single();
    if (!p || p.center_id !== admin.center_id || p.role !== "parent") {
      return { error: t("invalidParent") };
    }
  }

  const { error } = await supabase.from("students").insert({
    center_id: admin.center_id,
    full_name: parsed.data.full_name,
    age: parsed.data.age,
    class_id: parsed.data.class_id,
    parent_user_id: parsed.data.parent_user_id,
  });
  if (error) return { error: t("createError", { message: error.message }) };

  revalidatePath("/admin/students");
  revalidatePath("/admin");
  return { success: t("createdHint", { name: parsed.data.full_name }) };
}

export async function updateStudent(
  formData: FormData,
): Promise<{ error?: string } | void> {
  const admin = await requireRole("admin");
  const tc = await getTranslations("common");
  const id = String(formData.get("id") ?? "");
  const field = String(formData.get("field") ?? "");
  const valueRaw = formData.get("value");
  if (!id || !["class_id", "parent_user_id"].includes(field)) {
    return { error: tc("notAllowed") };
  }
  if (isDemoUser(admin)) return { error: tc("demoReadOnly") };

  const supabase = createAdminClient();

  const { data: student } = await supabase
    .from("students")
    .select("center_id")
    .eq("id", id)
    .single();
  if (!student || student.center_id !== admin.center_id) {
    return { error: tc("notAllowed") };
  }

  const value = nullable(valueRaw);

  if (field === "class_id" && value) {
    const { data: cls } = await supabase
      .from("classes")
      .select("center_id")
      .eq("id", value)
      .single();
    if (!cls || cls.center_id !== admin.center_id) {
      return { error: tc("notAllowed") };
    }
  }
  if (field === "parent_user_id" && value) {
    const { data: p } = await supabase
      .from("users")
      .select("center_id, role")
      .eq("id", value)
      .single();
    if (!p || p.center_id !== admin.center_id || p.role !== "parent") {
      return { error: tc("notAllowed") };
    }
  }

  const { error } = await supabase
    .from("students")
    .update({ [field]: value })
    .eq("id", id);
  if (error) return { error: tc("saveFailed", { message: error.message }) };
  revalidatePath("/admin/students");
}

export async function deleteStudent(
  formData: FormData,
): Promise<{ error?: string } | void> {
  const admin = await requireRole("admin");
  const tc = await getTranslations("common");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: tc("notAllowed") };
  if (isDemoUser(admin)) return { error: tc("demoReadOnly") };

  const supabase = createAdminClient();

  const { data: student } = await supabase
    .from("students")
    .select("center_id")
    .eq("id", id)
    .single();
  if (!student || student.center_id !== admin.center_id) {
    return { error: tc("notAllowed") };
  }

  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) return { error: tc("deleteFailed", { message: error.message }) };
  revalidatePath("/admin/students");
  revalidatePath("/admin");
}
