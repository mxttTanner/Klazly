// Candidate logo marks. Three distinct directions — pick one and we'll
// roll it into BrandLogo as the production mark.
//
// All marks render at the size of their parent (use w-X h-X classes).
// They use currentColor for the body fill so the surrounding container
// can tint them via Tailwind (text-primary, text-white, etc.).

import type { SVGProps } from "react";

/**
 * Mark A — "Open book + spark"
 * A simple open book silhouette with a small spark above the spine.
 * Reads as: learning, with something happening / new. Familiar and
 * approachable; works as small favicon.
 */
export function MarkA(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="48" height="48" rx="11" fill="currentColor" />
      {/* book pages */}
      <path
        d="M11 17c5-2 9-2 13 1v18c-4-3-8-3-13-1V17z"
        fill="white"
        opacity="0.95"
      />
      <path
        d="M37 17c-5-2-9-2-13 1v18c4-3 8-3 13-1V17z"
        fill="white"
        opacity="0.95"
      />
      {/* spine */}
      <path d="M24 18v18" stroke="white" strokeWidth="1.2" opacity="0.6" />
      {/* spark */}
      <path
        d="M24 8l1.4 3 3 1.4-3 1.4-1.4 3-1.4-3-3-1.4 3-1.4z"
        fill="white"
      />
    </svg>
  );
}

/**
 * Mark B — "Speech bubble + grad cap"
 * A rounded chat bubble with a small graduation cap inside. Reads as:
 * education that's about communication / conversation — which is
 * exactly the parent-teacher message product story.
 */
export function MarkB(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="48" height="48" rx="11" fill="currentColor" />
      {/* bubble */}
      <path
        d="M11 16c0-3 2-5 5-5h16c3 0 5 2 5 5v12c0 3-2 5-5 5h-8l-6 5v-5h-2c-3 0-5-2-5-5V16z"
        fill="white"
        opacity="0.95"
      />
      {/* mortarboard */}
      <path
        d="M16 21l8-3 8 3-8 3-8-3z"
        fill="currentColor"
      />
      <path
        d="M21 23v3c0 1 1.5 1.7 3 1.7s3-.7 3-1.7v-3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="32" cy="22" r="0.8" fill="currentColor" />
      <path
        d="M32 22v3"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Mark C — "Stylized P monogram"
 * A bold "P" letter in a rounded tile — minimalist, modern, scales
 * cleanly to favicon. Closest to a tech-brand identity (Linear,
 * Notion vibe). Easiest to print on shirts / cards too.
 */
export function MarkC(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="48" height="48" rx="11" fill="currentColor" />
      {/* P shape */}
      <path
        d="M16 11h11c4.5 0 8 3.6 8 8s-3.5 8-8 8h-6v10h-5V11z"
        fill="white"
      />
      <circle cx="24" cy="19" r="3" fill="currentColor" />
      {/* small dot under the bowl — references a child */}
      <circle cx="20" cy="35" r="1.5" fill="white" />
    </svg>
  );
}
