import { getTranslations } from "next-intl/server";
import { ImageIcon } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoUploadForm } from "./logo-upload-form";
import { removeCenterLogo } from "./actions";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireRole("admin");
  const t = await getTranslations("settings");
  const supabase = createClient();

  const { data: center } = await supabase
    .from("centers")
    .select("name, logo_url")
    .eq("id", user.center_id)
    .single();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <section className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <ImageIcon className="text-primary size-5" />
          <h2 className="text-lg font-semibold">{t("logoSection")}</h2>
        </div>
        <p className="text-muted-foreground text-sm">{t("logoSectionHelp")}</p>

        <div className="flex flex-wrap items-center gap-6">
          <div className="bg-muted/40 flex size-32 items-center justify-center rounded-lg border">
            {center?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={center.logo_url}
                alt={center?.name ?? ""}
                className="max-h-full max-w-full object-contain p-2"
              />
            ) : (
              <ImageIcon className="text-muted-foreground size-10" />
            )}
          </div>
          <div className="flex-1 min-w-[16rem] space-y-3">
            <p className="text-sm font-medium">
              {center?.name ?? "—"}
            </p>
            {center?.logo_url ? (
              <form action={removeCenterLogo}>
                <button
                  type="submit"
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                  })}
                >
                  {t("logoRemove")}
                </button>
              </form>
            ) : null}
          </div>
        </div>

        <div className="border-t pt-4">
          <LogoUploadForm />
        </div>
      </section>
    </div>
  );
}
