"use client";

import { useState, useTransition, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { MessageSquareHeart, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { submitFeedback } from "@/app/feedback-actions";

type Rating = "sad" | "meh" | "happy";

/**
 * Floating "Feedback" button + modal, dropped into the authed-shell
 * layouts (admin / teacher / parent / super-admin).
 *
 * - Never auto-opens.
 * - Three-emoji rating, optional free-text comment.
 * - After-submit shows a thank-you state for ~2s, then auto-closes.
 * - On error, keeps the modal open and shows a soft error so the
 *   user can retry. Never blocks navigation.
 *
 * Captures the current pathname so super-admin can see where the
 * feedback was filed from.
 */
export function FeedbackWidget() {
  const t = useTranslations("feedback");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<Rating | null>(null);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset modal state when reopened from scratch.
  useEffect(() => {
    if (open) {
      setRating(null);
      setComment("");
      setDone(false);
      setError(null);
    }
  }, [open]);

  function submit() {
    if (!rating) return;
    setError(null);
    const fd = new FormData();
    fd.append("rating", rating);
    if (comment.trim()) fd.append("comment", comment.trim());
    if (pathname) fd.append("page", pathname);
    startTransition(async () => {
      const res = await submitFeedback(fd);
      if (res?.error) {
        setError(t("errorGeneric"));
        return;
      }
      setDone(true);
      // Close shortly after the thank-you state so users feel
      // acknowledged but aren't trapped.
      setTimeout(() => setOpen(false), 1800);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-card text-foreground border-border hover:bg-muted/60 fixed bottom-4 right-4 z-30 inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium shadow-md transition print:hidden sm:bottom-5 sm:right-5"
        aria-label={t("buttonLabel")}
      >
        <MessageSquareHeart className="size-3.5 text-primary" />
        <span className="hidden sm:inline">{t("buttonLabel")}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("title")}
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <p className="text-emerald-700 py-6 text-center text-sm font-medium">
              {t("thanks")}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { v: "sad" as const, emoji: "😞", label: t("ratingSad") },
                  { v: "meh" as const, emoji: "😐", label: t("ratingMeh") },
                  { v: "happy" as const, emoji: "😊", label: t("ratingHappy") },
                ]).map(({ v, emoji, label }) => (
                  <button
                    key={v}
                    type="button"
                    disabled={pending}
                    onClick={() => setRating(v)}
                    className={
                      "flex flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition " +
                      (rating === v
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:bg-muted/40")
                    }
                  >
                    <span className="text-2xl leading-none">{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>

              {rating ? (
                <div className="space-y-1.5">
                  <label
                    htmlFor="feedback-comment"
                    className="text-muted-foreground text-xs font-medium"
                  >
                    {rating === "happy" ? t("promptIfHigh") : t("promptIfLow")}
                  </label>
                  <textarea
                    id="feedback-comment"
                    rows={3}
                    maxLength={2000}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={pending}
                    className="border-input bg-background w-full rounded-md border p-2 text-sm"
                  />
                </div>
              ) : null}

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
                  <X className="size-4" />
                </Button>
                <Button
                  type="button"
                  onClick={submit}
                  disabled={!rating || pending}
                >
                  {pending ? t("submitting") : t("submit")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
