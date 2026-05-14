import Link from "next/link";
import { ArrowLeft, FileText, Info } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeacherReportSettingsPage() {
  // Teachers reach this page to preview what the printed parent report
  // looks like, but the actual edit lives in /admin/settings. The page
  // shows the current center-wide settings read-only so teachers can
  // see what parents will print without being able to change them.
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

  const intro = center?.report_intro_text ?? null;
  const footer = center?.report_footer_text ?? null;
  const showSummary = center?.report_show_summary ?? true;
  const showSignatures = center?.report_show_signatures ?? true;
  const sigLeft = center?.report_signature_label_left ?? null;
  const sigRight = center?.report_signature_label_right ?? null;

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

      {/* Read-only note: teachers see the current settings but only the
          center admin can change them. */}
      <div className="bg-sky-50 text-sky-900 flex items-start gap-2 rounded-lg border border-sky-200 p-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>{t("teacherReadOnlyNote")}</p>
      </div>

      <section className="space-y-5 rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="text-primary size-5" />
          <h2 className="text-lg font-semibold">{t("reportSection")}</h2>
        </div>

        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {t("reportIntroLabel")}
            </dt>
            <dd className="text-foreground mt-1 whitespace-pre-wrap leading-relaxed">
              {intro?.trim() ? intro : <span className="text-muted-foreground italic">{t("reportNotSet")}</span>}
            </dd>
          </div>

          <div>
            <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {t("reportFooterLabel")}
            </dt>
            <dd className="text-foreground mt-1 whitespace-pre-wrap leading-relaxed">
              {footer?.trim() ? footer : <span className="text-muted-foreground italic">{t("reportNotSet")}</span>}
            </dd>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {t("reportShowSummaryLabel")}
              </dt>
              <dd className="text-foreground mt-1">
                {showSummary ? t("reportToggleOn") : t("reportToggleOff")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {t("reportShowSignaturesLabel")}
              </dt>
              <dd className="text-foreground mt-1">
                {showSignatures ? t("reportToggleOn") : t("reportToggleOff")}
              </dd>
            </div>
          </div>

          {showSignatures ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  {t("reportSigLeftLabel")}
                </dt>
                <dd className="text-foreground mt-1">
                  {sigLeft?.trim() ? sigLeft : <span className="text-muted-foreground italic">{t("reportNotSet")}</span>}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  {t("reportSigRightLabel")}
                </dt>
                <dd className="text-foreground mt-1">
                  {sigRight?.trim() ? sigRight : <span className="text-muted-foreground italic">{t("reportNotSet")}</span>}
                </dd>
              </div>
            </div>
          ) : null}
        </dl>
      </section>
    </div>
  );
}
