import { Upload } from "lucide-react";
import type { ReactNode } from "react";
import { CsvImportForm } from "@/components/csv-import-form";

/**
 * Collapsible section that wraps the CSV-import form and a small example
 * pre-block, so admins importing parents or students see the option in
 * context (instead of a separate /admin/import page).
 *
 * Implemented with a native <details> so we don't need client-side state
 * for a simple expand/collapse.
 */
export function InlineImportSection({
  variant,
  toggleLabel,
  helpText,
  exampleCsv,
  noteText,
}: {
  variant: "parents" | "students";
  toggleLabel: string;
  helpText: string;
  exampleCsv: string;
  noteText?: string;
}) {
  return (
    <details className="bg-muted/20 rounded-lg border">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium hover:bg-muted/40">
        <span className="inline-flex items-center gap-2">
          <Upload className="text-muted-foreground size-4" />
          {toggleLabel}
        </span>
      </summary>
      <div className="space-y-4 border-t px-4 py-4">
        <p className="text-muted-foreground text-sm">{helpText}</p>
        <pre className="bg-background text-muted-foreground overflow-x-auto rounded-md border p-3 text-xs">
          {exampleCsv}
        </pre>
        {noteText ? (
          <p className="text-muted-foreground text-xs">{noteText}</p>
        ) : null}
        <CsvImportForm variant={variant} />
      </div>
    </details>
  );
}

// Re-export for any caller that wants to render its own children layout.
export type InlineImportSectionProps = Parameters<typeof InlineImportSection>[0];
export { CsvImportForm };
export type { ReactNode };
