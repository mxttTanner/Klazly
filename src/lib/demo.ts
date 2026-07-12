/**
 * Demo configuration. Three seed accounts, one for each role, so a
 * sales conversation can walk through admin → teacher → parent
 * without typing passwords or logging in/out manually.
 *
 * Picked specifically because each has rich demo content:
 *  - admin@hoamai.test  — sees full center (2 classes, 6 students, 6 lessons)
 *  - huong@hoamai.test  — teaches both classes (Junior A + Senior B), 6 lessons
 *  - mai@parent.test    — has 2 children, 3 lessons each = lots to scroll
 *
 * Credentials are public by design — anyone visiting /demo gets
 * logged in as one of these. Don't put real customer data behind
 * any of them.
 */
export const DEMO_ACCOUNTS = {
  admin: "admin@hoamai.test",
  teacher: "huong@hoamai.test",
  parent: "mai@parent.test",
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;

// The shared demo password lives in src/lib/demo-server.ts ("server-only"):
// demo sign-in happens through a server action, so the credential never
// ships in the client bundle where anyone could lift it and rotate the
// account's password via the auth API, bricking the sales demo.

const DEMO_EMAILS = new Set(
  Object.values(DEMO_ACCOUNTS).map((e) => e.toLowerCase()),
);

export function isDemoEmail(email: string | null | undefined): boolean {
  return !!email && DEMO_EMAILS.has(email.toLowerCase());
}
