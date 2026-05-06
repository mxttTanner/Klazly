import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppUser = {
  id: string;
  email: string;
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

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, full_name, role, center_id")
    .eq("id", user.id)
    .single();

  return (profile as AppUser) ?? null;
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
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
