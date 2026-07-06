"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Square photo thumbnail that opens a larger view in a dialog on tap.
 *
 * Signed URLs expire (1h TTL) and can fail — a broken image icon in a
 * parent's timeline reads as a bug, so load errors render a quiet
 * placeholder instead. The thumbnail and the dialog image track failure
 * SEPARATELY: an expired URL discovered when the dialog opens (e.g. tab
 * left open past the TTL) must not retroactively destroy the still-cached
 * thumbnail or yank the open dialog away.
 */
export function PhotoLightbox({
  url,
  alt,
  caption,
  dateLabel,
}: {
  url: string;
  alt: string;
  caption: string | null;
  dateLabel: string;
}) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const [fullFailed, setFullFailed] = useState(false);

  if (thumbFailed) {
    return (
      <div className="bg-muted/40 flex aspect-square w-full items-center justify-center rounded-lg border">
        <ImageOff className="text-muted-foreground/50 size-5" />
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger
        className="focus-visible:ring-ring/50 block w-full overflow-hidden rounded-lg border outline-none focus-visible:ring-3"
        aria-label={alt}
      >
        {/* Plain <img> like the rest of the app (worksheets, logos) —
            signed Supabase URLs, no next/image loader. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          loading="lazy"
          onError={() => setThumbFailed(true)}
          className="aspect-square w-full object-cover transition hover:scale-[1.03]"
        />
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-3 sm:p-4">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        {fullFailed ? (
          <div className="bg-muted/40 flex min-h-48 w-full items-center justify-center rounded-md border">
            <ImageOff className="text-muted-foreground/50 size-8" />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={alt}
            onError={() => setFullFailed(true)}
            className="max-h-[70dvh] w-full rounded-md object-contain"
          />
        )}
        <DialogDescription className="text-foreground text-sm">
          {caption ? <span className="block">{caption}</span> : null}
          <span className="text-muted-foreground block text-xs">
            {dateLabel}
          </span>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
