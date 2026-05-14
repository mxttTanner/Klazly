"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isEmailLike } from "@/lib/phone";

export function ForgotPasswordForm() {
  const t = useTranslations("forgotPassword");
  const tco = useTranslations("contact");
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phoneOnlyMode, setPhoneOnlyMode] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPhoneOnlyMode(false);

    // If the user typed a phone number (or anything not email-shaped),
    // we can't send a reset link — we have no SMS provider configured
    // yet. Surface that clearly instead of silently doing nothing.
    // TODO(sms-otp): when an SMS provider is wired (eSMS.vn / Twilio),
    // replace this branch with a proper phone reset flow.
    if (!isEmailLike(identifier)) {
      setPhoneOnlyMode(true);
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          identifier.trim().toLowerCase(),
          { redirectTo },
        );
      // Even if Supabase says no such email, we show the same "check your
      // inbox" message so attackers can't enumerate registered emails.
      if (resetError) {
        console.warn("[forgot-password] supabase error", resetError.message);
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="bg-emerald-50 text-emerald-900 flex items-start gap-3 rounded-lg border border-emerald-200 p-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
        <div className="space-y-1 text-sm">
          <p className="font-medium">{t("sentTitle")}</p>
          <p>{t("sentBody")}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="identifier">{tco("emailOrPhoneLabel")}</Label>
        <Input
          id="identifier"
          type="text"
          inputMode="email"
          autoComplete="email"
          required
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            if (phoneOnlyMode) setPhoneOnlyMode(false);
          }}
          disabled={pending}
          placeholder={tco("emailOrPhonePlaceholder")}
        />
      </div>

      {phoneOnlyMode ? (
        <div className="bg-amber-50 text-amber-900 flex items-start gap-2 rounded-lg border border-amber-200 p-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{tco("phoneOnlyResetNote")}</p>
        </div>
      ) : null}

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
