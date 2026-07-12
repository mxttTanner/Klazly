"use server";

import { createClient } from "@/lib/supabase/server";
import { DEMO_ACCOUNTS, type DemoRole } from "@/lib/demo";
import { DEMO_PASSWORD } from "@/lib/demo-server";

/**
 * Sign the visitor in as one of the demo accounts, server-side. The
 * SSR supabase client writes the session cookies, so the browser ends
 * up authenticated without the shared password ever reaching the
 * client bundle (see src/lib/demo-server.ts for why that matters).
 */
export async function signInAsDemo(
  role: DemoRole,
): Promise<{ error?: string }> {
  const email = DEMO_ACCOUNTS[role];
  if (!email) return { error: "unknown role" };

  const supabase = await createClient();
  // Drop any existing session first (a real user clicking the demo, or a
  // previous demo role) so the sign-in below is a clean switch.
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: DEMO_PASSWORD,
  });
  if (error) return { error: error.message };
  return {};
}
