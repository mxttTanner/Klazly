"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const t = useTranslations("resetPassword");
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  // The Supabase recovery link drops a session in the browser. If we don't
  // have one (link expired or someone hit the page directly), guide them
  // back to /forgot-password.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(!!data.session);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t("tooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("mismatch"));
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) {
        setError(t("updateError", { message: updateErr.message }));
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.replace("/post-login");
        router.refresh();
      }, 1200);
    });
  }

  if (hasSession === null) {
    return (
      <p className="text-muted-foreground text-sm">{t("loading")}</p>
    );
  }

  if (hasSession === false) {
    return (
      <div className="bg-amber-50 text-amber-900 space-y-2 rounded-lg border border-amber-200 p-4 text-sm">
        <p className="font-medium">{t("expiredTitle")}</p>
        <p>{t("expiredBody")}</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-emerald-50 text-emerald-900 flex items-start gap-3 rounded-lg border border-emerald-200 p-4 text-sm">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
        <p>{t("doneBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">{t("newPassword")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
          placeholder={t("passwordPlaceholder")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">{t("confirmPassword")}</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={pending}
        />
      </div>
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
