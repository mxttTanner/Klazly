"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Pencil } from "lucide-react";
import { updateCenterNotes } from "./actions";

/**
 * Inline editable notes cell. Tap the pencil to expand a textarea,
 * Save commits via server action. Kept compact so it doesn't blow up
 * the row height when collapsed.
 */
export function NotesCell({
  centerId,
  initial,
}: {
  centerId: string;
  initial: string | null;
}) {
  const t = useTranslations("superAdmin");
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? "");
  const [savedValue, setSavedValue] = useState(initial ?? "");
  const [pending, startTransition] = useTransition();
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    const fd = new FormData();
    fd.append("id", centerId);
    fd.append("notes", value);
    setError(null);
    startTransition(async () => {
      const res = await updateCenterNotes(fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSavedValue(value);
      setSavedFlash(true);
      setEditing(false);
      setTimeout(() => setSavedFlash(false), 1500);
    });
  }

  if (!editing) {
    const preview = savedValue.trim();
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-muted-foreground hover:text-foreground inline-flex max-w-full items-center gap-1.5 text-left text-xs"
        title={preview || t("notesAdd")}
      >
        <Pencil className="size-3 shrink-0 opacity-60" />
        <span className="truncate">
          {preview ? preview : <span className="italic">{t("notesAdd")}</span>}
        </span>
        {savedFlash ? (
          <Check className="size-3 shrink-0 text-emerald-600" />
        ) : null}
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={4000}
        rows={3}
        autoFocus
        className="border-input bg-background w-full rounded-md border p-1.5 text-xs"
        placeholder={t("notesPlaceholder")}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="bg-primary text-primary-foreground rounded-md px-2 py-1 text-xs disabled:opacity-60"
        >
          {pending ? t("notesSaving") : t("notesSave")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setValue(savedValue);
            setError(null);
            setEditing(false);
          }}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          {t("notesCancel")}
        </button>
      </div>
      {error ? (
        <p className="text-destructive text-[10px]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
