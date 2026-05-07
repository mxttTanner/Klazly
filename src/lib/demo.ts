/**
 * Demo configuration. The demo admin is the seeded admin account; we recognize
 * "demo mode" by matching the current user's email against this constant so we
 * can show a banner across the app.
 *
 * The credentials are not secret — anyone visiting /demo gets logged in as this
 * user automatically. Don't put real customer data behind this account.
 */
export const DEMO_EMAIL = "admin@hoamai.test";
export const DEMO_PASSWORD = "password123";

export function isDemoEmail(email: string | null | undefined): boolean {
  return email === DEMO_EMAIL;
}
