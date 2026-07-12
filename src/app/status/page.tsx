import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  MessageCircle,
  Phone,
  Mail,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import {
  SYSTEM_STATE,
  COMPONENTS,
  INCIDENTS,
  type SystemState,
} from "./status-data";

// Cached for 60s: during an incident this page takes traffic spikes, and
// force-dynamic (previously set alongside revalidate) silently defeated
// the caching intent by winning over it.
export const revalidate = 60;

const STATE_LABEL_KEY: Record<SystemState, string> = {
  operational: "stateOperational",
  degraded: "stateDegraded",
  partial: "statePartial",
  major: "stateMajor",
};

const STATE_TONE: Record<SystemState, string> = {
  operational: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  degraded: "bg-amber-50 text-amber-800 ring-amber-200",
  partial: "bg-orange-50 text-orange-800 ring-orange-200",
  major: "bg-rose-50 text-rose-700 ring-rose-200",
};

const STATE_DOT: Record<SystemState, string> = {
  operational: "bg-emerald-500",
  degraded: "bg-amber-500",
  partial: "bg-orange-500",
  major: "bg-rose-500",
};

const COMPONENT_LABEL_KEY: Record<string, string> = {
  auth: "componentAuth",
  database: "componentDatabase",
  pdf: "componentPdf",
  notifications: "componentNotifications",
  reports: "componentReports",
};

/**
 * Public status page. Updated by editing src/app/status/status-data.ts
 * during incidents and pushing — no external service required for the
 * first cohort of customers. Cached for 60s so a sudden traffic spike
 * during an incident doesn't compound DB load.
 *
 * Lives at /status (subdomain setup deferred until we have an
 * incident actually worth notifying about).
 */
export default async function StatusPage() {
  const t = await getTranslations("statusPage");
  const tLanding = await getTranslations("landing");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  const overallIcon =
    SYSTEM_STATE === "operational" ? (
      <CheckCircle2 className="size-7" />
    ) : SYSTEM_STATE === "major" ? (
      <AlertOctagon className="size-7" />
    ) : (
      <AlertTriangle className="size-7" />
    );

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = INCIDENTS.filter(
    (i) => new Date(i.startedAtIso).getTime() >= sevenDaysAgo,
  );

  return (
    <div className="bg-background min-h-dvh">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LanguageToggle />
      </div>

      <header className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center"
          aria-label={tLanding("brandAriaLabel")}
        >
          <BrandLogo size="sm" />
        </Link>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        {/* Overall banner */}
        <section
          className={
            "rounded-2xl border p-6 ring-1 ring-inset shadow-sm " +
            STATE_TONE[SYSTEM_STATE]
          }
        >
          <div className="flex items-start gap-4">
            <span>{overallIcon}</span>
            <div className="flex-1 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
                {t("systemStatus")}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {t(STATE_LABEL_KEY[SYSTEM_STATE])}
              </h1>
              <p className="text-sm opacity-80">
                {t("updatedAt", {
                  date: new Date().toLocaleString(dateLocale, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Ho_Chi_Minh",
                  }),
                })}
              </p>
            </div>
          </div>
        </section>

        {/* Per-component status */}
        <section className="bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <Activity className="text-muted-foreground size-4" />
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
              {t("components")}
            </h2>
          </div>
          <ul className="mt-4 divide-y">
            {COMPONENTS.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <span className="text-sm font-medium">
                  {t(COMPONENT_LABEL_KEY[c.id] ?? "")}
                </span>
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={"size-2 rounded-full " + STATE_DOT[c.state]}
                  />
                  <span className="text-muted-foreground text-xs">
                    {t(STATE_LABEL_KEY[c.state])}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Incident history */}
        <section className="bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
          <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
            {t("incidentHistory")}
          </h2>
          {recent.length === 0 ? (
            <p className="text-muted-foreground mt-3 text-sm">
              {t("noIncidents")}
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {recent.map((i) => (
                <li
                  key={i.id}
                  className="border-border border-l-2 pl-4"
                >
                  <p className="text-xs uppercase tracking-widest opacity-70">
                    {new Date(i.startedAtIso).toLocaleString(dateLocale, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                    {i.resolvedAtIso ? " · " + t("resolved") : " · " + t("ongoing")}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {locale === "vi" ? i.titleVi : i.titleEn}
                  </p>
                  {(locale === "vi" ? i.bodyVi : i.bodyEn) ? (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {locale === "vi" ? i.bodyVi : i.bodyEn}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Contact card */}
        <section className="bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
          <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
            {t("contact")}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("contactBody")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href="https://zalo.me/84862404036"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold shadow-sm transition"
            >
              <MessageCircle className="size-4" />
              {t("zaloButton")}
            </a>
            <a
              href="tel:+84862404036"
              className="border-border bg-background hover:bg-muted inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition"
            >
              <Phone className="text-muted-foreground size-4" />
              +84 86 240 4036
            </a>
            <a
              href="mailto:matthewstadlers14@gmail.com"
              className="border-border bg-background hover:bg-muted inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition"
            >
              <Mail className="text-muted-foreground size-4" />
              matthewstadlers14@gmail.com
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
