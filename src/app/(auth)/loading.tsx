import { Loader2 } from "lucide-react";
import { BrandWordmark } from "@/components/brand-wordmark";

/**
 * Loading state for the auth group (/login, /forgot-password). Light
 * surface to match the login form panel, so slow navigations from the
 * landing page show branded feedback instead of a blank stall.
 */
export default function AuthLoading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background">
      <BrandWordmark tone="light" className="text-3xl" />
      <Loader2 className="size-6 animate-spin text-emerald-dark" />
    </div>
  );
}
