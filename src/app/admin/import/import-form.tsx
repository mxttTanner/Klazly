"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { CheckCircle2, AlertCircle, Info, KeyRound, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { importParentsCsv, importStudentsCsv, type ImportResult } from "./actions";

const initialState: { result?: ImportResult; error?: string } = {};

type Variant = "parents" | "students";

const ACTIONS = {
  parents: importParentsCsv,
  students: importStudentsCsv,
};

export function ImportForm({ variant }: { variant: Variant }) {
  const t = useTranslations("import");
  const tc = useTranslations("common");
  const [state, action] = useFormState(ACTIONS[variant], initialState);
  const [copied, setCopied] = useState(false);

  async function copyGenerated() {
    if (!state.result?.generated) return;
    const tsv = [
      [t("generatedColName"), t("generatedColEmail"), t("generatedColPassword")].join("\t"),
      ...state.result.generated.map((g) =>
        [g.full_name, g.email, g.password].join("\t"),
      ),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API blocked (insecure context, permissions) — the user
      // can still select the table manually.
    }
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${variant}-file`}>{t("uploadCsv")}</Label>
        <Input
          id={`${variant}-file`}
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
        />
      </div>
      <SubmitButton
        idleLabel={t("import")}
        pendingLabel={t("importing")}
      />

      {state.error ? (
        <div className="text-destructive flex items-start gap-2 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      ) : null}

      {state.result ? (
        <div className="space-y-2 rounded-md border p-4 text-sm">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-4" />
            <p>{t("imported", { n: state.result.imported })}</p>
          </div>
          {state.result.skipped > 0 ? (
            <div className="text-muted-foreground flex items-center gap-2">
              <Info className="size-4" />
              <p>{t("skipped", { n: state.result.skipped })}</p>
            </div>
          ) : null}
          {state.result.errors.length > 0 ? (
            <div className="space-y-1 pt-2">
              <p className="text-destructive font-medium">
                {t("errorsHeader", { n: state.result.errors.length })}
              </p>
              <ul className="text-muted-foreground space-y-1 text-xs">
                {state.result.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>
                    {t("row", { n: e.row })}: {e.message}
                  </li>
                ))}
                {state.result.errors.length > 10 ? (
                  <li>
                    {t("moreErrors", {
                      n: state.result.errors.length - 10,
                    })}
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {state.result?.generated && state.result.generated.length > 0 ? (
        <div className="border-warning/40 bg-warning/10 space-y-3 rounded-md border p-4 text-sm">
          <div className="text-foreground flex items-start gap-2">
            <KeyRound className="text-warning mt-0.5 size-4 shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold">
                {t("generatedHeader", { n: state.result.generated.length })}
              </p>
              <p className="text-muted-foreground">{t("generatedHelp")}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyGenerated}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="size-3.5" />
                  {tc("copied")}
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  {tc("copy")}
                </>
              )}
            </Button>
          </div>
          <div className="bg-card overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted text-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("generatedColName")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("generatedColEmail")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("generatedColPassword")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.result.generated.map((g, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5">{g.full_name}</td>
                    <td className="px-3 py-1.5 font-mono">{g.email}</td>
                    <td className="px-3 py-1.5 font-mono">{g.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </form>
  );
}
