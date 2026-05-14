import { getLocale, getTranslations } from "next-intl/server";
import { FolderOpen, Upload } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WorksheetUploadForm } from "./worksheet-upload-form";
import { WorksheetsLibraryGrid } from "./library-grid";

export const dynamic = "force-dynamic";

export default async function WorksheetsPage() {
  await requireRole("admin");
  const t = await getTranslations("worksheets");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  const supabase = createClient();
  const { data: rows } = await supabase
    .from("worksheets")
    .select(
      "id, name, file_type, size_bytes, public_url, created_at, uploader:users!worksheets_uploaded_by_fkey(full_name)",
    )
    .order("created_at", { ascending: false });

  const worksheets = (rows ?? []).map((w) => {
    const uploader = Array.isArray(w.uploader) ? w.uploader[0] : w.uploader;
    return {
      id: w.id,
      name: w.name,
      file_type: w.file_type,
      size_bytes: w.size_bytes,
      public_url: w.public_url,
      created_at: w.created_at,
      uploader_name: uploader?.full_name ?? null,
    };
  });

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

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="text-primary size-5" />
          <h2 className="text-lg font-semibold">
            {t("libraryHeader", { count: worksheets.length })}
          </h2>
        </div>
        <WorksheetsLibraryGrid
          worksheets={worksheets}
          dateLocale={dateLocale}
        />
      </section>
    </div>
  );
}
