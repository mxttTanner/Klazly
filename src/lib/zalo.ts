/**
 * Single source of truth for the owner's Zalo contact across the
 * app. Everywhere a "Talk to me on Zalo" button or tel: link is
 * rendered, it should pull from here.
 *
 * Two non-obvious rules that have bitten us in production:
 *
 * 1. The personal-chat URL is https://zalo.me/{digits-only}.
 *    Including the leading '+' (https://zalo.me/+84862404036)
 *    silently fails on iOS Safari and Zalo Web. Use ZALO_URL
 *    everywhere; if you're constructing a URL from a user-typed
 *    phone, use buildZaloUrl() which strips '+', spaces, and dashes.
 *
 * 2. The ?message= query param is unreliable across Zalo Web vs
 *    the mobile app, especially with URL-encoded newlines and VN
 *    diacritics. For the pricing CTAs we use the copy-modal
 *    pattern (PricingCtaButton) instead. Don't add ?message= to
 *    ZALO_URL.
 */

/** Canonical digits-only phone for the platform owner. */
export const ZALO_PHONE_DIGITS = "84862404036";

/** Display form for human-readable contact strips. */
export const ZALO_PHONE_DISPLAY = "+84 86 240 4036";

/** Personal-chat URL — opens Zalo on mobile, Zalo Web on desktop. */
export const ZALO_URL = `https://zalo.me/${ZALO_PHONE_DIGITS}`;

/** tel: link with full E.164 (the '+' is required for the dialer
 *  to recognise the country code on iOS / Android). */
export const ZALO_TEL_URL = `tel:+${ZALO_PHONE_DIGITS}`;

/**
 * Build a personal-chat URL for an arbitrary phone number (used by
 * the super-admin "Message on Zalo" buttons that target a center's
 * own contact_phone). Strips '+', spaces, dashes, and parentheses
 * — the same characters users casually paste into phone fields.
 * Returns null when the input has no digits.
 */
export function buildZaloUrl(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://zalo.me/${digits}`;
}

/**
 * Heuristic: is the current navigator.userAgent inside a known
 * in-app browser where deep links to Zalo are unreliable? Covers
 * the four that matter for VN: Facebook (Messenger + main app),
 * Instagram, WeChat (MicroMessenger), and Line. Returns false on
 * the server and on every desktop browser.
 *
 * Caller is expected to be a client component; the consumer
 * decides whether to suppress the Zalo link entirely or just show
 * a hint banner pointing users at "Open in browser" in the in-app
 * browser's menu.
 */
export function isInAppBrowserUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return /FBAN|FBAV|Instagram|MicroMessenger|\bLine\//i.test(ua);
}
