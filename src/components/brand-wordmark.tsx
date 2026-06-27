/**
 * Klazly wordmark — white text with an emerald "ly", matching the
 * marketing site and the product mockups. Used in the dark app chrome
 * (admin top bar, teacher/parent app bars) and the footer.
 */
export function BrandWordmark({
  className = "",
  tone = "dark",
}: {
  className?: string;
  /** "dark" = white wordmark for dark surfaces; "light" = navy
   *  wordmark for light surfaces. The "ly" accent stays emerald,
   *  using the contrast-safe shade per surface. */
  tone?: "dark" | "light";
}) {
  const base = tone === "light" ? "text-navy" : "text-white";
  const accent = tone === "light" ? "text-emerald-dark" : "text-emerald-light";
  return (
    <span className={`font-black tracking-[-0.5px] ${base} ${className}`}>
      Klaz<span className={accent}>ly</span>
    </span>
  );
}
