import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a Postgres `date` column value ("YYYY-MM-DD") as a local-midnight
 * Date. JS's `new Date("2026-04-27")` parses as UTC midnight, which renders
 * as the previous day in any timezone west of UTC. For our use case
 * (lesson_date stored without time, displayed to the user) we want
 * "the day the teacher meant" regardless of viewer timezone.
 */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
