"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  SUGGESTION_CATEGORIES,
  type SuggestionCategory,
} from "@/lib/comment-suggestions";

/**
 * The per-student individual_note field plus the day's comment suggestions.
 *
 * The suggestions are a pre-written bank rotated per calendar day (see
 * src/lib/comment-suggestions.ts) — tapping one drops its text into the
 * textarea, freely editable before saving. The field still submits as
 * `note_${studentId}` so the existing lesson save path is unchanged.
 *
 * The textarea is controlled so a tapped suggestion lands in React state
 * (uncontrolled fields also get reset by React 19 after failed actions —
 * same reason the invite forms are controlled).
 */
export function NoteWithSuggestions({
  studentId,
  defaultNote,
  suggestions,
}: {
  studentId: string;
  defaultNote: string;
  suggestions: Record<SuggestionCategory, string[]>;
}) {
  const t = useTranslations("teacher.lessonForm.suggestions");
  const tForm = useTranslations("teacher.lessonForm");
  const [note, setNote] = useState(defaultNote);
  const [openCategory, setOpenCategory] = useState<SuggestionCategory | null>(
    null,
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasBank = SUGGESTION_CATEGORIES.some(
    (c) => (suggestions[c] ?? []).length > 0,
  );

  function applySuggestion(text: string) {
    // Never clobber typed text: empty field gets the suggestion, otherwise
    // it's appended on a new line. Either way it stays freely editable.
    setNote((prev) => (prev.trim().length === 0 ? text : `${prev}\n${text}`));
    setOpenCategory(null);
    textareaRef.current?.focus();
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`note_${studentId}`}>{tForm("individualNote")}</Label>
      <Textarea
        ref={textareaRef}
        id={`note_${studentId}`}
        name={`note_${studentId}`}
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={tForm("individualNotePlaceholder")}
      />

      {hasBank ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground text-xs">{t("label")}</span>
            {SUGGESTION_CATEGORIES.map((category) => {
              const isOpen = openCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenCategory(isOpen ? null : category)}
                  className={
                    isOpen
                      ? "inline-flex min-h-9 items-center rounded-lg border border-emerald bg-emerald/15 px-2.5 text-xs font-semibold text-emerald-light transition"
                      : "inline-flex min-h-9 items-center rounded-lg border border-white/15 px-2.5 text-xs text-brand-mut-2 transition hover:bg-white/5 hover:text-white"
                  }
                >
                  {t(`categories.${category}`)}
                </button>
              );
            })}
          </div>

          {openCategory ? (
            (suggestions[openCategory] ?? []).length > 0 ? (
              <div className="grid gap-1.5">
                {suggestions[openCategory].map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => applySuggestion(text)}
                    className="min-h-11 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm text-brand-mut-2 transition hover:border-emerald/50 hover:bg-emerald/10 hover:text-white"
                  >
                    {text}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">{t("empty")}</p>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
