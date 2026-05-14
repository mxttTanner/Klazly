import { cn } from "@/lib/utils";

/**
 * Animated grey placeholder block — drop in anywhere you'd otherwise render
 * a piece of fetched data. Use in loading.tsx files so Next.js can render
 * instant feedback while the server component is awaiting Supabase.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-muted animate-pulse rounded-md", className)}
      {...props}
    />
  );
}
