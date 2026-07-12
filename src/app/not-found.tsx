import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Compass, Home } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center px-4">
      <div className="bg-card max-w-md space-y-5 rounded-2xl border p-6 shadow-sm text-center">
        <div className="bg-primary/10 text-primary mx-auto inline-flex size-12 items-center justify-center rounded-full">
          <Compass className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            404
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </div>
        <div className="flex justify-center">
          <Link
            href="/"
            className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            <Home className="size-4" />
            {t("backHome")}
          </Link>
        </div>
        <div className="border-t pt-4">
          <BrandLogo size="sm" />
        </div>
      </div>
    </div>
  );
}
