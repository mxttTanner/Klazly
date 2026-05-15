"use client";

import { useState, useTransition } from "react";
import { Sparkles, Pencil, Check } from "lucide-react";
import { updateFoundingCenterCap } from "./actions";

/**
 * Inline-editable Founding Center progress widget.
 *
 * Reads the current cap from the DB (passed in as a prop from the
 * server-rendered overview) and the count of centers currently on
 * plan_tier='founding'. Renders a progress bar with the configured
 * cap; clicking the pencil opens a tiny number input that saves
 * through the updateFoundingCenterCap server action.
 *
 * Visual is gold-tinted to match the badge so they read as the same
 * concept. Click on the body of the widget navigates to a filtered
 * list of founding centers; for now that's the standard centers tab
 * with a query param the page already understands via the filter
 * tabs — we leave that hook here in case we add a dedicated
 * `?tier=founding` filter later. (Today the cap edit is the only
 * interactive element.)
 */
export function FoundingCenterWidget({
  filled,
  initialCap,
}: {
  filled: number;
  initialCap: number;
}) {
  const [cap, setCap] = useState(initialCap);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(initialCap));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    const next = Math.min(100, Math.max(1, Math.floor(Number(draft) || 0)));
    const fd = new FormData();
    fd.append("cap", String(next));
    startTransition(async () => {
      const res = await updateFoundingCenterCap(fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setCap(next);
      setEditing(false);
    });
  }

  const pct = Math.min(100, Math.max(0, (filled / Math.max(1, cap)) * 100));
  const full = filled >= cap;

  return (
    <section className="ring-amber-200 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/70 to-white p-5 shadow-sm ring-1">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="bg-amber-100 text-amber-700 ring-amber-200 inline-flex size-9 items-center justify-center rounded-full ring-1">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="text-amber-900 text-sm font-semibold">
              Founding Center Program
            </p>
            <p className="text-muted-foreground text-xs">
              {full
                ? "Cohort is full — bump the cap to onboard more."
                : "Hand-picked pilot customers at a locked discounted rate."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <input
                type="number"
                min={1}
                max={100}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={pending}
                className="border-input bg-background h-8 w-16 rounded-md border px-2 text-sm tabular-nums"
                autoFocus
              />
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="bg-amber-600 text-white hover:bg-amber-500 inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold disabled:opacity-60"
                aria-label="Save cap"
              >
                <Check className="size-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
              aria-label="Edit cap"
            >
              <Pencil className="size-3" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <p className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums text-amber-900">
            {filled}
          </span>
          <span className="text-muted-foreground text-sm">
            of {cap} spots filled
          </span>
        </p>
        <div
          className="bg-muted mt-3 h-2 w-full overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="bg-amber-500 h-full rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {error ? (
        <p className="text-destructive mt-2 text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
