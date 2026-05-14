"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, FileText, ImageIcon } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/confirm-submit";
import { deleteWorksheet } from "./actions";

type Worksheet = {
  id: string;
  name: string;
  file_type: string;
  size_bytes: number;
  public_url: string;
  created_at: string;
  uploader_name: string | null;
};

type Filter = "all" | "images" | "pdfs";

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function WorksheetsLibraryGrid({
  worksheets,
  dateLocale,
}: {
  worksheets: Worksheet[];
  dateLocale: string;
}) {
  const t = useTranslations("worksheets");
  const tc = useTranslations("common");
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    let images = 0;
    let pdfs = 0;
    for (const w of worksheets) {
      if (w.file_type.startsWith("image/")) images++;
      else pdfs++;
    }
    return { all: worksheets.length, images, pdfs };
  }, [worksheets]);

  const filtered = useMemo(() => {
    if (filter === "all") return worksheets;
    if (filter === "images")
      return worksheets.filter((w) => w.file_type.startsWith("image/"));
    return worksheets.filter((w) => !w.file_type.startsWith("image/"));
  }, [worksheets, filter]);

  const chips: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: t("filterAll"), count: counts.all },
    { value: "images", label: t("filterImages"), count: counts.images },
    { value: "pdfs", label: t("filterPdfs"), count: counts.pdfs },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((c) => {
          const active = filter === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => setFilter(c.value)}
              className={
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition " +
                (active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")
              }
            >
              {c.label}
              <span
                className={
                  "tabular-nums rounded-full px-1.5 text-[10px] " +
                  (active
                    ? "bg-primary-foreground/20"
                    : "bg-muted text-muted-foreground")
                }
              >
                {c.count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-muted/30 rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((w) => {
            const isImage = w.file_type.startsWith("image/");
            return (
              <div
                key={w.id}
                className="group bg-card flex flex-col overflow-hidden rounded-xl border shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <a
                  href={w.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-muted/40 relative block aspect-[4/3] overflow-hidden"
                >
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={w.public_url}
                      alt={w.name}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="from-rose-50 to-rose-100 text-rose-700 flex size-full items-center justify-center bg-gradient-to-br">
                      <FileText className="size-14 opacity-80" />
                    </div>
                  )}
                  <span className="bg-background/90 absolute right-2 top-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide shadow-sm">
                    {isImage ? (
                      <>
                        <ImageIcon className="size-3" />
                        {t("typeImage")}
                      </>
                    ) : (
                      <>
                        <FileText className="size-3" />
                        {t("typePdf")}
                      </>
                    )}
                  </span>
                </a>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <a
                    href={w.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary line-clamp-2 text-sm font-medium leading-snug"
                    title={w.name}
                  >
                    {w.name}
                  </a>
                  <div className="text-muted-foreground mt-auto flex items-center justify-between text-[11px]">
                    <span>
                      {new Date(w.created_at).toLocaleDateString(dateLocale, {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                    <span>{formatBytes(w.size_bytes)}</span>
                  </div>
                  {w.uploader_name ? (
                    <p className="text-muted-foreground truncate text-[11px]">
                      {w.uploader_name}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <a
                      href={w.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs"
                    >
                      <ExternalLink className="size-3" />
                      {t("openInNewTab")}
                    </a>
                    <form action={deleteWorksheet}>
                      <input type="hidden" name="id" value={w.id} />
                      <ConfirmSubmitButton
                        confirmMessage={t("deleteConfirm", { name: w.name })}
                      >
                        {tc("delete")}
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
