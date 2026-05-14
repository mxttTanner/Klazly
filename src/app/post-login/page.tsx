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

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, full_name, role, center_id")
    .eq("id", authUser.id)
    .single();

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
  redirect(dashboardPathFor((profile as AppUser).role));
}
