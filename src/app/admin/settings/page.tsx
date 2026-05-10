import { getTranslations } from "next-intl/server";
import { BookMarked, FileText, ImageIcon } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoUploadForm } from "./logo-upload-form";
import { ReportSettingsForm } from "./report-settings-form";
import { ProgramsForm } from "./programs-form";
import { SettingsTabs } from "./settings-tabs";
import { removeCenterLogo } from "./actions";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireRole("admin");
  const t = await getTranslations("settings");
  const supabase = createClient();

  const { data: center } = await supabase
    .from("centers")
    .select(
      "name, logo_url, report_intro_text, report_footer_text, report_show_summary, report_show_signatures, report_signature_label_left, report_signature_label_right",
    )
    .eq("id", user.center_id)
    .single();

  // Programs catalog. Fall back to empty if migration hasn't been run.
  const programsRes = await supabase
    .from("center_programs")
    .select("id, label, sort_order")
    .eq("center_id", user.center_id)
    .order("sort_order", { ascending: true });
  const programs =
    programsRes.error || !programsRes.data
      ? []
      : (programsRes.data as Array<{
          id: string;
          label: string;
          sort_order: number;
        }>);

  const tabs = [
    {
      id: "center",
      label: t("navCenter"),
      icon: ImageIcon,
      content: (
        <section className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <SectionHeader
            icon={<ImageIcon className="text-primary size-5" />}
            title={t("logoSection")}
            description={t("logoSectionHelp")}
          />

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
              <p className="text-sm font-medium">{center?.name ?? "—"}</p>
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
      ),
    },
    {
      id: "programs",
      label: t("navPrograms"),
      icon: BookMarked,
      content: (
        <section className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <SectionHeader
            icon={<BookMarked className="text-primary size-5" />}
            title={t("programsSection")}
            description={t("programsSectionHelp")}
          />
          <ProgramsForm programs={programs} />
        </section>
      ),
    },
    {
      id: "report",
      label: t("navReport"),
      icon: FileText,
      content: (
        <section className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <SectionHeader
            icon={<FileText className="text-primary size-5" />}
            title={t("reportSection")}
            description={t("reportSectionHelp")}
          />
          <ReportSettingsForm
            defaults={{
              intro: center?.report_intro_text ?? null,
              footer: center?.report_footer_text ?? null,
              show_summary: center?.report_show_summary ?? true,
              show_signatures: center?.report_show_signatures ?? true,
              sig_left: center?.report_signature_label_left ?? null,
              sig_right: center?.report_signature_label_right ?? null,
            }}
          />
        </section>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <SettingsTabs tabs={tabs} />
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
