import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathFor, type AppUser } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/super-admin";

export const dynamic = "force-dynamic";

export default async function PostLoginPage() {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  if (isSuperAdminEmail(authUser.email)) {
    redirect("/super-admin");
  }

  // Include must_change_password so we can force a first-login reset for
  // CSV-imported accounts. Fall back without it on older DBs that predate
  // the column so login still routes.
  type ProfileRow = Pick<
    AppUser,
    "id" | "email" | "full_name" | "role" | "center_id"
  > & { must_change_password?: boolean };
  let profile: ProfileRow | null = null;
  const withFlag = await supabase
    .from("users")
    .select("id, email, full_name, role, center_id, must_change_password")
    .eq("id", authUser.id)
    .single();
  if (!withFlag.error && withFlag.data) {
    profile = withFlag.data as ProfileRow;
  } else {
    const fb = await supabase
      .from("users")
      .select("id, email, full_name, role, center_id")
      .eq("id", authUser.id)
      .single();
    profile = (fb.data as ProfileRow | null) ?? null;
  }

  if (!profile) {
    // Auth session is valid but no profile exists. Most likely cause:
    // the user's center was deleted (cascades to public.users) while
    // their auth session is still alive. Without signing them out
    // they bounce login → post-login → login forever because login
    // sees a logged-in non-super-admin and post-login can't route
    // them. Sign out the stale session so /login can render fresh.
    await supabase.auth.signOut();
    redirect("/login");
  }

  // First-login forced password change (imported temp credentials). The
  // reset-password page works with the active session and clears the flag
  // on success, then routes back here to the dashboard.
  if (profile.must_change_password) {
    redirect("/reset-password?forced=1");
  }

  redirect(dashboardPathFor((profile as AppUser).role));
}
