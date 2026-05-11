/**
 * Demo accounts (admin@hoamai, huong@hoamai, mai@parent) are public and
 * shared across every visitor of /demo. To keep the demo data clean we
 * block writes from demo callers — they can still browse the full UI but
 * any mutation (creating a class, sending a message, editing a lesson…)
 * is rejected with a friendly error. Server actions call this helper as
 * their first authz step after requireRole(...).
 *
 * Super-admin and real customers are NOT affected.
 */

import { isDemoEmail } from "@/lib/demo";

export function isDemoUser(user: {
  email: string | null | undefined;
}): boolean {
  return isDemoEmail(user.email);
}

/**
 * Returns a translation-key-style sentinel string that callers can show
 * to the user. Each action wraps it with its own t() so the user sees
 * "Demo mode — changes aren't saved." in whatever locale they're on.
 */
export const DEMO_READONLY_KEY = "demoReadOnly";
