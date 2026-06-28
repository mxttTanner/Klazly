import { cn } from "@/lib/utils";

// Single-accent tones. `light` for light surfaces (default); `dark` for
// the navy app bars, where the light tint is nearly invisible.
const AVATAR_TONES = {
  light: "bg-primary/10 text-primary ring-primary/15",
  dark: "bg-white/10 text-emerald-light ring-white/20",
} as const;

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
  tone = "light",
  className,
}: {
  name: string;
  /** Accepted for API stability; no longer affects colour now that avatars
   *  use a single tone. Safe to keep passing the user id. */
  seed?: string;
  size?: keyof typeof SIZE_CLASSES;
  tone?: keyof typeof AVATAR_TONES;
  className?: string;
}) {
  void seed;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1",
        SIZE_CLASSES[size],
        AVATAR_TONES[tone],
        className,
      )}
      aria-hidden="true"
    >
      {initial(name)}
    </span>
  );
}
