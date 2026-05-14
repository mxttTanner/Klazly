import { Skeleton } from "@/components/ui/skeleton";

/**
 * Default loading state for /teacher and nested routes. Two-column grid
 * mimics the class list (/teacher home) shape; on /teacher/classes/[id]
 * the tab nav has its own skeleton via the nested loading or simply
 * shows this card grid briefly before the real page swaps in.
 */
export default function TeacherLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card space-y-3 rounded-xl border p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="size-4 rounded-full" />
            </div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
