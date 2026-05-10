"use client";

import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/submit-button";
import { updateReportSettings } from "./actions";

const initialState: { error?: string; success?: string } = {};

export type ReportSettingsValues = {
  intro: string | null;
  footer: string | null;
  show_summary: boolean;
  show_signatures: boolean;
  sig_left: string | null;
  sig_right: string | null;
};

export function ReportSettingsForm({
  defaults,
}: {
  defaults: ReportSettingsValues;
}) {
  const t = useTranslations("settings");
  const [state, action] = useFormState(updateReportSettings, initialState);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="intro">{t("reportIntroLabel")}</Label>
        <Textarea
          id="intro"
          name="intro"
          rows={3}
          defaultValue={defaults.intro ?? ""}
          placeholder={t("reportIntroPlaceholder")}
          maxLength={800}
        />
        <p className="text-muted-foreground text-xs">{t("reportIntroHelp")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="footer">{t("reportFooterLabel")}</Label>
        <Textarea
          id="footer"
          name="footer"
          rows={2}
          defaultValue={defaults.footer ?? ""}
          placeholder={t("reportFooterPlaceholder")}
          maxLength={400}
        />
        <p className="text-muted-foreground text-xs">{t("reportFooterHelp")}</p>
      </div>

      <div className="space-y-3 rounded-md border bg-muted/30 p-3">
        <p className="text-sm font-medium">{t("reportSectionsLabel")}</p>
        <div className="flex items-center gap-2">
          <Checkbox
            id="show_summary"
            name="show_summary"
            defaultChecked={defaults.show_summary}
          />
          <Label htmlFor="show_summary" className="font-normal">
            {t("reportShowSummary")}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="show_signatures"
            name="show_signatures"
            defaultChecked={defaults.show_signatures}
          />
          <Label htmlFor="show_signatures" className="font-normal">
            {t("reportShowSignatures")}
          </Label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sig_left">{t("reportSigLeftLabel")}</Label>
          <Input
            id="sig_left"
            name="sig_left"
            defaultValue={defaults.sig_left ?? ""}
            placeholder={t("reportSigLeftPlaceholder")}
            maxLength={60}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sig_right">{t("reportSigRightLabel")}</Label>
          <Input
            id="sig_right"
            name="sig_right"
            defaultValue={defaults.sig_right ?? ""}
            placeholder={t("reportSigRightPlaceholder")}
            maxLength={60}
          />
        </div>
      </div>

      <SubmitButton
        idleLabel={t("reportSaveSubmit")}
        pendingLabel={t("reportSaveSubmitting")}
      />
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-600">{state.success}</p>
      ) : null}
    </form>
  );
}
