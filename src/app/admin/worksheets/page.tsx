import { getLocale, getTranslations } from "next-intl/server";
import { FolderOpen, Upload } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signWorksheetUrls } from "@/lib/worksheets";
import { WorksheetUploadForm } from "./worksheet-upload-form";
import { WorksheetsLibraryGrid } from "./library-grid";

export const dynamic = "force-dynamic";

export default async function WorksheetsPage() {
  await requireRole("admin");
  const t = await getTranslations("worksheets");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  const supabase = await createClient();

  // Pull the library + every lesson's worksheet_id in parallel. Counting
  // attachments client-side beats two roundtrips per row.
  const [worksheetsResFirst, lessonsRes] = await Promise.all([
    supabase
      .from("worksheets")
      .select(
        "id, name, file_type, size_bytes, storage_path, created_at, category, uploader:users!worksheets_uploaded_by_fkey(full_name)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("lessons")
      .select("worksheet_id")
      .not("worksheet_id", "is", null),
  ]);
  // Retry without `category` ONLY when the error is about that column
  // (db/worksheet-categories.sql not applied) — a transient failure must
  // not silently render the whole library as uncategorized.
  type WsRow = {
    id: string;
    name: string;
    file_type: string;
    size_bytes: number;
    storage_path: string | null;
    created_at: string;
    category: string | null;
    uploader: { full_name: string } | { full_name: string }[] | null;
  };
  let worksheetRows: WsRow[];
  if (worksheetsResFirst.error && /category/i.test(worksheetsResFirst.error.message)) {
    console.warn(
      "[admin/worksheets] category column missing (migration not run?), falling back:",
      worksheetsResFirst.error.message,
    );
    const fb = await supabase
      .from("worksheets")
      .select(
        "id, name, file_type, size_bytes, storage_path, created_at, uploader:users!worksheets_uploaded_by_fkey(full_name)",
      )
      .order("created_at", { ascending: false });
    worksheetRows = ((fb.data ?? []) as Omit<WsRow, "category">[]).map((w) => ({
      ...w,
      category: null,
    }));
  } else {
    if (worksheetsResFirst.error) {
      console.warn(
        "[admin/worksheets] worksheets select failed:",
        worksheetsResFirst.error.message,
      );
    }
    worksheetRows = (worksheetsResFirst.data ?? []) as WsRow[];
  }

  // Build a usage map: worksheet_id → number of lessons that reference it.
  const usageByWorksheet = new Map<string, number>();
  for (const l of (lessonsRes.data ?? []) as { worksheet_id: string | null }[]) {
    if (!l.worksheet_id) continue;
    usageByWorksheet.set(
      l.worksheet_id,
      (usageByWorksheet.get(l.worksheet_id) ?? 0) + 1,
    );
  }

  // The bucket is private — mint a short-lived signed URL per file for this
  // render instead of relying on a world-readable public URL.
  const signedUrls = await signWorksheetUrls(
    worksheetRows.map((w) => w.storage_path),
  );

  const worksheets = worksheetRows.map((w) => {
    const uploader = Array.isArray(w.uploader) ? w.uploader[0] : w.uploader;
    return {
      id: w.id,
      name: w.name,
      file_type: w.file_type,
      size_bytes: w.size_bytes,
      file_url: w.storage_path ? signedUrls.get(w.storage_path) ?? null : null,
      created_at: w.created_at,
      category: w.category,
      uploader_name: uploader?.full_name ?? null,
      usage_count: usageByWorksheet.get(w.id) ?? 0,
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
