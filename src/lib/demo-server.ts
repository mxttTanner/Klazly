import "server-only";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_ACCOUNTS } from "@/lib/demo";

/**
 * Server-side half of the demo configuration. The password used to be
 * exported from src/lib/demo.ts and imported by a client component, which
 * put it in the public JS bundle — "public by design", except a visitor
 * holding a live demo session could call the auth API directly and ROTATE
 * the shared password (or its email), locking every future prospect out
 * of the sales demo. Sign-in now happens in a server action, and the
 * super-admin dashboard's lazy maintenance pass self-heals the accounts.
 */
export const DEMO_PASSWORD = "password123";

/**
 * Reset every demo account's password + email back to the canonical
 * values. Best-effort and cheap (3 users); called from the super-admin
 * dashboard's lazy pass so a tampered demo account heals on the next
 * dashboard visit without needing a cron.
 */
export async function healDemoAccounts(): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: rows } = await admin
      .from("users")
      .select("id, email")
      .in("email", Object.values(DEMO_ACCOUNTS));
    for (const row of rows ?? []) {
      const { error } = await admin.auth.admin.updateUserById(row.id, {
        email: row.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
      if (error) {
        Sentry.captureException(error, {
          tags: { area: "demo-heal" },
          extra: { email: row.email },
        });
      }
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "demo-heal" } });
  }
}
