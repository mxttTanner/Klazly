"use client";

import { type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";

/**
 * Submit button that prompts for confirmation before letting the surrounding
 * form submit. Used on destructive actions like Delete teacher / Delete
 * lesson — small thing but it stops the daily "I clicked the wrong row" miss.
 */
export function ConfirmSubmitButton({
  confirmMessage,
  children,
  variant = "destructive",
  size = "sm",
  ariaLabel,
}: {
  confirmMessage: string;
  children: ReactNode;
  variant?: "destructive" | "outline" | "default";
  size?: "sm" | "default" | "lg" | "icon";
  ariaLabel?: string;
}) {
  return (
    <button
      type="submit"
      aria-label={ariaLabel}
      className={buttonVariants({ variant, size })}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
