import { Loader2 } from "lucide-react";
import { BrandWordmark } from "@/components/brand-wordmark";

/**
 * Branded loader shown while /post-login resolves the user's role and
 * redirects to their dashboard — replaces the blank white flash during
 * demo entry and role switches.
 */
export default function PostLoginLoading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-navy text-white">
      <BrandWordmark className="text-3xl" />
      <Loader2 className="size-6 animate-spin text-emerald-light" />
    </div>
  );
}
