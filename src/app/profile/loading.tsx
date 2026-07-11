import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for /profile — reachable from the avatar in every
 * authed header, and dynamic (DB fetch), so it needs feedback. Mirrors
 * the page shape: back link, identity header, form card.
 */
export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <Skeleton className="h-4 w-24" />
      <div className="flex items-start gap-3">
        <Skeleton className="size-12 shrink-0 rounded-full" />
        <div className="space-y-2 pt-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
