/**
 * Program catalog helpers. The catalog itself lives in the database
 * (`center_programs` table) — each center manages its own list. This module
 * just provides:
 *   - default seed labels for new centers
 *   - a deterministic colour-tone picker so each program tile gets a stable
 *     accent without storing it in the DB
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

const TONE_PALETTE: string[] = [
  "bg-sky-50 text-sky-700",
  "bg-violet-50 text-violet-700",
  "bg-indigo-50 text-indigo-700",
  "bg-rose-50 text-rose-700",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-pink-50 text-pink-700",
  "bg-teal-50 text-teal-700",
  "bg-orange-50 text-orange-700",
  "bg-slate-100 text-slate-700",
];

/**
 * Pick a stable tone for a program label. Hashes the label so the same
 * program always gets the same colour, even after the admin renames it.
 */
export function toneForProgram(label: string | null | undefined): string {
  if (!label) return "bg-muted text-muted-foreground";
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash << 5) - hash + label.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % TONE_PALETTE.length;
  return TONE_PALETTE[idx];
}
