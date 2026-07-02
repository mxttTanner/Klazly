"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Clear the must_change_password flag after the user has set a new
 * password on /reset-password. Called by the reset form once
 * supabase.auth.updateUser succeeds. Uses the active session to identify
 * the caller, then the service-role client to flip their own flag.
 *
 * Best-effort and self-scoped: it only ever touches the calling user's
 * own row, and a failure here must not block the reset from completing
 * (the password is already changed at that point). If the column doesn't
 * exist yet it silently no-ops.
 */
export async function clearMustChangePassword(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ must_change_password: false })
    .eq("id", user.id);
  // Swallow: unmigrated column or transient blip shouldn't strand the
  // user on the reset screen after they've already changed their password.
  void error;
}
