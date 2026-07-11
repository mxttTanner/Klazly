import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for the lesson record/edit flow. The form paints a
 * full-bleed dark navy canvas (see lesson-form.tsx), so this skeleton
 * uses the same negative-margin trick and palette — without it the
 * light /teacher skeleton flashes before the dark form streams in.
 */
export default function LessonFormLoading() {
  return (
    <div className="-mx-4 -my-6 min-h-[calc(100dvh-7rem)] bg-navy px-4 pb-28 pt-6 sm:-mx-6 sm:px-6 sm:pt-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 bg-white/10" />
          <Skeleton className="h-8 w-64 bg-white/10" />
          <Skeleton className="h-4 w-48 bg-white/10" />
        </div>
        <div className="space-y-4 rounded-2xl border border-brand-line-dark bg-navy-2 p-5">
          <Skeleton className="h-5 w-36 bg-white/10" />
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full bg-white/10" />
            ))}
          </div>
          <Skeleton className="h-10 w-full bg-white/10" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full bg-white/10" />
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-brand-line-dark bg-navy-2 p-5">
          <Skeleton className="h-5 w-44 bg-white/10" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-brand-line-dark p-4">
              <Skeleton className="h-5 w-40 bg-white/10" />
              <Skeleton className="h-9 w-full bg-white/10" />
              <Skeleton className="h-16 w-full bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
