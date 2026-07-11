import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared loading skeleton for the light /admin sub-pages (classes,
 * students, teachers, parents, messages, worksheets, settings, import).
 * The dashboard's own loading.tsx is a full-bleed dark navy skeleton;
 * without per-section overrides it also covers these light pages and
 * every navigation flashes dark → light. Shape: page heading, a form
 * card, and table rows — close enough to all eight sections.
 */
export function AdminSectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
