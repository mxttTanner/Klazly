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
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { resolveLoginEmail } from "./actions";

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
      // Brief success state before navigating — gives the button morph
      // a moment to land so the transition doesn't jump.
      setSuccess(true);
      router.replace("/post-login");
      router.refresh();
    });
  }

  // Demo quick-pick chips. Each links to /demo/<role> which already
  // handles signing in as the demo account and redirecting via
  // post-login. This skips the form entirely for prospect tire-kickers,
  // which is the most common use case on this page.
  const demoRoles = [
    {
      href: "/demo/admin",
      label: tDemo("switchAdmin"),
      icon: UserCog,
      tone: "from-sky-400 to-sky-600",
      ring: "ring-sky-300/50 hover:ring-sky-300",
    },
    {
      href: "/demo/teacher",
      label: tDemo("switchTeacher"),
      icon: GraduationCap,
      tone: "from-violet-400 to-violet-600",
      ring: "ring-violet-300/50 hover:ring-violet-300",
    },
    {
      href: "/demo/parent",
      label: tDemo("switchParent"),
      icon: Heart,
      tone: "from-rose-400 to-rose-600",
      ring: "ring-rose-300/50 hover:ring-rose-300",
    },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Demo quick-pick chips — for prospects who want to skip the
          form and just see the app. Animated entrance: each chip
          delays in 60ms apart so the row reads as one fluid sweep. */}
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
        <p className="text-amber-700 mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
          <span className="relative inline-flex size-1.5">
            <span className="bg-amber-500 absolute inset-0 rounded-full motion-safe:animate-ping motion-safe:opacity-75" />
            <span className="bg-amber-500 relative inline-block size-1.5 rounded-full" />
          </span>
          {tDemo("banner")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {demoRoles.map((r, i) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.href}
                href={r.href}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`group bg-gradient-to-br text-white ${r.tone} ring-2 ${r.ring} motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:fill-mode-backwards relative flex flex-col items-center gap-1.5 overflow-hidden rounded-xl px-2 py-2.5 shadow-md transition-all hover:-translate-y-0.5 hover:scale-[1.04] hover:shadow-lg`}
              >
                <Icon className="size-4 transition-transform group-hover:scale-110 group-hover:rotate-6" />
                <span className="text-[10px] font-bold leading-tight">{r.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* OR divider — visual separator between demo and real login.
          Subtle but it makes the two paths visually distinct. */}
      <div
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 motion-safe:delay-200 motion-safe:fill-mode-backwards relative flex items-center gap-3"
      >
        <div className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
          {t("orSignIn")}
        </span>
        <div className="bg-border h-px flex-1" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 motion-safe:delay-300 motion-safe:fill-mode-backwards space-y-4"
      >
        {/* Identifier field with icon prefix + focus-within glow ring.
            We render a native input so we control the chrome fully —
            the Input primitive defaults to h-8 which is too small for
            a focal sign-in moment. */}
        <div className="space-y-1.5">
          <Label htmlFor="identifier" className="text-foreground text-sm font-bold">
            {tco("emailOrPhoneLabel")}
          </Label>
          <div className="group/field focus-within:ring-primary/20 focus-within:border-primary/40 focus-within:shadow-md focus-within:shadow-primary/10 relative flex items-center gap-2 rounded-xl border bg-background px-3.5 py-2.5 transition-all focus-within:ring-4">
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

        {/* Password field — same focus-within treatment. KeyRound icon
            for visual distinction from the identifier above. Show/hide
            eye button stays anchored right. */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-foreground text-sm font-bold">
              {t("password")}
            </Label>
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-primary text-xs font-medium transition"
            >
              {t("forgot")}
            </Link>
          </div>
          <div className="group/field focus-within:ring-primary/20 focus-within:border-primary/40 focus-within:shadow-md focus-within:shadow-primary/10 relative flex items-center gap-2 rounded-xl border bg-background px-3.5 py-2.5 transition-all focus-within:ring-4">
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
              className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-7 shrink-0 items-center justify-center rounded-md transition"
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

        {/* Inline error — rose alert card with shake animation to draw
            the eye without being aggressive. */}
        {error ? (
          <div
            className="border-rose-200/60 bg-rose-50/60 text-rose-800 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-300 flex items-start gap-2.5 rounded-lg border p-3 text-sm"
            role="alert"
          >
            <svg
              className="text-rose-500 mt-0.5 size-4 shrink-0"
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
            idle → "Sign in" with a key icon
            pending → "Signing in…" with spinning loader
            success → "Welcome back!" with a check + emerald color
            The morph + color shift makes the form feel responsive. */}
        <Button
          type="submit"
          className={`relative h-12 w-full overflow-hidden text-base font-bold shadow-md transition-all hover:scale-[1.01] hover:shadow-lg ${
            success
              ? "bg-emerald-500 hover:bg-emerald-500 shadow-emerald-500/30 ring-1 ring-emerald-400"
              : "shadow-primary/20 ring-1 ring-primary/30 hover:shadow-primary/25"
          }`}
          disabled={pending || success}
        >
          {success ? (
            <span className="inline-flex items-center gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-75 motion-safe:duration-300">
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
