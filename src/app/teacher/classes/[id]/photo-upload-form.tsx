"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  PHOTO_MAX_BYTES,
  PHOTO_MAX_DIMENSION,
} from "@/lib/image-validation";
import { uploadStudentPhoto } from "./photo-actions";

const initialState: { error?: string; success?: string } = {};

/**
 * Re-encode an image on the client before upload: long edge capped at
 * PHOTO_MAX_DIMENSION, re-encoded as JPEG. Runs on EVERY picked file, not
 * just oversized ones — canvas re-encoding is what strips EXIF metadata
 * (GPS coordinates, timestamps) from kids' photos, so it must not be
 * conditional on size. Returns null only when processing isn't possible
 * (server validation still applies to whatever is submitted).
 */
async function downscalePhoto(file: File): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const longEdge = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, PHOTO_MAX_DIMENSION / longEdge);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) return null;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return null;
  }
}

export function PhotoUploadForm({
  classId,
  students,
  defaultDate,
}: {
  classId: string;
  students: { id: string; full_name: string }[];
  defaultDate: string;
}) {
  const t = useTranslations("photos");
  const [state, action] = useActionState(uploadStudentPhoto, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [tagged, setTagged] = useState<Set<string>>(new Set());
  const [clientError, setClientError] = useState<string | null>(null);
  // Blocks submit while the picked file is still being re-encoded — without
  // this, a fast tap on Upload races the async downscale and ships the
  // original (possibly oversized, EXIF-laden) file.
  const [processing, setProcessing] = useState(false);

  // Dep is the state OBJECT (a new one per dispatch), not state.success —
  // the success string is identical across uploads, so depending on it
  // would reset the form only after the first success.
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setTagged(new Set());
      setClientError(null);
    }
  }, [state]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setClientError(null);
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      const processed = await downscalePhoto(file);
      if (processed) {
        // Swap the picked file for the re-encoded one so the normal form
        // action submits it.
        const dt = new DataTransfer();
        dt.items.add(processed);
        input.files = dt.files;
      }
      const effective = processed ?? file;
      if (effective.size > PHOTO_MAX_BYTES) {
        setClientError(t("tooLarge"));
        input.value = "";
      }
    } finally {
      setProcessing(false);
    }
  }

  function toggleStudent(id: string) {
    setTagged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        if (processing) e.preventDefault();
      }}
      className="space-y-4 rounded-lg border bg-card p-4 shadow-sm"
    >
      <input type="hidden" name="class_id" value={classId} />
      <div className="flex items-center gap-2">
        <Camera className="text-primary size-4" />
        <p className="font-medium">{t("uploadTitle")}</p>
      </div>
      <p className="text-muted-foreground text-xs">{t("uploadHelp")}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="photo">{t("file")}</Label>
          <Input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            onChange={onFileChange}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="taken_at">{t("takenAt")}</Label>
          <Input
            id="taken_at"
            name="taken_at"
            type="date"
            defaultValue={defaultDate}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="caption">{t("caption")}</Label>
        <Input
          id="caption"
          name="caption"
          maxLength={200}
          placeholder={t("captionPlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>{t("tagStudents")}</Label>
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setTagged(new Set(students.map((s) => s.id)))}
            >
              {t("tagAll")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setTagged(new Set())}
            >
              {t("tagNone")}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {students.map((s) => {
            const checked = tagged.has(s.id);
            return (
              <label key={s.id} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="student_ids"
                  value={s.id}
                  checked={checked}
                  onChange={() => toggleStudent(s.id)}
                  className="peer sr-only"
                />
                <span className="peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary inline-flex min-h-9 items-center rounded-lg border px-3 text-sm transition peer-checked:font-medium hover:bg-muted/40">
                  {s.full_name}
                </span>
              </label>
            );
          })}
        </div>
        <p className="text-muted-foreground text-xs">{t("tagHelp")}</p>
      </div>

      {clientError || state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {clientError ?? state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-700">{state.success}</p>
      ) : null}

      <SubmitButton
        idleLabel={t("uploadSubmit")}
        pendingLabel={t("uploadSubmitting")}
      />
    </form>
  );
}
