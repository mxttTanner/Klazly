import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReportSettingsForm } from "@/app/admin/settings/report-settings-form";

export const dynamic = "force-dynamic";

export default async function TeacherReportSettingsPage() {
  const user = await requireRole(["teacher", "admin"]);
  const supabase = createClient();
  const t = await getTranslations("settings");
  const tHome = await getTranslations("teacher.home");

  const { data: center } = await supabase
    .from("centers")
    .select(
      "report_intro_text, report_footer_text, report_show_summary, report_show_signatures, report_signature_label_left, report_signature_label_right",
    )
    .eq("id", user.center_id)
    .single();

  return (
    <div className="space-y-6">
      <Link
        href="/teacher"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-3.5" />
        {tHome("title")}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("reportSection")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("reportSectionHelp")}
        </p>
      </div>

      <section className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="text-primary size-5" />
          <h2 className="text-lg font-semibold">{t("reportSection")}</h2>
        </div>
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
    </div>
  );
}
