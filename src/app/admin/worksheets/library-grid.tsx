"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ExternalLink,
  FileText,
  ImageIcon,
  Link2,
  Search,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ConfirmSubmitButton } from "@/components/confirm-submit";
import { deleteWorksheet } from "./actions";

type Worksheet = {
  id: string;
  name: string;
  file_type: string;
  size_bytes: number;
  public_url: string;
  created_at: string;
  category: string | null;
  uploader_name: string | null;
  usage_count: number;
};

type Filter = "all" | "images" | "pdfs";

/** Legacy rows have category NULL — bucket them under "other". */
const catKey = (w: Worksheet): string => w.category ?? "other";

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
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    let images = 0;
    let pdfs = 0;
    for (const w of worksheets) {
      if (w.file_type.startsWith("image/")) images++;
      else pdfs++;
    }
    return { all: worksheets.length, images, pdfs };
  }, [worksheets]);

  // Only offer category chips for categories that actually have worksheets,
  // in library order (most-used first) so the row stays short.
  const categoryChips = useMemo(() => {
    const byCat = new Map<string, number>();
    for (const w of worksheets) {
      byCat.set(catKey(w), (byCat.get(catKey(w)) ?? 0) + 1);
    }
    return Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]);
  }, [worksheets]);

  const filtered = useMemo(() => {
    const typeFiltered =
      filter === "all"
        ? worksheets
        : filter === "images"
          ? worksheets.filter((w) => w.file_type.startsWith("image/"))
          : worksheets.filter((w) => !w.file_type.startsWith("image/"));
    const catFiltered =
      category === "all"
        ? typeFiltered
        : typeFiltered.filter((w) => catKey(w) === category);
    const q = query.trim().toLowerCase();
    if (!q) return catFiltered;
    return catFiltered.filter((w) => w.name.toLowerCase().includes(q));
  }, [worksheets, filter, category, query]);

  const chips: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: t("filterAll"), count: counts.all },
    { value: "images", label: t("filterImages"), count: counts.images },
    { value: "pdfs", label: t("filterPdfs"), count: counts.pdfs },
  ];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-9 pr-9"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={t("clearSearch")}
            className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md hover:bg-muted"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

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

      {/* Category chips — shown only once there's more than one category
          in the library, so a fresh center isn't greeted by chip noise. */}
      {categoryChips.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium">
            {t("category")}:
          </span>
          {[["all", counts.all] as [string, number], ...categoryChips].map(
            ([key, count]) => {
              const active = category === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition " +
                    (active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")
                  }
                >
                  {key === "all"
                    ? t("filterAll")
                    : t(`categories.${key}` as "categories.other")}
                  <span
                    className={
                      "tabular-nums rounded-full px-1.5 text-[10px] " +
                      (active
                        ? "bg-primary-foreground/20"
                        : "bg-muted text-muted-foreground")
                    }
                  >
                    {count}
                  </span>
                </button>
              );
            },
          )}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="bg-muted/30 rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground text-sm">
            {query ? t("searchEmpty", { q: query }) : t("empty")}
          </p>
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
                    <div className="bg-muted text-muted-foreground flex size-full items-center justify-center">
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
                  {/* Usage chip — the admin's signal for "is this worksheet
                      pulling weight?". Success token if attached, muted if
                      not. */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium " +
                        (w.usage_count > 0
                          ? "bg-success/10 text-success ring-1 ring-success/20"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      <Link2 className="size-2.5" />
                      {w.usage_count === 0
                        ? t("usageUnused")
                        : t("usageInLessons", { n: w.usage_count })}
                    </span>
                    <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium">
                      {t(`categories.${catKey(w)}` as "categories.other")}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-auto flex items-center justify-between text-[11px]">
                    <span>
                      {new Date(w.created_at).toLocaleDateString(dateLocale, {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        // Pin to VN time: this is a client component that
                        // hydrates, so an unpinned date can differ between the
                        // server (TZ=Asia/Ho_Chi_Minh) and a viewer in another
                        // zone → React 19 hydration error (#418).
                        timeZone: "Asia/Ho_Chi_Minh",
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
