import { getLocale, getTranslations } from "next-intl/server";
import { FileText, ImageIcon, Upload } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WorksheetUploadForm } from "./worksheet-upload-form";
import { deleteWorksheet } from "./actions";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default async function WorksheetsPage() {
  await requireRole("admin");
  const t = await getTranslations("worksheets");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  const supabase = createClient();
  const { data: worksheets } = await supabase
    .from("worksheets")
    .select(
      "id, name, file_type, size_bytes, public_url, created_at, uploader:users!worksheets_uploaded_by_fkey(full_name)",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Upload className="text-primary size-5" />
          <h2 className="text-lg font-semibold">{t("uploadHeader")}</h2>
        </div>
        <WorksheetUploadForm />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="text-primary size-5" />
          <h2 className="text-lg font-semibold">
            {t("libraryHeader", { count: worksheets?.length ?? 0 })}
          </h2>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead className="w-24">{t("type")}</TableHead>
                <TableHead className="w-24">{t("size")}</TableHead>
                <TableHead className="w-40">{t("uploadedBy")}</TableHead>
                <TableHead className="w-32">{t("uploadedAt")}</TableHead>
                <TableHead className="w-24 text-right">
                  {tc("actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {worksheets && worksheets.length > 0 ? (
                worksheets.map((w) => {
                  const isImage = w.file_type.startsWith("image/");
                  const Icon = isImage ? ImageIcon : FileText;
                  const uploader = Array.isArray(w.uploader)
                    ? w.uploader[0]
                    : w.uploader;
                  return (
                    <TableRow key={w.id}>
                      <TableCell>
                        <a
                          href={w.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary inline-flex items-center gap-2 font-medium hover:underline"
                        >
                          <Icon className="size-4" />
                          {w.name}
                        </a>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs uppercase">
                        {isImage ? "image" : "pdf"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatBytes(w.size_bytes)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {uploader?.full_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(w.created_at).toLocaleDateString(dateLocale, {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <form action={deleteWorksheet}>
                          <input type="hidden" name="id" value={w.id} />
                          <button
                            type="submit"
                            className={buttonVariants({
                              variant: "destructive",
                              size: "sm",
                            })}
                          >
                            {tc("delete")}
                          </button>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-8 text-center text-sm"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
