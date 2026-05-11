"use client";

import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { CheckCircle2, AlertCircle, Info, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import {
  importParentsCsv,
  importStudentsCsv,
  type ImportResult,
} from "@/app/admin/import/actions";

const initialState: { result?: ImportResult; error?: string } = {};

type Variant = "parents" | "students";

const ACTIONS = {
  parents: importParentsCsv,
  students: importStudentsCsv,
};

/**
 * CSV-import form, used as a collapsible section on both /admin/parents and
 * /admin/students. The server actions live under /admin/import for
 * historical reasons but can be imported from anywhere.
 */
export function CsvImportForm({ variant }: { variant: Variant }) {
  const t = useTranslations("import");
  const [state, action] = useFormState(ACTIONS[variant], initialState);

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
      <SubmitButton idleLabel={t("import")} pendingLabel={t("importing")} />

      {state.error ? (
        <div className="text-destructive flex items-start gap-2 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      ) : null}

      {state.result ? (
        <div className="space-y-2 rounded-md border p-4 text-sm">
          <div className="flex items-center gap-2 text-emerald-700">
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

          {state.result.generated && state.result.generated.length > 0 ? (
            <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
              <div className="text-amber-900 flex items-center gap-2 text-sm font-medium">
                <KeyRound className="size-4" />
                {t("generatedHeader", { n: state.result.generated.length })}
              </div>
              <p className="text-amber-800 text-xs">
                {t("generatedHelp")}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-amber-900">
                    <tr>
                      <th className="text-left py-1 pr-2">
                        {t("generatedColName")}
                      </th>
                      <th className="text-left py-1 pr-2">
                        {t("generatedColEmail")}
                      </th>
                      <th className="text-left py-1">
                        {t("generatedColPassword")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.result.generated.map((g, i) => (
                      <tr key={i} className="border-t border-amber-200">
                        <td className="py-1 pr-2">{g.full_name}</td>
                        <td className="py-1 pr-2 font-mono">{g.email}</td>
                        <td className="py-1 font-mono select-all">
                          {g.password}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
