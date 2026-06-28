"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

/**
 * Primary "download the monthly PDF" action on the parent report.
 * The PDF is produced by the browser's print pipeline (Save as PDF).
 * window.print() blocks the main thread, so we flip to a
 * "Đang tạo báo cáo…" state and defer the call one tick — the busy
 * state paints first instead of the page appearing frozen.
 */
export function PrintButton({
  label,
  generatingLabel,
}: {
  label: string;
  generatingLabel: string;
}) {
  const [busy, setBusy] = useState(false);

  function onClick() {
    setBusy(true);
    // Let the busy label paint before the blocking print dialog opens.
    setTimeout(() => {
      try {
        window.print();
      } finally {
        setBusy(false);
      }
    }, 60);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      className="inline-flex items-center gap-2 rounded-lg bg-emerald px-4 py-2.5 text-sm font-bold text-[#06281f] shadow-sm transition hover:bg-emerald-light disabled:opacity-70"
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      {busy ? generatingLabel : label}
    </button>
  );
}
