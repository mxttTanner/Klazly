"use client";

import { useState } from "react";
import { useActionState } from "react";
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
  brand_color: string | null;
  show_pdf_credit: boolean;
};

// Vietnamese-friendly swatches — clean, education-coded, no neons.
// First entry doubles as the platform default.
const BRAND_SWATCHES = [
  "#2563EB", // brand blue (default)
  "#0EA5E9", // sky
  "#059669", // emerald
  "#16A34A", // green
  "#DC2626", // warm red
  "#EA580C", // orange
  "#7C3AED", // violet
  "#0F172A", // ink
] as const;

export function ReportSettingsForm({
  defaults,
}: {
  defaults: ReportSettingsValues;
}) {
  const t = useTranslations("settings");
  const [state, action] = useActionState(updateReportSettings, initialState);
  const [color, setColor] = useState<string>(
    (defaults.brand_color ?? "").match(/^#[0-9A-Fa-f]{6}$/)
      ? defaults.brand_color!
      : "",
  );

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

      {/* Branding — brand colour + Cổng Phụ Huynh credit toggle.
          Lives inside the report settings form so a center configures
          everything that affects their PDF in one place. */}
      <div className="space-y-3 rounded-md border bg-muted/30 p-3">
        <p className="text-sm font-medium">{t("brandingLabel")}</p>

        <div className="space-y-2">
          <Label htmlFor="brand_color">{t("brandColorLabel")}</Label>
          <div className="flex flex-wrap items-center gap-2">
            {BRAND_SWATCHES.map((hex) => {
              const active = color.toUpperCase() === hex.toUpperCase();
              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  aria-label={hex}
                  aria-pressed={active}
                  className={
                    "size-7 rounded-md ring-2 ring-offset-2 ring-offset-background transition " +
                    (active ? "ring-foreground" : "ring-transparent hover:ring-border")
                  }
                  style={{ backgroundColor: hex }}
                />
              );
            })}
            <Input
              id="brand_color"
              name="brand_color"
              value={color}
              onChange={(e) => setColor(e.target.value.trim())}
              placeholder="#2563EB"
              pattern="^#[0-9A-Fa-f]{6}$"
              maxLength={7}
              className="h-8 w-28 font-mono uppercase"
              inputMode="text"
            />
            {color ? (
              <button
                type="button"
                onClick={() => setColor("")}
                className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
              >
                {t("brandColorReset")}
              </button>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("brandColorHelp")}
          </p>
        </div>

        <div className="flex items-start gap-2 pt-1">
          <Checkbox
            id="show_pdf_credit"
            name="show_pdf_credit"
            defaultChecked={defaults.show_pdf_credit}
          />
          <Label htmlFor="show_pdf_credit" className="font-normal leading-snug">
            {t("brandCreditLabel")}
            <span className="text-muted-foreground mt-0.5 block text-xs">
              {t("brandCreditHelp")}
            </span>
          </Label>
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
        <p className="text-sm text-success">{state.success}</p>
      ) : null}
    </form>
  );
}
