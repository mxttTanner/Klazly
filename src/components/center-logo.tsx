import { GraduationCap } from "lucide-react";

/**
 * Topbar logo for an authenticated user. Uses the center's uploaded logo if
 * one is set; otherwise falls back to the generic brand mark. Always shows
 * the center name (or product name if center is unknown) next to the mark.
 *
 * Server component — keep it simple, no client deps.
 */
export function CenterLogo({
  centerName,
  logoUrl,
  size = "sm",
}: {
  centerName: string | null | undefined;
  logoUrl: string | null | undefined;
  size?: "sm" | "md";
}) {
  const dimensions = {
    sm: { box: "size-9", icon: "size-5", text: "text-sm" },
    md: { box: "size-11", icon: "size-6", text: "text-base" },
  }[size];

  return (
    <div className="inline-flex items-center gap-2.5">
      {logoUrl ? (
        <div
          className={`bg-background flex shrink-0 items-center justify-center overflow-hidden rounded-lg border ${dimensions.box}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt={centerName ?? ""}
            className="max-h-full max-w-full object-contain p-0.5"
          />
        </div>
      ) : (
        <div
          className={`bg-primary text-primary-foreground flex shrink-0 items-center justify-center rounded-lg ${dimensions.box}`}
        >
          <GraduationCap className={dimensions.icon} />
        </div>
      )}
      <span className={`truncate font-semibold tracking-tight ${dimensions.text}`}>
        {centerName ?? "Cổng Phụ Huynh"}
      </span>
    </div>
  );
}
