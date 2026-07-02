"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AtSign,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Heart,
  KeyRound,
  Lock,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BrandWordmark } from "@/components/brand-wordmark";
import { signInWithIdentifier } from "./actions";

export function LoginForm() {
  const t = useTranslations("login");
  const tco = useTranslations("contact");
  const tDemo = useTranslations("demo");
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      // Full sign-in happens server-side: the resolved email never
      // crosses back to the browser (prevents phone→email harvesting).
      const result = await signInWithIdentifier(identifier, password);
      if ("error" in result) {
        setError(
          result.error === "invalidPhone"
            ? tco("invalidPhone")
            : result.error === "rateLimited"
              ? t("rateLimited")
              : t("invalidCredentials"),
        );
        return;
      }
      // Brief success state before navigating — gives the button morph
      // a moment to land so the transition doesn't jump.
      setSuccess(true);
      router.replace("/post-login");
      router.refresh();
    });
  }

  // Demo quick-pick chips. Each links to /demo/<role> which already
  // handles signing in as the demo account and redirecting via
  // post-login. Wayfinding is by label + icon, not hue — the three
  // cards are visually identical neutrals.
  const demoRoles = [
    { href: "/demo/admin", label: tDemo("switchAdmin"), icon: UserCog },
    { href: "/demo/teacher", label: tDemo("switchTeacher"), icon: GraduationCap },
    { href: "/demo/parent", label: tDemo("switchParent"), icon: Heart },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Full-screen branded loader while the post-login redirect
          resolves. router.replace() keeps this page mounted (and
          router.refresh() blanks parts of it) until the target RSC
          payload lands — live QA showed several seconds of white
          screen. Mirrors app/post-login/loading.tsx. */}
      {success ? (
        <div className="bg-navy fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 text-white">
          <BrandWordmark className="text-3xl" />
          <svg
            className="text-emerald-light size-6 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        </div>
      ) : null}
      {/* Demo quick-pick chips — for prospects who want to skip the
          form and just see the app. Neutral cards, single accent on
          hover. */}
      <div>
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-widest">
          {tDemo("banner")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {demoRoles.map((r) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.href}
                href={r.href}
                className="group bg-card hover:border-primary/40 hover:text-primary flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-center shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
              >
                <Icon className="text-muted-foreground group-hover:text-primary size-4 transition-colors" />
                <span className="text-foreground group-hover:text-primary text-[10px] font-semibold leading-tight transition-colors">
                  {r.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* OR divider — visual separator between demo and real login. */}
      <div className="relative flex items-center gap-3">
        <div className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">
          {t("orSignIn")}
        </span>
        <div className="bg-border h-px flex-1" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Identifier field with icon prefix + focus-within ring.
            We render a native input so we control the chrome fully —
            the Input primitive defaults to h-8 which is too small for
            a focal sign-in moment. */}
        <div className="space-y-1.5">
          <Label htmlFor="identifier" className="text-foreground text-sm font-semibold">
            {tco("emailOrPhoneLabel")}
          </Label>
          <div className="group/field focus-within:ring-primary/20 focus-within:border-primary relative flex items-center gap-2 rounded-lg border bg-background px-3.5 py-2.5 transition-all duration-150 focus-within:ring-4">
            <AtSign className="text-muted-foreground group-focus-within/field:text-primary size-4 shrink-0 transition-colors" />
            <input
              id="identifier"
              type="text"
              inputMode="email"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={pending}
              placeholder={tco("emailOrPhonePlaceholder")}
              className="placeholder:text-muted-foreground/70 text-foreground w-full bg-transparent text-sm outline-none disabled:opacity-50"
            />
          </div>
        </div>

        {/* Password field — same focus-within treatment. */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-foreground text-sm font-semibold">
              {t("password")}
            </Label>
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-primary text-xs font-medium transition-colors"
            >
              {t("forgot")}
            </Link>
          </div>
          <div className="group/field focus-within:ring-primary/20 focus-within:border-primary relative flex items-center gap-2 rounded-lg border bg-background px-3.5 py-2.5 transition-all duration-150 focus-within:ring-4">
            <KeyRound className="text-muted-foreground group-focus-within/field:text-primary size-4 shrink-0 transition-colors" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
              placeholder="••••••••"
              className="placeholder:text-muted-foreground/70 text-foreground w-full bg-transparent text-sm outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        {/* Remember-me row — cosmetic. Custom-styled checkbox so it
            doesn't look like a default browser tickbox. */}
        <label className="text-muted-foreground inline-flex cursor-pointer items-center gap-2 text-sm select-none">
          <span className="border-input bg-background has-[:checked]:bg-primary has-[:checked]:border-primary relative inline-flex size-4 items-center justify-center rounded border transition-colors">
            <input
              type="checkbox"
              defaultChecked
              className="peer absolute inset-0 cursor-pointer opacity-0"
            />
            <CheckCircle2 className="text-primary-foreground peer-checked:opacity-100 size-3 opacity-0 transition-opacity" />
          </span>
          {t("rememberMe")}
        </label>

        {/* Inline error — destructive alert card. */}
        {error ? (
          <div
            className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2.5 rounded-lg border p-3 text-sm"
            role="alert"
          >
            <svg
              className="mt-0.5 size-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        ) : null}

        {/* Submit button — morphs across three states:
            idle → "Sign in" with a lock icon
            pending → "Signing in…" with spinning loader
            success → "Welcome back!" with a check (positive status). */}
        <Button
          type="submit"
          className={`h-12 w-full text-base font-semibold transition-colors duration-150 ${
            success ? "bg-emerald-600 hover:bg-emerald-600" : ""
          }`}
          disabled={pending || success}
        >
          {success ? (
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="size-5" />
              {t("welcomeBack")}
            </span>
          ) : pending ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="size-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
              </svg>
              {t("submitting")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Lock className="size-4" />
              {t("submit")}
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}
