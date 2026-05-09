/**
 * Demo configuration. Three seed accounts, one for each role, so a
 * sales conversation can walk through admin → teacher → parent
 * without typing passwords or logging in/out manually.
 *
 * Credentials are public by design — anyone visiting /demo gets
 * logged in as one of these. Don't put real customer data behind
 * any of them.
 */
export const DEMO_ACCOUNTS = {
  admin: "admin@hoamai.test",
  teacher: "tu@hoamai.test",
  parent: "binh@parent.test",
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;

export const DEMO_PASSWORD = "password123";

const DEMO_EMAILS = new Set(
  Object.values(DEMO_ACCOUNTS).map((e) => e.toLowerCase()),
);

export function isDemoEmail(email: string | null | undefined): boolean {
  return !!email && DEMO_EMAILS.has(email.toLowerCase());
}
