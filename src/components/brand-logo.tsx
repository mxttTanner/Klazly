import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand-mark";

/**
 * App brand lockup used in headers / login / footer. Wordmark is
 * "Klazly". On size="lg" we add the localized tagline underneath since
 * there's room; on sm/md we keep the wordmark alone so the topbar
 * stays compact. (useTranslations works in both server and client
 * components, which this shared lockup is used from.)
 */
export function BrandLogo({
  size = "md",
  showText = true,
}: {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}) {
  const t = useTranslations("common");
  const dimensions = {
    sm: { mark: "size-7", text: "text-base", sub: null },
    md: { mark: "size-9", text: "text-lg", sub: null },
    lg: {
      mark: "size-12",
      text: "text-2xl",
      sub: t("brandTagline"),
    },
  }[size];

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <BrandMark className={`shrink-0 text-primary ${dimensions.mark}`} />
      {showText ? (
        <span className="min-w-0">
          <span
            className={`block line-clamp-1 font-semibold leading-tight tracking-tight ${dimensions.text}`}
          >
            Klazly
          </span>
          {dimensions.sub ? (
            <span className="text-muted-foreground block truncate text-xs leading-snug">
              {dimensions.sub}
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
