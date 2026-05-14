import { Skeleton } from "@/components/ui/skeleton";

/**
 * Default loading state for every /admin/* route. Next.js renders this
 * instantly when an admin clicks any sidebar link, then streams the real
 * page in when the server component finishes. Stat-card + section
 * skeleton matches the layout shape of /admin (the most-visited admin
 * route) and looks reasonable on /admin/teachers, /admin/students, etc.
 * since those pages also have a title + content block layout.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card space-y-3 rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="size-4 rounded-full" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="bg-card space-y-3 rounded-lg border p-4 shadow-sm">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
