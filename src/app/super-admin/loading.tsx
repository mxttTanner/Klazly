import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for /super-admin/**. The dashboard runs several queries
 * (centers, feedback, analytics), so it is the segment most likely to
 * stall. Light skeleton to match the zinc console surface.
 */
export default function SuperAdminLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 shadow-sm">
            <Skeleton className="h-8 w-14" />
            <Skeleton className="mt-3 h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
