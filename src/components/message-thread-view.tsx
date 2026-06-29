"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Check, CheckCheck, MessageSquareText, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { sendParentTeacherMessage } from "@/app/messages-actions";

function SendButton({ idle, pending }: { idle: string; pending: string }) {
  const { pending: isPending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      disabled={isPending}
      className="inline-flex gap-1.5"
    >
      <Send className="size-3.5" />
      {isPending ? pending : idle}
    </Button>
  );
}

export type ChatMessage = {
  id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  senderName: string;
  senderRole: string;
};

type Labels = {
  empty: string;
  send: string;
  sending: string;
  composerPlaceholder: string;
  teacherTag: string;
  adminTag: string;
  readReceiptRead: string;
  readReceiptSent: string;
  dayToday: string;
  dayYesterday: string;
  fetchFailedHint: string;
  enterHint: string;
  emailNotDelivered: string;
};

const initialState: {
  error?: string;
  success?: boolean;
  emailWarning?: boolean;
} = {};

export function MessageThreadView({
  studentId,
  currentUserId,
  messages,
  locale,
  labels,
  fetchFailed,
}: {
  studentId: string;
  currentUserId: string;
  messages: ChatMessage[];
  locale: string;
  labels: Labels;
  fetchFailed?: boolean;
}) {
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";
  const [state, action] = useFormState(sendParentTeacherMessage, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  // Auto-scroll to the latest message on mount and whenever a new one arrives.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    if (last.id === lastMessageIdRef.current) return;
    lastMessageIdRef.current = last.id;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // After successful send, clear the textarea + refocus.
  useEffect(() => {
    if (state.success && textRef.current) {
      textRef.current.value = "";
      textRef.current.focus();
    }
  }, [state.success]);

  // Group messages by day.
  const groups = groupByDay(messages, dateLocale, labels);

  const hasMessages = messages.length > 0;

  return (
    <div className="space-y-3">
      {hasMessages ? (
        <div
          ref={scrollRef}
          className="bg-muted/20 max-h-[28rem] min-h-[16rem] space-y-3 overflow-y-auto rounded-lg border p-3 sm:p-4"
        >
          {groups.map((g) => (
            <div key={g.label} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="bg-muted-foreground/20 h-px flex-1" />
                <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                  {g.label}
                </span>
                <span className="bg-muted-foreground/20 h-px flex-1" />
              </div>
              <ul className="space-y-2">
                {g.items.map((m) => {
                  const mine = m.sender_user_id === currentUserId;
                  const when = new Date(m.created_at).toLocaleTimeString(
                    dateLocale,
                    { hour: "2-digit", minute: "2-digit" },
                  );
                  return (
                    <li
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                          mine
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-card text-foreground border rounded-bl-md"
                        }`}
                      >
                        {!mine ? (
                          <p className="mb-0.5 text-xs font-medium opacity-80">
                            {m.senderName}
                            {m.senderRole === "teacher"
                              ? ` · ${labels.teacherTag}`
                              : m.senderRole === "admin"
                                ? ` · ${labels.adminTag}`
                                : ""}
                          </p>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {m.body}
                        </p>
                        <div
                          className={`mt-1 flex items-center gap-1 text-[10px] ${
                            mine
                              ? "justify-end text-primary-foreground/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          <span>{when}</span>
                          {mine ? (
                            m.read_at ? (
                              <span
                                className="inline-flex items-center gap-0.5"
                                title={labels.readReceiptRead}
                              >
                                <CheckCheck className="size-3" />
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center"
                                title={labels.readReceiptSent}
                              >
                                <Check className="size-3" />
                              </span>
                            )
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm">
          <MessageSquareText className="size-7 opacity-50" />
          <p>{fetchFailed ? labels.fetchFailedHint : labels.empty}</p>
        </div>
      )}

      {/* Composer */}
      <form
        ref={formRef}
        action={action}
        className="bg-card sticky bottom-0 flex flex-col gap-2 rounded-lg border p-3 shadow-sm"
      >
        <input type="hidden" name="student_id" value={studentId} />
        <ComposerBody
          studentId={studentId}
          textRef={textRef}
          formRef={formRef}
          labels={labels}
          errorText={state.error ?? ""}
          warningText={state.emailWarning ? labels.emailNotDelivered : ""}
        />
      </form>
    </div>
  );
}

function ComposerBody({
  textRef,
  formRef,
  labels,
  errorText,
  warningText,
}: {
  studentId: string;
  textRef: React.RefObject<HTMLTextAreaElement>;
  formRef: React.RefObject<HTMLFormElement>;
  labels: Labels;
  errorText: string;
  warningText: string;
}) {
  const { pending } = useFormStatus();
  return (
    <>
      <Textarea
        ref={textRef}
        name="body"
        placeholder={labels.composerPlaceholder}
        rows={2}
        required
        maxLength={2000}
        disabled={pending}
        className="min-h-[2.5rem] resize-none border-0 px-0 shadow-none focus-visible:ring-0 disabled:opacity-60"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (pending) return;
            formRef.current?.requestSubmit();
          }
        }}
      />
      {warningText ? (
        <p className="text-warning-foreground text-xs" role="status">
          {warningText}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <p className="text-destructive text-xs" role="alert">
          {errorText}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground hidden text-[10px] sm:inline">
            {labels.enterHint}
          </span>
          <SendButton idle={labels.send} pending={labels.sending} />
        </div>
      </div>
    </>
  );
}

function groupByDay(
  messages: ChatMessage[],
  dateLocale: string,
  labels: Pick<Labels, "dayToday" | "dayYesterday">,
): { label: string; items: ChatMessage[] }[] {
  const today = startOfDay(new Date());
  const yesterday = startOfDay(new Date(today.getTime() - 24 * 60 * 60 * 1000));
  const buckets = new Map<number, { label: string; items: ChatMessage[] }>();

  for (const m of messages) {
    const d = startOfDay(new Date(m.created_at));
    const key = d.getTime();
    let bucket = buckets.get(key);
    if (!bucket) {
      let label: string;
      if (key === today.getTime()) label = labels.dayToday;
      else if (key === yesterday.getTime()) label = labels.dayYesterday;
      else
        label = d.toLocaleDateString(dateLocale, {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      bucket = { label, items: [] };
      buckets.set(key, bucket);
    }
    bucket.items.push(m);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([, v]) => v);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
