"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight scroll-reveal wrapper. Uses IntersectionObserver to add
 * an "in-view" class once the element is at least 10% visible, then
 * disconnects to stop watching (one-shot reveal — we never re-hide).
 *
 * Set `delay` (ms) to stagger siblings.
 *
 * Respects prefers-reduced-motion: in that case, the children appear
 * immediately without animation.
 */
export function ScrollReveal({
  children,
  delay = 0,
  className,
  as: Component = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Respect reduced motion — show immediately.
    if (typeof window !== "undefined") {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (reduced.matches) {
        setVisible(true);
        return;
      }
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const style: CSSProperties = { transitionDelay: `${delay}ms` };

  return (
    <Component
      ref={ref}
      style={style}
      className={cn(
        "transition-all duration-700 ease-out will-change-transform",
        visible
          ? "translate-y-0 opacity-100 blur-none"
          : "translate-y-6 opacity-0 blur-sm",
        className,
      )}
    >
      {children}
    </Component>
  );
}
