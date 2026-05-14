"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { MessageSquareText } from "lucide-react";

type Thread = {
  studentId: string;
  studentName: string;
  className: string | null;
  teacherName: string | null;
  lastBody: string;
  lastAtIso: string;
  lastWhen: string;
  unread: number;
  total: number;
  ownLast: boolean;
};

type Filter = "all" | "unread";

// Deterministic initial-circle color picked from a small palette by
// hashing the student id, so the same student always gets the same
// colour but the inbox isn't a wall of one tone.
const AVATAR_TONES = [
  "bg-sky-100 text-sky-700 ring-sky-200",
  "bg-violet-100 text-violet-700 ring-violet-200",
  "bg-emerald-100 text-emerald-700 ring-emerald-200",
  "bg-amber-100 text-amber-700 ring-amber-200",
  "bg-rose-100 text-rose-700 ring-rose-200",
  "bg-indigo-100 text-indigo-700 ring-indigo-200",
];

function pickTone(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length];
}

function initial(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] ?? "";
  return last.charAt(0).toUpperCase() || "?";
}

export function InboxList({
  threads,
  totalUnread,
  youPrefix,
  emptyLabel,
  filterAllLabel,
  filterUnreadLabel,
  filterEmptyLabel,
}: {
  threads: Thread[];
  totalUnread: number;
  youPrefix: string;
  emptyLabel: string;
  filterAllLabel: string;
  filterUnreadLabel: string;
  filterEmptyLabel: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = useMemo(
    () => (filter === "unread" ? threads.filter((t) => t.unread > 0) : threads),
    [threads, filter],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { value: "all" as const, label: filterAllLabel, count: threads.length },
            {
              value: "unread" as const,
              label: filterUnreadLabel,
              count: totalUnread,
            },
          ]
        ).map((c) => {
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
                    : c.value === "unread" && c.count > 0
                      ? "bg-rose-500 text-white"
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
        <div className="bg-muted/30 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <div className="bg-background flex size-12 items-center justify-center rounded-full border">
            <MessageSquareText className="text-muted-foreground size-5" />
          </div>
          <p className="text-muted-foreground text-sm">
            {filter === "unread" ? filterEmptyLabel : emptyLabel}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((thread) => {
            const tone = pickTone(thread.studentId);
            return (
              <li key={thread.studentId}>
                <Link
                  href={`/admin/messages/${thread.studentId}`}
                  className={
                    "bg-card flex items-start gap-3 rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md " +
                    (thread.unread > 0 ? "border-rose-200" : "")
                  }
                >
                  <div
                    className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1 ${tone}`}
                  >
                    {initial(thread.studentName)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{thread.studentName}</p>
                      {thread.unread > 0 ? (
                        <span className="bg-rose-500 text-white inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                          {thread.unread}
                        </span>
                      ) : null}
                      {thread.className ? (
                        <span className="text-muted-foreground text-xs">
                          {thread.className}
                          {thread.teacherName ? ` · ${thread.teacherName}` : ""}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground truncate text-sm">
                      {thread.ownLast ? `${youPrefix} ` : ""}
                      {thread.lastBody}
                    </p>
                  </div>
                  <span className="text-muted-foreground whitespace-nowrap text-xs">
                    {thread.lastWhen}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
