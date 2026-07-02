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
  const supabase = await createClient();

  type CenterRow = {
    name: string | null;
    logo_url: string | null;
    report_intro_text: string | null;
    report_footer_text: string | null;
    report_show_summary: boolean | null;
    report_show_signatures: boolean | null;
    report_signature_label_left: string | null;
    report_signature_label_right: string | null;
    brand_color: string | null;
    show_pdf_credit: boolean | null;
  };
  // Center row fetch — wrapped in an IIFE so its (conditional) fallback
  // chain can run in parallel with the programs catalog fetch.
  const centerPromise: Promise<CenterRow | null> = (async () => {
    const full = await supabase
      .from("centers")
      .select(
        "name, logo_url, report_intro_text, report_footer_text, report_show_summary, report_show_signatures, report_signature_label_left, report_signature_label_right, brand_color, show_pdf_credit",
      )
      .eq("id", user.center_id)
      .single();
    if (!full.error) return full.data as CenterRow;
    if (!/brand_color|show_pdf_credit/i.test(full.error.message)) return null;
    const fb = await supabase
      .from("centers")
      .select(
        "name, logo_url, report_intro_text, report_footer_text, report_show_summary, report_show_signatures, report_signature_label_left, report_signature_label_right",
      )
      .eq("id", user.center_id)
      .single();
    if (fb.error || !fb.data) return null;
    return {
      ...(fb.data as Omit<CenterRow, "brand_color" | "show_pdf_credit">),
      brand_color: null,
      show_pdf_credit: true,
    };
  })();

  const [center, programsRes] = await Promise.all([
    centerPromise,
    supabase
      .from("center_programs")
      .select("id, label, sort_order")
      .eq("center_id", user.center_id)
      .order("sort_order", { ascending: true }),
  ]);

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
      iconKey: "center" as const,
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
      iconKey: "programs" as const,
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
      iconKey: "report" as const,
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
              show_signatures: center?.report_show_signatures ?? false,
              sig_left: center?.report_signature_label_left ?? null,
              sig_right: center?.report_signature_label_right ?? null,
              brand_color: center?.brand_color ?? null,
              show_pdf_credit: center?.show_pdf_credit ?? true,
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
