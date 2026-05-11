"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { sendParentTeacherMessage } from "@/app/messages-actions";

const initial: { error?: string; success?: boolean } = {};

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

  // After a successful send, clear the textarea and refocus so it feels
  // like a chat input — no full reload between messages.
  if (state.success && textareaRef.current && textareaRef.current.value) {
    textareaRef.current.value = "";
  }

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
        maxLength={2000}
        className="min-h-[2.5rem] resize-none border-0 px-0 shadow-none focus-visible:ring-0"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-destructive text-xs" role="alert">
          {state.error ?? ""}
        </p>
        <SubmitButton idleLabel={sendLabel} pendingLabel={sendingLabel} />
      </div>
    </form>
  );
}
