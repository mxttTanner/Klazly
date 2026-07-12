"use client";

import { type ReactNode, useActionState } from "react";
import { ConfirmSubmitButton } from "@/components/confirm-submit";

type DeleteResult = { error?: string } | undefined | void;

/**
 * Wraps a destructive server action in a form that surfaces failures
 * inline. The plain `<form action={deleteX}>` pattern had two bad
 * endings: a thrown DB error dumped the user on the segment error
 * boundary for a row delete, and demo mode silently no-opped (tap
 * Delete, confirm, nothing happens, no explanation). Actions now
 * return `{ error }` and this renders it under the button.
 */
export function ConfirmDeleteForm({
  action,
  confirmMessage,
  children,
  hidden,
  variant = "destructive",
  size = "sm",
  ariaLabel,
  className,
}: {
  action: (formData: FormData) => Promise<DeleteResult>;
  confirmMessage: string;
  children: ReactNode;
  /** Hidden form fields (ids the action needs). */
  hidden: Record<string, string>;
  variant?: "destructive" | "outline" | "default";
  size?: "sm" | "default" | "lg" | "icon";
  ariaLabel?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(
    async (_prev: { error?: string }, formData: FormData) =>
      (await action(formData)) ?? {},
    {} as { error?: string },
  );

  return (
    <form action={formAction} className={className}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <ConfirmSubmitButton
        confirmMessage={confirmMessage}
        variant={variant}
        size={size}
        ariaLabel={ariaLabel}
      >
        {children}
      </ConfirmSubmitButton>
      {state.error ? (
        <p className="text-destructive mt-1 text-xs" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
