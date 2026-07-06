/**
 * Worksheet category keys — must match the CHECK constraint in
 * db/worksheet-categories.sql. Display labels live in i18n under
 * worksheets.categories.*; NULL (legacy rows) renders as "other".
 */
export const WORKSHEET_CATEGORIES = [
  "grammar",
  "vocabulary",
  "reading",
  "writing",
  "listening",
  "speaking",
  "games",
  "homework",
  "exam",
  "other",
] as const;

export type WorksheetCategory = (typeof WORKSHEET_CATEGORIES)[number];

export function isWorksheetCategory(v: string): v is WorksheetCategory {
  return (WORKSHEET_CATEGORIES as readonly string[]).includes(v);
}
