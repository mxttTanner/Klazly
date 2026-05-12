"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireSuperAdmin } from "@/lib/super-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const PLAN_VALUES = ["monthly", "six_months", "annual"] as const;
type Plan = (typeof PLAN_VALUES)[number];

const createCenterSchema = z.object({
  center_name: z.string().min(1).max(120),
  admin_full_name: z.string().min(1).max(120),
  // Normalise: trim + lowercase so a center created with "Foo@Bar.com"
  // matches the lowercased email Supabase Auth stores.
  admin_email: z
    .string()
    .email()
    .transform((s) => s.trim().toLowerCase()),
  admin_password: z.string().min(8).max(72),
  contact_phone: z.string().max(40).optional().nullable(),
  subscription_plan: z.enum(PLAN_VALUES).optional().nullable(),
});

export async function createCenter(_prev: unknown, formData: FormData) {
  await requireSuperAdmin();
  const t = await getTranslations("superAdmin");

  const planRaw = String(formData.get("subscription_plan") ?? "");
  const parsed = createCenterSchema.safeParse({
    center_name: formData.get("center_name"),
    admin_full_name: formData.get("admin_full_name"),
    admin_email: formData.get("admin_email"),
    admin_password: formData.get("admin_password"),
    contact_phone: formData.get("contact_phone") || null,
    subscription_plan:
      planRaw && (PLAN_VALUES as readonly string[]).includes(planRaw)
        ? (planRaw as Plan)
        : null,
  });
  if (!parsed.success) return { error: t("validation") };

  const supabase = createAdminClient();

  // Default trial: 14 days from creation.
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);

  // Try inserting with subscription_plan; fall back without it if the
  // column doesn't exist yet (migration not run).
  const baseInsert = {
    name: parsed.data.center_name,
    contact_email: parsed.data.admin_email,
    contact_phone: parsed.data.contact_phone,
    subscription_status: "trial",
    trial_ends_at: trialEnds.toISOString(),
  };
  let { data: center, error: centerErr } = await supabase
    .from("centers")
    .insert({ ...baseInsert, subscription_plan: parsed.data.subscription_plan })
    .select()
    .single();
  if (centerErr && /subscription_plan/i.test(centerErr.message)) {
    const retry = await supabase
      .from("centers")
      .insert(baseInsert)
      .select()
      .single();
    center = retry.data;
    centerErr = retry.error;
  }
  if (centerErr || !center) {
    return {
      error: t("createCenterError", { message: centerErr?.message ?? "" }),
    };
  }

  const { data: created, error: authErr } = await supabase.auth.admin.createUser({
    email: parsed.data.admin_email,
    password: parsed.data.admin_password,
    email_confirm: true,
  });
  if (authErr || !created.user) {
    await supabase.from("centers").delete().eq("id", center.id);
    return {
      error: t("createUserError", { message: authErr?.message ?? "" }),
    };
  }

  const { error: profileErr } = await supabase.from("users").insert({
    id: created.user.id,
    email: parsed.data.admin_email,
    full_name: parsed.data.admin_full_name,
    role: "admin",
    center_id: center.id,
  });
  if (profileErr) {
    await supabase.auth.admin.deleteUser(created.user.id);
    await supabase.from("centers").delete().eq("id", center.id);
    return {
      error: t("createProfileError", { message: profileErr.message }),
    };
  }

  revalidatePath("/super-admin");
  return {
    success: t("createdHint", {
      center: parsed.data.center_name,
      email: parsed.data.admin_email,
    }),
  };
}

export async function updateSubscriptionPlan(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const planRaw = String(formData.get("plan") ?? "");
  if (!id) return;
  const plan: Plan | null =
    planRaw && (PLAN_VALUES as readonly string[]).includes(planRaw)
      ? (planRaw as Plan)
      : null;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("centers")
    .update({ subscription_plan: plan })
    .eq("id", id);
  if (error) {
    // If the column is missing the super-admin needs to run the
    // migration; surface a helpful hint instead of silently swallowing.
    // Any other error (RLS, network, FK) also surfaces so the caller
    // doesn't think a failed update succeeded.
    if (/subscription_plan/i.test(error.message)) {
      return { error: "subscription_plan column not migrated yet" };
    }
    return { error: error.message };
  }

  revalidatePath("/super-admin");
  return { success: true };
}

export async function updateSubscriptionStatus(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (
    !id ||
    !["trial", "active", "past_due", "canceled"].includes(status)
  )
    return { error: "invalid input" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("centers")
    .update({ subscription_status: status })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/super-admin");
  return { success: true };
}

export async function updateCenterNotes(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const notesRaw = String(formData.get("notes") ?? "");
  if (!id) return { error: "missing id" };
  // Cap at 4000 chars so a misclick paste doesn't blow the cell up.
  const notes = notesRaw.trim().slice(0, 4000) || null;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("centers")
    .update({ notes })
    .eq("id", id);
  if (error && /notes/i.test(error.message)) {
    // Column missing — migration not run yet. Silent no-op so the UI
    // doesn't crash; super-admin needs to run db/center-notes.sql.
    return { error: "notes column not migrated yet" };
  }
  if (error) return { error: error.message };

  revalidatePath("/super-admin");
  return { success: true };
}

export async function deleteCenterCascade(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createAdminClient();

  // Find every auth user in this center so we can delete them along with the
  // center cascade. (centers.* CASCADE only deletes public.users rows; auth.users
  // lives in a different schema and Supabase doesn't auto-cascade across.)
  const { data: profiles } = await supabase
    .from("users")
    .select("id")
    .eq("center_id", id);

  await supabase.from("centers").delete().eq("id", id);
  for (const p of profiles ?? []) {
    await supabase.auth.admin.deleteUser(p.id);
  }

  revalidatePath("/super-admin");
}
