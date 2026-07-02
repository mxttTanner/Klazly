/**
 * Vietnam-timezone date helpers for SERVER code.
 *
 * The app's audience is entirely in Vietnam, but Vercel functions run in
 * UTC. `src/instrumentation.ts` sets `process.env.TZ`, but that proved
 * unreliable in production (live QA 2026-07-03: at 01:43 VN on July 3 the
 * teacher home and the lesson form's default date both said July 2). Any
 * server-rendered "today" or timestamp formatting must therefore pin
 * `timeZone` explicitly instead of trusting the process default.
 *
 * Client components have the same rule for a different reason: React
 * hydration mismatches (#418) when the visitor's browser TZ differs from
 * the server — see message-thread-view.tsx.
 */
export const VN_TZ = "Asia/Ho_Chi_Minh";

/** Today's date in Vietnam as a "YYYY-MM-DD" string (for <input type="date">
 *  defaults and date-only DB values). en-CA gives ISO ordering. */
export function vnTodayYMD(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Format a Date (or now) as a long human date in Vietnam time. */
export function vnLongDate(locale: string, date: Date = new Date()): string {
  return date.toLocaleDateString(locale, {
    timeZone: VN_TZ,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
