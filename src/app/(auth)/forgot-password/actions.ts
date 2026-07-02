"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isEmailLike } from "@/lib/phone";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";

export type ResetRequestResult =
  | { ok: true }
  | { error: "notEmail" | "rateLimited" };

/**
 * Request a password-reset email, server-side. Two reasons this is a
 * server action rather than a direct browser call:
 *
 *  1. Rate limiting — throttles reset-email bombing of a victim's inbox
 *     (per IP + per email). Best-effort (see lib/rate-limit).
 *  2. The redirect origin is derived server-side from a trusted source
 *     (NEXT_PUBLIC_APP_URL, else the request host) rather than the
 *     browser's window.location.origin, so a tampered client can't aim
 *     the recovery link elsewhere. (Supabase's Redirect-URL allowlist is
 *     still the hard backstop.)
 *
 * Always returns { ok: true } on a valid email regardless of whether the
 * account exists — no enumeration leak.
 */
export async function requestPasswordReset(
  identifier: string,
): Promise<ResetRequestResult> {
  const email = identifier.trim().toLowerCase();
  // Phone reset isn't supported yet (no SMS provider); the form surfaces
  // that separately, but guard here too.
  if (!isEmailLike(email)) return { error: "notEmail" };

  const hdrs = headers();
  const ip = clientIpFrom(hdrs);
  const byIp = await rateLimit("reset-ip", ip, 5, 300);
  if (!byIp.allowed) return { error: "rateLimited" };
  const byId = await rateLimit("reset-id", email, 3, 300);
  if (!byId.allowed) return { error: "rateLimited" };

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    `https://${hdrs.get("host") ?? "klazly.com"}`;

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });
  // Swallow: showing the same "check your inbox" state regardless of
  // whether the email exists prevents account enumeration.
  if (error) {
    console.warn("[forgot-password] supabase error", error.message);
  }
  return { ok: true };
}
