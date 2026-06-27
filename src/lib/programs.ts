/**
 * Program catalog helpers. The catalog itself lives in the database
 * (`center_programs` table) — each center manages its own list. This module
 * just provides:
 *   - default seed labels for new centers
 *   - a single on-system tone for program chips (premium-minimal: one accent,
 *     colour is never decoration)
 */

export type ProgramRow = {
  id: string;
  label: string;
  sort_order: number;
};

/**
 * Suggested defaults shown to new admins as quick-add presets. Editable
 * after they're added — these are only seeds, not enforced.
 */
export const SUGGESTED_PROGRAMS: string[] = [
  "Cambridge KET (A2)",
  "Cambridge PET (B1)",
  "Cambridge FCE (B2)",
  "IELTS",
  "TOEIC",
  "English Communication",
  "Young Learners",
];

/**
 * Tone for a program chip. The old rainbow-per-program palette is retired:
 * the design system is single-accent, so every program now shares one quiet
 * primary tint. Signature is unchanged so callers don't need to change.
 */
export function toneForProgram(label: string | null | undefined): string {
  if (!label) return "bg-muted text-muted-foreground";
  return "bg-primary/10 text-primary";
}
