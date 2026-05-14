import { cn } from "@/lib/utils";

// Six brand-friendly tones the avatar picks from deterministically based
// on the seed string (usually the user's name or id). Same input → same
// colour every render, so a given person looks consistent across pages
// without us having to store an avatar_color column.
const AVATAR_TONES = [
  "bg-sky-100 text-sky-700 ring-sky-200",
  "bg-violet-100 text-violet-700 ring-violet-200",
  "bg-emerald-100 text-emerald-700 ring-emerald-200",
  "bg-amber-100 text-amber-800 ring-amber-200",
  "bg-rose-100 text-rose-700 ring-rose-200",
  "bg-indigo-100 text-indigo-700 ring-indigo-200",
] as const;

function pickTone(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length];
}

function initial(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] ?? "";
  return last.charAt(0).toUpperCase() || "?";
}

const SIZE_CLASSES = {
  xs: "size-6 text-[10px]",
  sm: "size-7 text-xs",
  md: "size-9 text-sm",
  lg: "size-11 text-base",
} as const;

/**
 * Small coloured initial circle for a person. Vietnamese names are
 * "Last First Middle" by surname-first convention but the last token in
 * the visual order is still the given name, which is what the initial
 * should be drawn from — initial() handles that.
 */
export function Avatar({
  name,
  seed,
  size = "sm",
  className,
}: {
  name: string;
  /** Optional seed override; defaults to name. Use the user id for
   *  deterministic colour stability even if name changes. */
  seed?: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1",
        SIZE_CLASSES[size],
        pickTone(seed ?? name),
        className,
      )}
      aria-hidden="true"
    >
      {initial(name)}
    </span>
  );
}
