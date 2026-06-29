"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { KeyRound, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type ResetState = {
  error?: string;
  tempPassword?: string;
  name?: string;
};

type ResetAction = (
  prev: unknown,
  formData: FormData,
) => Promise<ResetState>;

/**
 * Admin control to reset a user's password. Most parents are phone-only
 * (no email reset link), so the center admin needs a way to issue a fresh
 * temporary password and read it back to the user. The new password is
 * shown ONCE, in a small dialog, with a copy button.
 */
export function ResetPasswordButton({
  userId,
  action,
  labels,
}: {
  userId: string;
  action: ResetAction;
  labels: {
    reset: string;
    confirm: string;
    intro: string;
    copy: string;
    copied: string;
    close: string;
  };
}) {
  const [state, formAction] = useFormState(action, {});
  const [copied, setCopied] = useState(false);

  return (
    <>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!window.confirm(labels.confirm)) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={userId} />
        <Button type="submit" variant="outline" size="sm" className="gap-1.5">
          <KeyRound className="size-3.5" />
          {labels.reset}
        </Button>
      </form>

      {state.error ? (
        <p className="text-destructive mt-1 text-xs" role="alert">
          {state.error}
        </p>
      ) : null}

      {state.tempPassword ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-card w-full max-w-sm space-y-4 rounded-xl border p-5 shadow-lg">
            <p className="text-sm">{labels.intro}</p>
            <div className="flex items-center gap-2">
              <code className="bg-muted flex-1 select-all rounded-md px-3 py-2 text-center text-lg font-semibold tracking-wider">
                {state.tempPassword}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(state.tempPassword!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    /* clipboard blocked — user can select the text manually */
                  }
                }}
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copied ? labels.copied : labels.copy}
              </Button>
            </div>
            <div className="flex justify-end">
              {/* Reloading clears the one-time password from the action state. */}
              <Button
                type="button"
                size="sm"
                onClick={() => window.location.reload()}
              >
                {labels.close}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
