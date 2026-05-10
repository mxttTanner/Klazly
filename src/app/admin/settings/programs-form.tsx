"use client";

import { useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { Pencil, Sparkles, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmitButton } from "@/components/confirm-submit";
import {
  createProgram,
  deleteProgram,
  renameProgram,
  seedSuggestedPrograms,
} from "./programs-actions";

const initialAdd: { error?: string; success?: string } = {};
const initialRename: { error?: string; success?: string } = {};

type Program = {
  id: string;
  label: string;
  sort_order: number;
};

export function ProgramsForm({ programs }: { programs: Program[] }) {
  const t = useTranslations("settings");
  const [addState, addAction] = useFormState(createProgram, initialAdd);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {programs.length === 0 ? (
        <SeedSuggestedButton />
      ) : null}

      {/* Existing programs list */}
      {programs.length > 0 ? (
        <ul className="space-y-2">
          {programs.map((p) => (
            <li
              key={p.id}
              className="bg-background flex flex-wrap items-center gap-2 rounded-md border p-2"
            >
              {editingId === p.id ? (
                <RenameRow
                  program={p}
                  onDone={() => setEditingId(null)}
                  cancelLabel={t("programsCancel")}
                />
              ) : (
                <>
                  <span className="flex-1 truncate text-sm font-medium">
                    {p.label}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(p.id)}
                    className="inline-flex items-center gap-1"
                  >
                    <Pencil className="size-3.5" />
                    {t("programsRename")}
                  </Button>
                  <form action={deleteProgram}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmSubmitButton
                      confirmMessage={t("programsDeleteConfirm", {
                        label: p.label,
                      })}
                      ariaLabel={t("programsDelete")}
                    >
                      <X className="size-3.5" />
                    </ConfirmSubmitButton>
                  </form>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {/* Add new */}
      <form action={addAction} className="space-y-2 rounded-md border p-3">
        <Label htmlFor="label" className="text-sm font-medium">
          {t("programsAddLabel")}
        </Label>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[12rem]">
            <Input
              id="label"
              name="label"
              required
              placeholder={t("programsAddPlaceholder")}
              maxLength={80}
            />
          </div>
          <SubmitButton
            idleLabel={t("programsAddSubmit")}
            pendingLabel={t("programsAddSubmitting")}
          />
        </div>
        {addState.error ? (
          <p className="text-destructive text-sm" role="alert">
            {addState.error}
          </p>
        ) : null}
        {addState.success ? (
          <p className="text-sm text-emerald-600">{addState.success}</p>
        ) : null}
      </form>
    </div>
  );
}

function RenameRow({
  program,
  onDone,
  cancelLabel,
}: {
  program: Program;
  onDone: () => void;
  cancelLabel: string;
}) {
  const t = useTranslations("settings");
  const [state, action] = useFormState(renameProgram, initialRename);

  // Close the row once the rename succeeds.
  if (state.success !== undefined && state.success !== null) {
    setTimeout(onDone, 0);
  }

  return (
    <form
      action={action}
      className="flex flex-1 flex-wrap items-center gap-2"
    >
      <input type="hidden" name="id" value={program.id} />
      <Input
        name="label"
        defaultValue={program.label}
        required
        autoFocus
        maxLength={80}
        className="h-8 flex-1 min-w-[12rem] text-sm"
      />
      <SubmitButton
        idleLabel={t("programsRenameSave")}
        pendingLabel={t("programsRenameSaving")}
      />
      <button
        type="button"
        onClick={onDone}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        {cancelLabel}
      </button>
      {state.error ? (
        <p className="text-destructive w-full text-xs" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function SeedSuggestedButton() {
  const t = useTranslations("settings");
  const [pending, startTransition] = useTransition();
  return (
    <div className="bg-muted/30 flex flex-wrap items-center gap-3 rounded-md border border-dashed p-4">
      <Sparkles className="text-primary size-4 shrink-0" />
      <div className="flex-1 min-w-[14rem] text-sm">
        <p className="font-medium">{t("programsSeedTitle")}</p>
        <p className="text-muted-foreground text-xs">
          {t("programsSeedHelp")}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => seedSuggestedPrograms())}
      >
        {pending ? t("programsSeedSubmitting") : t("programsSeedSubmit")}
      </Button>
    </div>
  );
}
