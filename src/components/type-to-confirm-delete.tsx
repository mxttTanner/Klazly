"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type DeleteAction = (
  formData: FormData,
) => Promise<void | { error?: string }>;

/**
 * Destructive-delete guard. Instead of a one-click confirm() that's easy
 * to fat-finger, this makes the operator TYPE the item's exact name
 * before the delete can fire — so important data (a whole center, a
 * class and its lessons, a student and their records) can't be wiped by
 * accident. Used for the high-blast-radius deletes.
 */
export function TypeToConfirmDelete({
  itemId,
  itemName,
  action,
  labels,
  compact = false,
}: {
  itemId: string;
  itemName: string;
  action: DeleteAction;
  labels: {
    trigger: string;
    title: string;
    description: string;
    typePrompt: string;
    confirm: string;
    cancel: string;
  };
  /** compact = icon-only trigger (for table rows / cards). */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const matches = typed.trim() === itemName.trim();

  function submit() {
    if (!matches) return;
    setError(null);
    const fd = new FormData();
    fd.append("id", itemId);
    fd.append("confirm_name", typed.trim());
    startTransition(async () => {
      const res = await action(fd);
      if (res && "error" in res && res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setTyped("");
    });
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={labels.trigger}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 inline-flex size-8 items-center justify-center rounded-md transition"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className="text-muted-foreground hover:text-destructive gap-1.5"
        >
          <Trash2 className="size-3.5" />
          {labels.trigger}
        </Button>
      )}

      <Dialog open={open} onOpenChange={(o) => (o ? null : setOpen(false))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.title}</DialogTitle>
            <DialogDescription>{labels.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-foreground text-sm font-medium">
              {labels.typePrompt}
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={pending}
              placeholder={itemName}
              autoComplete="off"
              spellCheck={false}
              className={
                "border-input bg-background h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 " +
                (matches
                  ? "border-destructive focus:ring-destructive/40"
                  : "focus:ring-primary")
              }
            />
          </div>

          {error ? (
            <p className="text-destructive text-xs" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {labels.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={submit}
              disabled={pending || !matches}
            >
              <Trash2 className="size-4" />
              {labels.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
