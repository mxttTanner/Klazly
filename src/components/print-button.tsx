"use client";

import { buttonVariants } from "@/components/ui/button";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      {label}
    </button>
  );
}
