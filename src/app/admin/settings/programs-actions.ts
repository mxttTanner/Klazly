"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUGGESTED_PROGRAMS } from "@/lib/programs";

const labelSchema = z.string().trim().min(1).max(80);

function nullableTrim(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

/**
 * Create a single program with the given label.
 */
export async function createProgram(_prev: unknown, formData: FormData) {
  const admin = await requireRole("admin");
  const t = await getTranslations("settings");

  const label = nullableTrim(formData.get("label"));
  const parsed = labelSchema.safeParse(label);
  if (!parsed.success) return { error: t("programsValidation") };

  const supabase = createAdminClient();

  // Determine next sort_order = max + 10 so admin can manually re-order later.
  const { data: existing } = await supabase
    .from("center_programs")
    .select("sort_order")
    .eq("center_id", admin.center_id)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSort =
    existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 10 : 10;

  const { error } = await supabase.from("center_programs").insert({
    center_id: admin.center_id,
    label: parsed.data,
    sort_order: nextSort,
  });
  if (error) {
    if (/duplicate key/i.test(error.message)) {
      return { error: t("programsDuplicate", { label: parsed.data }) };
    }
    return { error: t("programsSaveError", { message: error.message }) };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/admin/classes");
  return { success: t("programsAdded", { label: parsed.data }) };
}

/**
 * Bulk-add the suggested defaults that aren't already present.
 */
export async function seedSuggestedPrograms() {
  const admin = await requireRole("admin");
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("center_programs")
    .select("label")
    .eq("center_id", admin.center_id);
  const have = new Set(
    (existing ?? []).map((r) => (r.label as string).toLowerCase()),
  );

  let nextSort = 10;
  const rows: Array<{ center_id: string; label: string; sort_order: number }> =
    [];
  for (const label of SUGGESTED_PROGRAMS) {
    if (have.has(label.toLowerCase())) continue;
    rows.push({
      center_id: admin.center_id,
      label,
      sort_order: nextSort,
    });
    nextSort += 10;
  }
  if (rows.length === 0) return;

  await supabase.from("center_programs").insert(rows);
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/admin/classes");
}

/**
 * Rename a program. Cascades the new label to every class.program that
 * referenced the old one (within the same center).
 */
export async function renameProgram(_prev: unknown, formData: FormData) {
  const admin = await requireRole("admin");
  const t = await getTranslations("settings");

  const id = String(formData.get("id") ?? "");
  const label = nullableTrim(formData.get("label"));
  const parsedLabel = labelSchema.safeParse(label);
  if (!id || !parsedLabel.success) return { error: t("programsValidation") };

  const supabase = createAdminClient();

  const { data: prog } = await supabase
    .from("center_programs")
    .select("id, center_id, label")
    .eq("id", id)
    .single();
  if (!prog || prog.center_id !== admin.center_id) {
    return { error: t("programsValidation") };
  }
  const oldLabel = prog.label as string;
  if (oldLabel === parsedLabel.data) return { success: undefined };

  const { error: updErr } = await supabase
    .from("center_programs")
    .update({ label: parsedLabel.data })
    .eq("id", id);
  if (updErr) {
    if (/duplicate key/i.test(updErr.message)) {
      return {
        error: t("programsDuplicate", { label: parsedLabel.data }),
      };
    }
    return { error: t("programsSaveError", { message: updErr.message }) };
  }

  // Cascade rename across classes that referenced the old label.
  await supabase
    .from("classes")
    .update({ program: parsedLabel.data })
    .eq("center_id", admin.center_id)
    .eq("program", oldLabel);

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/admin/classes");
  return { success: t("programsRenamed", { label: parsedLabel.data }) };
}

/**
 * Delete a program. Clears `program` on every class that referenced it.
 */
export async function deleteProgram(formData: FormData) {
  const admin = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createAdminClient();

  const { data: prog } = await supabase
    .from("center_programs")
    .select("id, center_id, label")
    .eq("id", id)
    .single();
  if (!prog || prog.center_id !== admin.center_id) return;

  await supabase
    .from("classes")
    .update({ program: null })
    .eq("center_id", admin.center_id)
    .eq("program", prog.label as string);

  await supabase.from("center_programs").delete().eq("id", id);
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/admin/classes");
}
