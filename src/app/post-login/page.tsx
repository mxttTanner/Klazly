import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathFor, type AppUser } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/super-admin";
import { BrandWordmark } from "@/components/brand-wordmark";
import { PostLoginRedirect } from "./redirect-client";

export const dynamic = "force-dynamic";

/**
 * Renders the branded loader with a client-side hop to `to`. We resolve
 * the destination server-side but navigate client-side: a server
 * redirect() chain skips the destination's loading.tsx during client
 * navigations, which left users staring at a blank white screen while
 * their dashboard queries ran (worst on the login and demo role-switch
 * paths). See redirect-client.tsx.
 */
function RouteTo({ to }: { to: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-navy text-white">
      <BrandWordmark className="text-3xl" />
      <Loader2 className="size-6 animate-spin text-emerald-light" />
      <PostLoginRedirect to={to} />
    </div>
  );
}

export default async function PostLoginPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  if (isSuperAdminEmail(authUser.email)) {
    return <RouteTo to="/super-admin" />;
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
    return <RouteTo to="/reset-password?forced=1" />;
  }

  return <RouteTo to={dashboardPathFor((profile as AppUser).role)} />;
}
