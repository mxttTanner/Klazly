import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { GraduationCap, Heart, Upload } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/**
 * /admin/import is no longer a top-level nav item — CSV import lives inline
 * on /admin/parents and /admin/students. We keep this route around as a
 * small redirect page for old bookmarks / sales-sheet links.
 */
export default async function ImportLegacyPage() {
  await requireRole("admin");
  const t = await getTranslations("import");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("legacyHint")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/admin/parents"
          className="bg-card group rounded-lg border p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-lg">
            <Heart className="size-5" />
          </div>
          <h2 className="mt-3 text-base font-semibold">
            {t("legacyParentsTitle")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("legacyParentsHint")}
          </p>
          <span
            className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-3 inline-flex items-center gap-1.5`}
          >
            <Upload className="size-3.5" />
            {t("legacyOpen")}
          </span>
        </Link>

        <Link
          href="/admin/students"
          className="bg-card group rounded-lg border p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-lg">
            <GraduationCap className="size-5" />
          </div>
          <h2 className="mt-3 text-base font-semibold">
            {t("legacyStudentsTitle")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("legacyStudentsHint")}
          </p>
          <span
            className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-3 inline-flex items-center gap-1.5`}
          >
            <Upload className="size-3.5" />
            {t("legacyOpen")}
          </span>
        </Link>
      </div>
    </div>
  );
}
