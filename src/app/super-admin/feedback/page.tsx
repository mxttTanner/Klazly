import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, MessageSquareHeart } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/super-admin";

export const dynamic = "force-dynamic";

type FeedbackRow = {
  id: string;
  center_id: string | null;
  user_id: string | null;
  role: string | null;
  rating: "sad" | "meh" | "happy";
  comment: string | null;
  page: string | null;
  user_agent: string | null;
  created_at: string;
};

const RATING_TONES: Record<FeedbackRow["rating"], string> = {
  sad: "bg-rose-50 text-rose-700 ring-rose-200",
  meh: "bg-amber-50 text-amber-800 ring-amber-200",
  happy: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};
const RATING_EMOJI: Record<FeedbackRow["rating"], string> = {
  sad: "😞",
  meh: "😐",
  happy: "😊",
};

/**
 * Super-admin feedback inbox. Reads everything users submitted via
 * the floating widget. Service-role read; no RLS exposure to the
 * regular admin tenancy. Joins center name client-side so a missing
 * center (deleted) still renders the row.
 */
export default async function FeedbackInboxPage() {
  await requireSuperAdmin();
  const t = await getTranslations("superAdmin");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("feedback")
    .select(
      "id, center_id, user_id, role, rating, comment, page, user_agent, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  // Fall back gracefully if the migration hasn't been run yet.
  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href="/super-admin"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" />
          {t("backToCenters")}
        </Link>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 text-sm">
          Feedback table not migrated. Run <code>db/feedback.sql</code> in
          Supabase Studio.
        </div>
      </div>
    );
  }

  const feedback = (rows ?? []) as FeedbackRow[];

  // Fetch center names in one batch — display them next to each row.
  const centerIds = Array.from(
    new Set(
      feedback.map((r) => r.center_id).filter((x): x is string => Boolean(x)),
    ),
  );
  const centerNameById = new Map<string, string>();
  if (centerIds.length > 0) {
    const { data: centers } = await supabase
      .from("centers")
      .select("id, name")
      .in("id", centerIds);
    for (const c of (centers ?? []) as { id: string; name: string }[]) {
      centerNameById.set(c.id, c.name);
    }
  }

  const counts = {
    sad: feedback.filter((r) => r.rating === "sad").length,
    meh: feedback.filter((r) => r.rating === "meh").length,
    happy: feedback.filter((r) => r.rating === "happy").length,
  };

  const formatWhen = (iso: string) =>
    new Date(iso).toLocaleString(dateLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh",
    });

  return (
    <div className="space-y-6">
      <Link
        href="/super-admin"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        {t("backToCenters")}
      </Link>

      <div className="flex items-center gap-3">
        <span className="bg-primary/10 text-primary inline-flex size-11 items-center justify-center rounded-xl">
          <MessageSquareHeart className="size-5" />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Feedback</h1>
          <p className="text-muted-foreground text-sm">
            Recent submissions from the in-app feedback widget. Service-role
            only — never exposed to tenant users.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          tone="rose"
          emoji="😞"
          label="Frustrating"
          value={counts.sad}
        />
        <SummaryCard tone="amber" emoji="😐" label="OK" value={counts.meh} />
        <SummaryCard
          tone="emerald"
          emoji="😊"
          label="Great"
          value={counts.happy}
        />
      </div>

      {feedback.length === 0 ? (
        <div className="text-muted-foreground rounded-2xl border border-dashed bg-muted/30 p-12 text-center text-sm">
          No feedback yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {feedback.map((row) => (
            <li
              key={row.id}
              className="bg-card flex flex-col gap-2 rounded-2xl border p-4 shadow-sm sm:flex-row sm:gap-4"
            >
              <span
                className={
                  "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-lg ring-1 " +
                  RATING_TONES[row.rating]
                }
                aria-label={row.rating}
              >
                {RATING_EMOJI[row.rating]}
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                  <span className="text-foreground font-medium">
                    {row.center_id
                      ? (centerNameById.get(row.center_id) ?? "—")
                      : row.role === "super_admin"
                        ? "(super-admin)"
                        : "(no center)"}
                  </span>
                  {row.role ? <span>· {row.role}</span> : null}
                  {row.page ? (
                    <span className="font-mono">· {row.page}</span>
                  ) : null}
                  <span>· {formatWhen(row.created_at)}</span>
                </div>
                {row.comment ? (
                  <p className="text-sm leading-relaxed">{row.comment}</p>
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    (no comment)
                  </p>
                )}
                {row.user_agent ? (
                  <p className="text-muted-foreground truncate text-[10px]">
                    {row.user_agent}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SummaryCard({
  tone,
  emoji,
  label,
  value,
}: {
  tone: "rose" | "amber" | "emerald";
  emoji: string;
  label: string;
  value: number;
}) {
  const toneClass =
    tone === "rose"
      ? "border-rose-200 bg-rose-50/40"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50/40"
        : "border-emerald-200 bg-emerald-50/40";
  return (
    <div
      className={
        "flex items-center justify-between gap-3 rounded-2xl border p-4 " +
        toneClass
      }
    >
      <div>
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </div>
      <span className="text-2xl">{emoji}</span>
    </div>
  );
}
