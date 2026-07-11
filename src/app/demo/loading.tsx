import { Loader2 } from "lucide-react";
import { BrandWordmark } from "@/components/brand-wordmark";

/**
 * Loading state for /demo and /demo/[role]. Matches the dark chrome of
 * the demo hub and the DemoLogin transition screen, so entering the
 * demo from the marketing pages never flashes a blank frame.
 */
export default function DemoLoading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-slate-950 text-white">
      <BrandWordmark className="text-3xl" />
      <Loader2 className="size-6 animate-spin text-emerald-light" />
    </div>
  );
}
