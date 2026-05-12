import type { SVGProps } from "react";

/**
 * Parent Portal brand mark. A rounded chat-bubble silhouette with a
 * graduation cap inside — communicates "education that's about
 * parent ↔ teacher conversation", which is the product story.
 *
 * Uses currentColor so it tints via Tailwind (e.g. `text-primary`).
 * Render at any square size: `<BrandMark className="size-9" />`.
 */
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="48" height="48" rx="11" fill="currentColor" />
      {/* Speech bubble */}
      <path
        d="M11 16c0-3 2-5 5-5h16c3 0 5 2 5 5v12c0 3-2 5-5 5h-8l-6 5v-5h-2c-3 0-5-2-5-5V16z"
        fill="white"
        opacity="0.95"
      />
      {/* Mortarboard top */}
      <path d="M16 21l8-3 8 3-8 3-8-3z" fill="currentColor" />
      {/* Mortarboard band */}
      <path
        d="M21 23v3c0 1 1.5 1.7 3 1.7s3-.7 3-1.7v-3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Tassel */}
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
