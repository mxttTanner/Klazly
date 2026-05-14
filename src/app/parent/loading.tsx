import { Skeleton } from "@/components/ui/skeleton";

/**
 * Default loading state for /parent and /parent/students/[id]. The student
 * card grid is what parents land on; on the detail page the same skeleton
 * appears briefly under the tab nav before lessons stream in.
 */
export default function ParentLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="bg-card flex flex-col gap-3 overflow-hidden rounded-2xl border p-5 shadow-sm"
          >
            <Skeleton className="size-14 rounded-full" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
            <div className="mt-2 flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
