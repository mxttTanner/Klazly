import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AppUser = {
  id: string;
  // email is nullable now that phone-only accounts exist (see
  // db/users-phone.sql). When null, the user signs in by phone — the
  // synthetic Supabase Auth email is hidden from the app.
  email: string | null;
  phone: string | null;
  full_name: string;
  role: "admin" | "teacher" | "parent";
  center_id: string;
};

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Try the full select with phone; fall back without phone if the
  // db/users-phone.sql migration hasn't been applied yet so the rest
  // of the app keeps rendering on an older DB.
  const withPhone = await supabase
    .from("users")
    .select("id, email, phone, full_name, role, center_id")
    .eq("id", user.id)
    .single();
  if (!withPhone.error) {
    return (withPhone.data as AppUser) ?? null;
  }
  const fallback = await supabase
    .from("users")
    .select("id, email, full_name, role, center_id")
    .eq("id", user.id)
    .single();
  if (fallback.error || !fallback.data) return null;
  return { ...(fallback.data as Omit<AppUser, "phone">), phone: null };
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Center lock-out: if the user's center has its trial expired (or
  // was cancelled and past the grace period), bounce them to /locked
  // before any authed page renders. Data is preserved; the lock just
  // prevents access until the center pays. Uses the admin client so
  // we can read centers regardless of the user's RLS context.
  //
  // We swallow errors quietly — better to let a transient DB blip pass
  // through and render the dashboard than block legitimate users on
  // every request.
  try {
    const supabase = createAdminClient();
    const { data: center } = await supabase
      .from("centers")
      .select("subscription_status")
      .eq("id", user.center_id)
      .single();
    if (
      center?.subscription_status === "expired" ||
      center?.subscription_status === "canceled"
    ) {
      redirect("/locked");
    }
  } catch {
    // proceed
  }

  return user;
}

export async function requireRole(
  role: AppUser["role"] | AppUser["role"][],
): Promise<AppUser> {
  const user = await requireUser();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.role)) redirect(dashboardPathFor(user.role));
  return user;
}

export function dashboardPathFor(role: AppUser["role"]): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "teacher":
      return "/teacher";
    case "parent":
      return "/parent";
  }
}
