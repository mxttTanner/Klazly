import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function allowedEmails(): string[] {
  const raw = process.env.SUPER_ADMIN_EMAIL ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return allowedEmails().includes(email.toLowerCase());
}

/**
 * Returns the auth user if they are signed in AND their email matches
 * SUPER_ADMIN_EMAIL. Redirects to /login otherwise. The super admin does NOT
 * need a public.users row — they live above the per-center tenant model.
 */
export async function requireSuperAdmin(): Promise<{ id: string; email: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isSuperAdminEmail(user.email)) {
    redirect("/login");
  }
  return { id: user.id, email: user.email };
}
