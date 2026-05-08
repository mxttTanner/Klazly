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

  if (!profile) redirect("/login");
  redirect(dashboardPathFor((profile as AppUser).role));
}
