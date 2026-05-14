"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

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
            return (
              <li key={thread.studentId}>
                <Link
                  href={`/admin/messages/${thread.studentId}`}
                  className={
                    "bg-card flex items-start gap-3 rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md " +
                    (thread.unread > 0 ? "border-rose-200" : "")
                  }
                >
                  <Avatar
                    name={thread.studentName}
                    seed={thread.studentId}
                    size="md"
                    className="mt-0.5"
                  />
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
