"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  isEmailLike,
  normalizeVnPhone,
  syntheticEmailForPhone,
} from "@/lib/phone";

/**
 * Resolve a user-typed login identifier (email OR phone) to the email
 * that Supabase Auth expects on signInWithPassword.
 *
 * - "jean@example.com" → "jean@example.com" (lowercased)
 * - "0901234567" → look up by canonical "+84901234567" in public.users:
 *   - row with email set: return that email (account has a real email,
 *     auth lives there)
 *   - row with email null (phone-only): return the deterministic
 *     synthetic email "+84901234567@phone.parent-portal.local"
 *   - no row: still return the synthetic email so the eventual
 *     signInWithPassword fails with "invalid credentials" — same shape
 *     as a wrong password, so we don't leak which phones are registered.
 *
 * Runs as a server action because looking up public.users by phone
 * needs the service-role client; the regular RLS-scoped client can't
 * read other users' rows.
 */
export async function resolveLoginEmail(
  identifier: string,
): Promise<{ email: string } | { error: "invalidPhone" | "empty" }> {
  const trimmed = identifier.trim();
  if (!trimmed) return { error: "empty" };

  if (isEmailLike(trimmed)) {
    return { email: trimmed.toLowerCase() };
  }

  const phone = normalizeVnPhone(trimmed);
  if (!phone) return { error: "invalidPhone" };

  const supabase = createAdminClient();
  // Use limit(1) instead of maybeSingle: per-center uniqueness allows
  // the same phone across multiple centers (one parent with kids in two
  // schools). maybeSingle throws when more than one row matches, which
  // would crash login. With limit(1) + a deterministic order we pick
  // the newest-created row's email — if that user has a real email
  // they're routed to their real-email auth account; if all matching
  // rows are phone-only their auth is on the synthetic email anyway.
  const { data: hits } = await supabase
    .from("users")
    .select("email")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1);
  const hit = hits?.[0];

  // If the row exists and has a real email, use that. Otherwise fall
  // through to the synthetic email — either the user is phone-only,
  // or the phone isn't registered and signIn will fail naturally with
  // "invalid credentials" (same shape as a wrong password, so no
  // enumeration leak).
  if (hit?.email) return { email: hit.email };
  return { email: syntheticEmailForPhone(phone) };
}
