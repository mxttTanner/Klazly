import { BrandMark } from "@/components/brand-mark";

export function BrandLogo({
  size = "md",
  showText = true,
}: {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}) {
  const dimensions = {
    sm: { mark: "size-7", text: "text-base" },
    md: { mark: "size-9", text: "text-lg" },
    lg: { mark: "size-12", text: "text-2xl" },
  }[size];

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <BrandMark className={`shrink-0 text-primary ${dimensions.mark}`} />
      {showText ? (
        <span
          className={`min-w-0 truncate font-semibold tracking-tight ${dimensions.text}`}
        >
          Cổng Phụ Huynh
        </span>
      ) : null}
    </div>
  );
}
