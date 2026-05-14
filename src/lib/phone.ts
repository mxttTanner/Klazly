/**
 * Phone normalization for Vietnamese mobile numbers.
 *
 * Inputs we accept (admins / teachers / parents are lazy about format):
 *   0901234567        (local format with leading 0)
 *   +84 901 234 567   (international with spaces)
 *   84-901-234-567    (no plus, with dashes)
 *   84901234567       (no plus, no leading zero)
 *   +84901234567      (already canonical)
 *
 * Canonical form stored in public.users.phone:
 *   +84901234567      (E.164: + then country code then 9-digit subscriber)
 *
 * VN mobile prefixes after the leading 0 / +84 are 3, 5, 7, 8, 9
 * (covering Viettel / Vinaphone / Mobifone / Vietnamobile / Gmobile).
 * Landlines start with 2 and aren't valid for SMS-based future flows,
 * so we reject them — if a center insists on landlines we can revisit.
 *
 * TODO(international): when we expand outside Vietnam, add a country
 * selector to the form and route to libphonenumber-js for parsing.
 *
 * TODO(zalo-oauth): Zalo login uses phone too; canonical "+84..." form
 * is what the Zalo OpenID userinfo endpoint returns, so this normalizer
 * doubles as the join key for that future integration.
 */

/** Synthetic email domain — Supabase Auth needs an email, so phone-only
 *  users get a fake one in this domain. .local is reserved (RFC 6762)
 *  so no real mail server will ever own this. */
export const PHONE_AUTH_DOMAIN = "phone.parent-portal.local";

/**
 * Normalize a user-typed phone number to canonical "+84..." form.
 * Returns null if the input isn't a valid VN mobile number.
 */
export function normalizeVnPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Strip everything except digits.
  let digits = raw.replace(/\D/g, "");

  // Trim country code if user typed it.
  if (digits.startsWith("84")) digits = digits.slice(2);
  // Trim trunk-prefix leading zero if user typed local format.
  else if (digits.startsWith("0")) digits = digits.slice(1);

  // VN mobile: 9 digits starting with 3, 5, 7, 8, or 9.
  if (!/^[35789]\d{8}$/.test(digits)) return null;

  return `+84${digits}`;
}

/**
 * For display: re-spaced canonical form. "+84901234567" → "+84 90 123 4567".
 */
export function formatVnPhoneForDisplay(canonical: string | null): string {
  if (!canonical) return "";
  const m = /^\+84(\d{2})(\d{3})(\d{4})$/.exec(canonical);
  if (!m) return canonical;
  return `+84 ${m[1]} ${m[2]} ${m[3]}`;
}

/**
 * Generate the synthetic Supabase Auth email for a phone-only account.
 * Caller must pass an already-normalized canonical phone.
 */
export function syntheticEmailForPhone(canonicalPhone: string): string {
  return `${canonicalPhone}@${PHONE_AUTH_DOMAIN}`;
}

/** Does this look like one of our synthetic auth emails? */
export function isSyntheticEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(`@${PHONE_AUTH_DOMAIN}`);
}

/** Extract the canonical phone from a synthetic email. Returns null
 *  for real emails. */
export function phoneFromSyntheticEmail(
  email: string | null | undefined,
): string | null {
  if (!email || !isSyntheticEmail(email)) return null;
  const local = email.split("@")[0];
  // Sanity-check the extracted local part is the canonical form we made.
  return /^\+84[35789]\d{8}$/.test(local) ? local : null;
}

/**
 * Detect whether a login identifier looks like an email or a phone.
 * Used by the unified login field. Anything with "@" → email; anything
 * else we try to normalize as a VN phone.
 */
export function isEmailLike(input: string): boolean {
  return input.trim().includes("@");
}
