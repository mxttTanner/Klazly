"use client";

import { useTranslations } from "next-intl";
import { Building2, Calendar, Mail, Phone, Trash2 } from "lucide-react";
import { StatusSelect } from "./status-select";
import { PlanSelect } from "./plan-select";
import { NotesCell } from "./notes-cell";
import { ConfirmSubmitButton } from "@/components/confirm-submit";
import { deleteCenterCascade } from "./actions";

export type CenterCardData = {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  subscription_status: string;
  subscription_plan: string | null;
  notes: string | null;
  trial_ends_at: string | null;
  created_at: string;
};

/**
 * Roomier per-center display — the table version cramped 8 columns
 * into one row and lost legibility past about 5 centers. Cards give
 * each center its own bounded space and make the inline edit affordances
 * (status, plan, notes) feel like a real edit surface instead of a
 * shrunken cell.
 */
export function CenterCard({
  center,
  dateLocale,
  trialDaysLabels,
}: {
  center: CenterCardData;
  dateLocale: string;
  trialDaysLabels: { active: (n: number) => string; expired: string };
}) {
  const t = useTranslations("superAdmin");
  const tc = useTranslations("common");

  const created = new Date(center.created_at).toLocaleDateString(dateLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  let trialBadge: { text: string; tone: string } | null = null;
  if (center.subscription_status === "trial" && center.trial_ends_at) {
    const ends = new Date(center.trial_ends_at);
    const days = Math.ceil(
      (ends.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const dateText = ends.toLocaleDateString(dateLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const tail =
      days <= 0 ? trialDaysLabels.expired : trialDaysLabels.active(days);
    trialBadge = {
      text: `${dateText} · ${tail}`,
      tone:
        days <= 0
          ? "bg-rose-100 text-rose-800 border-rose-200"
          : days <= 7
            ? "bg-rose-50 text-rose-700 border-rose-200"
            : days <= 14
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-muted text-muted-foreground border-muted",
    };
  }

  return (
    <article className="bg-card overflow-hidden rounded-2xl border shadow-sm">
      {/* Header */}
      <header className="flex items-start justify-between gap-3 border-b p-4 sm:p-5">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Building2 className="size-4" />
            </span>
            <h3 className="truncate text-lg font-semibold tracking-tight">
              {center.name}
            </h3>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {center.contact_email ? (
              <a
                href={`mailto:${center.contact_email}`}
                className="hover:text-foreground inline-flex items-center gap-1"
              >
                <Mail className="size-3" />
                {center.contact_email}
              </a>
            ) : null}
            {center.contact_phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3" />
                {center.contact_phone}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3" />
              {t("createdShort", { date: created })}
            </span>
          </div>
        </div>
        <form action={deleteCenterCascade}>
          <input type="hidden" name="id" value={center.id} />
          <ConfirmSubmitButton
            confirmMessage={t("deleteConfirm", { name: center.name })}
            ariaLabel={tc("delete")}
          >
            <Trash2 className="size-3.5" />
          </ConfirmSubmitButton>
        </form>
      </header>

      {/* Subscription controls */}
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <div className="space-y-1.5">
          <label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {t("status")}
          </label>
          <StatusSelect
            centerId={center.id}
            currentStatus={center.subscription_status}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {t("planLabel")}
          </label>
          <PlanSelect
            centerId={center.id}
            currentPlan={center.subscription_plan}
          />
        </div>
        {trialBadge ? (
          <div className="sm:col-span-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${trialBadge.tone}`}
            >
              <span className="text-muted-foreground uppercase tracking-wide text-[10px]">
                {t("trialEnds")}
              </span>
              <span className="font-medium">{trialBadge.text}</span>
            </span>
          </div>
        ) : null}
      </div>

      {/* Notes */}
      <div className="bg-muted/30 space-y-1.5 border-t p-4 sm:p-5">
        <label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {t("notesLabel")}
        </label>
        <NotesCell centerId={center.id} initial={center.notes} />
      </div>
    </article>
  );
}
