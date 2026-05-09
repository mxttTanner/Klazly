import { GraduationCap } from "lucide-react";

export function BrandLogo({
  size = "md",
  showText = true,
}: {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}) {
  const dimensions = {
    sm: { box: "size-7", icon: "size-4", text: "text-base" },
    md: { box: "size-9", icon: "size-5", text: "text-lg" },
    lg: { box: "size-12", icon: "size-7", text: "text-2xl" },
  }[size];

  return (
    <div className="inline-flex items-center gap-2.5">
      <div
        className={`bg-primary text-primary-foreground flex items-center justify-center rounded-lg ${dimensions.box}`}
      >
        <GraduationCap className={dimensions.icon} />
      </div>
      {showText ? (
        <span className={`font-semibold tracking-tight ${dimensions.text}`}>
          Cổng Phụ Huynh
        </span>
      ) : null}
    </div>
  );
}
