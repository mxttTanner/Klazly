"use client";

import { useRef, useState } from "react";
import { useFormState } from "react-dom";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { sendParentTeacherMessage } from "@/app/messages-actions";

const initial: { error?: string; success?: boolean; emailWarning?: boolean } =
  {};
const MAX_BODY = 2000;

export function MessageComposer({
  studentId,
  placeholder,
  sendLabel,
  sendingLabel,
}: {
  studentId: string;
  placeholder: string;
  sendLabel: string;
  sendingLabel: string;
}) {
  const [state, action] = useFormState(sendParentTeacherMessage, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [length, setLength] = useState(0);

  // After a successful send, clear the textarea and refocus so it feels
  // like a chat input — no full reload between messages.
  if (state.success && textareaRef.current && textareaRef.current.value) {
    textareaRef.current.value = "";
    if (length !== 0) setLength(0);
  }

  // Only show the counter once they're close to the cap so it doesn't
  // clutter a typical short message.
  const showCounter = length >= MAX_BODY * 0.75;
  const counterTone =
    length >= MAX_BODY
      ? "text-destructive"
      : length >= MAX_BODY * 0.9
        ? "text-warning-foreground"
        : "text-muted-foreground";

  return (
    <form
      ref={formRef}
      action={action}
      className="bg-card flex flex-col gap-2 rounded-lg border p-3"
    >
      <input type="hidden" name="student_id" value={studentId} />
      <Textarea
        ref={textareaRef}
        name="body"
        placeholder={placeholder}
        rows={2}
        required
        maxLength={MAX_BODY}
        onChange={(e) => setLength(e.target.value.length)}
        className="min-h-[2.5rem] resize-none border-0 px-0 shadow-none focus-visible:ring-0"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-destructive flex-1 text-xs" role="alert">
          {state.error ?? ""}
        </p>
        {showCounter ? (
          <span className={`text-xs tabular-nums ${counterTone}`}>
            {length}/{MAX_BODY}
          </span>
        ) : null}
        <SubmitButton idleLabel={sendLabel} pendingLabel={sendingLabel} />
      </div>
    </form>
  );
}
