"use client";

import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { uploadCenterLogo } from "./actions";

const initialState: { error?: string; success?: string } = {};

export function LogoUploadForm() {
  const t = useTranslations("settings");
  const [state, action] = useFormState(uploadCenterLogo, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file">{t("logoUpload")}</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          required
        />
        <p className="text-muted-foreground text-xs">{t("logoUploadHelp")}</p>
      </div>
      <SubmitButton
        idleLabel={t("uploadSubmit")}
        pendingLabel={t("uploadSubmitting")}
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
