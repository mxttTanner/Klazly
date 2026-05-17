import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "./env";

/**
 * Service-role Supabase client. BYPASSES Row Level Security.
 * Use ONLY inside server actions / route handlers that have already
 * authorized the caller (e.g. via requireRole("admin")).
 *
 * Never expose this client to client components or the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
