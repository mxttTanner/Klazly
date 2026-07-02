"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { uploadWorksheet } from "./actions";

const initialState: { error?: string; success?: string } = {};

export function WorksheetUploadForm() {
  const t = useTranslations("worksheets");
  const [state, action] = useActionState(uploadWorksheet, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4 rounded-lg border bg-card p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" name="name" placeholder={t("namePlaceholder")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="file">{t("file")}</Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            required
          />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">{t("uploadHelp")}</p>
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
