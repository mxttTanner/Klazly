/**
 * Manual status data. When an incident is in progress, edit this file,
 * commit, push — Vercel redeploys in ~30s and /status shows the new
 * state. Crude but it's the right tool for a < 10-customer launch:
 * zero infra dependency, no third-party signup, no extra credentials.
 *
 * Once we're past 20 paying centers, swap this for Instatus or Better
 * Stack and wire the status page to read from their API instead.
 */

export type SystemState = "operational" | "degraded" | "partial" | "major";

export const SYSTEM_STATE: SystemState = "operational";

export const COMPONENTS: { id: string; state: SystemState }[] = [
  { id: "auth", state: "operational" },
  { id: "database", state: "operational" },
  { id: "pdf", state: "operational" },
  { id: "notifications", state: "operational" },
  { id: "reports", state: "operational" },
];

export type Incident = {
  id: string;
  startedAtIso: string;
  resolvedAtIso: string | null;
  severity: SystemState;
  /** Short headline shown in the timeline. */
  titleVi: string;
  titleEn: string;
  /** Optional follow-up explanation. */
  bodyVi?: string;
  bodyEn?: string;
};

/**
 * Newest first. Keep the last ~30 days. Older entries can be culled.
 * For an active incident, set resolvedAtIso = null and update
 * SYSTEM_STATE / COMPONENTS to match severity.
 */
export const INCIDENTS: Incident[] = [];
