"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Building2, Calendar, Mail, Phone } from "lucide-react";
import { StatusSelect } from "./status-select";
import { PlanSelect } from "./plan-select";
import { NotesCell } from "./notes-cell";
import { TierBadge } from "./tier-badge";
import { TypeToConfirmDelete } from "@/components/type-to-confirm-delete";
import { deleteCenterCascade } from "./actions";

export type CenterCardData = {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  subscription_status: string;
  subscription_plan: string | null;
  plan_tier: string | null;
  notes: string | null;
  trial_ends_at: string | null;
  created_at: string;
  /** Pre-rendered "Tạo 12/05/2026" / "Created 12/05/2026" — comes from
   *  the server so locale + translation stay in next-intl-server. */
  createdShort: string;
  /** Pre-rendered status+plan badge from src/lib/subscription.ts.
   *  labelKey is the i18n key under superAdmin.*; tone is the Tailwind
   *  class string for the badge. subText is an optional secondary line
   *  ("4 days left" / "ends 30/06/2026"). */
  statusBadge: {
    labelKey: string;
    tone: string;
    subText: string | null;
  };
  /** Translated plan label ("Yearly" / "1 năm"), or null when on trial. */
  planText: string | null;
  /** Pre-formatted monthly contribution chip ("₫1,200,000 / month").
   *  Null when the center isn't active or contributes nothing. Shows
   *  next to the plan chip so the operator can scan price at a glance. */
  mrrText: string | null;
  /** Deprecated — kept for backward compat. The new statusBadge already
   *  carries trial-days-left in its subText. */
  trialBadge: { text: string; tone: string } | null;
};

/**
 * Roomier per-center display — the table version cramped 8 columns
 * into one row and lost legibility past about 5 centers. Cards give
 * each center its own bounded space and make the inline edit affordances
 * (status, plan, notes) feel like a real edit surface instead of a
 * shrunken cell.
 *
 * The page passes pre-rendered strings (dates, trial badge) so this
 * client component doesn't have to receive any server-side functions —
 * that crashes the client/server boundary.
 */
export function CenterCard({ center }: { center: CenterCardData }) {
  const t = useTranslations("superAdmin");
  const tc = useTranslations("common");

  return (
    <article className="bg-card group/center relative overflow-hidden rounded-2xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      {/* Header */}
      <header className="flex items-start justify-between gap-3 border-b p-4 sm:p-5">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary ring-primary/20 flex size-10 shrink-0 items-center justify-center rounded-lg ring-1">
              <Building2 className="size-5" />
            </span>
            <Link
              href={`/super-admin/centers/${center.id}`}
              className="group/title inline-flex min-w-0 items-center gap-1.5"
            >
              <h3 className="group-hover/title:text-primary truncate text-lg font-semibold tracking-tight transition">
                {center.name}
              </h3>
              <ArrowUpRight className="text-muted-foreground group-hover/title:text-primary size-4 opacity-0 transition group-hover/title:opacity-100" />
            </Link>
            <TierBadge tier={center.plan_tier} />
          </div>
          {/* Status + plan + price combined badge — the primary
              at-a-glance signal. "Active · Yearly · ₫1,200,000 / mo"
              for a paid active center, or "Trial · 4 days left" for a
              trialing one. Price chip only renders when active. */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${center.statusBadge.tone}`}
            >
              {t(
                // Coerce dynamic key — the page guarantees it exists.
                center.statusBadge.labelKey as Parameters<typeof t>[0],
              )}
            </span>
            {center.planText ? (
              <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium">
                {center.planText}
              </span>
            ) : null}
            {center.mrrText ? (
              <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums">
                {center.mrrText}
              </span>
            ) : null}
            {center.statusBadge.subText ? (
              <span className="text-muted-foreground text-[11px]">
                · {center.statusBadge.subText}
              </span>
            ) : null}
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
              {center.createdShort}
            </span>
          </div>
        </div>
        <TypeToConfirmDelete
          itemId={center.id}
          itemName={center.name}
          action={deleteCenterCascade}
          compact
          labels={{
            trigger: tc("delete"),
            title: t("deleteCenterTitle", { name: center.name }),
            description: t("deleteCenterDescription"),
            typePrompt: t("deleteCenterTypePrompt", { name: center.name }),
            confirm: t("deleteCenterConfirmButton"),
            cancel: t("cancel"),
          }}
        />
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
