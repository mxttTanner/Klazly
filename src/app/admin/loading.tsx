import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for /admin/* routes. Mirrors the dark full-bleed
 * dashboard (navy canvas, 4 stat cards, two panels) so the skeleton
 * matches the new theme instead of flashing a light layout before the
 * dark dashboard streams in.
 */
export default function AdminLoading() {
  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] -my-8 w-screen min-h-[calc(100dvh-9rem)] bg-navy py-8">
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-brand-line-dark bg-navy-2 p-5"
            >
              <Skeleton className="h-9 w-16 bg-white/10" />
              <Skeleton className="mt-3 h-4 w-20 bg-white/10" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="space-y-4 rounded-2xl border border-brand-line-dark bg-navy-2 p-5"
            >
              <Skeleton className="h-3 w-32 bg-white/10" />
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-xl bg-white/10" />
                  <Skeleton className="h-4 flex-1 bg-white/10" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
