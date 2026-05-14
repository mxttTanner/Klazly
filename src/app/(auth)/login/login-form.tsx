"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveLoginEmail } from "./actions";

export function LoginForm() {
  const t = useTranslations("login");
  const tco = useTranslations("contact");
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      // Resolve the user-typed identifier (email or phone) to the auth
      // email server-side. Phone case needs a service-role DB lookup
      // which can't happen in the browser.
      const resolved = await resolveLoginEmail(identifier);
      if ("error" in resolved) {
        setError(
          resolved.error === "invalidPhone"
            ? tco("invalidPhone")
            : t("invalidCredentials"),
        );
        return;
      }
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: resolved.email,
        password,
      });
      if (signInError) {
        setError(t("invalidCredentials"));
        return;
      }
      router.replace("/post-login");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="identifier">{tco("emailOrPhoneLabel")}</Label>
        <Input
          id="identifier"
          type="text"
          inputMode="email"
          autoComplete="username"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          disabled={pending}
          placeholder={tco("emailOrPhonePlaceholder")}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t("password")}</Label>
          <Link
            href="/forgot-password"
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            {t("forgot")}
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
