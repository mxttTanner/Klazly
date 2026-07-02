"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isEmailLike,
  normalizeVnPhone,
  syntheticEmailForPhone,
} from "@/lib/phone";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";

export type SignInResult =
  | { ok: true }
  | { error: "invalidPhone" | "empty" | "invalidCredentials" | "rateLimited" };

/**
 * Sign a user in from a typed identifier (email OR phone) + password,
 * entirely server-side.
 *
 * Phone→email resolution needs the service-role client (to read
 * public.users across centers), so it MUST happen on the server. The
 * resolved email is used only to call signInWithPassword here and is
 * NEVER returned to the browser — an earlier version returned the
 * resolved email to the client, which let anyone harvest a parent's
 * real email by POSTing their (semi-public) phone number. Now the
 * caller only learns success/failure.
 *
 * Resolution rules (unchanged):
 *   - "jean@example.com"  → itself, lowercased
 *   - "0901234567"        → canonical "+84901234567", then:
 *       row with real email → that email (auth lives there)
 *       phone-only row      → deterministic synthetic email
 *       no row              → synthetic email, so signIn fails with
 *                             "invalid credentials" (same shape as a
 *                             wrong password — no enumeration leak)
 *
 * The sign-in uses the SSR server client so the session cookies are
 * written on the response; the browser just calls router.refresh().
 */
export async function signInWithIdentifier(
  identifier: string,
  password: string,
): Promise<SignInResult> {
  const trimmed = identifier.trim();
  if (!trimmed) return { error: "empty" };

  // Rate limit per IP and per identifier: blunts credential stuffing and
  // the phone-resolution oracle. Best-effort (see lib/rate-limit).
  const ip = clientIpFrom(headers());
  const byIp = await rateLimit("login-ip", ip, 20, 60);
  if (!byIp.allowed) return { error: "rateLimited" };
  const byId = await rateLimit("login-id", trimmed.toLowerCase(), 8, 60);
  if (!byId.allowed) return { error: "rateLimited" };

  let email: string;
  if (isEmailLike(trimmed)) {
    email = trimmed.toLowerCase();
  } else {
    const phone = normalizeVnPhone(trimmed);
    if (!phone) return { error: "invalidPhone" };

    const admin = createAdminClient();
    // limit(1): the same phone can exist across multiple centers (one
    // parent, kids in two schools). Newest row wins; if it has a real
    // email their auth is there, otherwise auth is on the synthetic.
    const { data: hits } = await admin
      .from("users")
      .select("email")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1);
    email = hits?.[0]?.email ?? syntheticEmailForPhone(phone);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "invalidCredentials" };
  return { ok: true };
}
