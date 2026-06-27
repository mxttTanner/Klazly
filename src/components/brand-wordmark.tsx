/**
 * Klazly wordmark — white text with an emerald "ly", matching the
 * marketing site and the product mockups. Used in the dark app chrome
 * (admin top bar, teacher/parent app bars) and the footer.
 */
export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-black tracking-[-0.5px] text-white ${className}`}>
      Klaz<span className="text-emerald-light">ly</span>
    </span>
  );
}
