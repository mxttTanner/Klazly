"use client";

import { useEffect, useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateClassBook } from "./actions";

export function InlineBook({
  classId,
  currentBook,
  placeholder,
  emptyLabel,
  saveLabel,
  cancelLabel,
  editLabel,
}: {
  classId: string;
  currentBook: string | null;
  placeholder: string;
  emptyLabel: string;
  saveLabel: string;
  cancelLabel: string;
  editLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentBook ?? "");
  const [pending, startTransition] = useTransition();

  // Keep local state in sync if the prop changes (e.g., another admin
  // edited the book in another browser, or our own action revalidated
  // the row). Only resync while not editing — don't clobber the user's
  // in-progress text.
  useEffect(() => {
    if (!editing) setValue(currentBook ?? "");
  }, [currentBook, editing]);

  function save() {
    const fd = new FormData();
    fd.append("id", classId);
    fd.append("book", value);
    startTransition(() => {
      updateClassBook(fd);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          maxLength={120}
          className="h-8 text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              setValue(currentBook ?? "");
              setEditing(false);
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={pending}
        >
          {saveLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setValue(currentBook ?? "");
            setEditing(false);
          }}
          disabled={pending}
        >
          {cancelLabel}
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      aria-label={editLabel}
    >
      <Pencil className="size-3" />
      <span className={currentBook ? "text-foreground" : "italic"}>
        {currentBook ?? emptyLabel}
      </span>
    </button>
  );
}
