"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserSquare2, GraduationCap, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, type DemoRole } from "@/lib/demo";
import { BrandLogo } from "@/components/brand-logo";

// Per-role visuals — keep the loading state tied to the role-color
// system so the user sees consistent identity (sky=admin, violet=teacher,
// rose=parent) instead of a generic gray spinner.
const ROLE_VISUAL: Record<
  DemoRole,
  { icon: typeof UserSquare2; tone: string; bg: string; label: string }
> = {
  admin: {
    icon: UserSquare2,
    tone: "text-sky-300",
    bg: "from-sky-500/15 to-transparent ring-sky-400/30",
    label: "Center Admin",
  },
  teacher: {
    icon: GraduationCap,
    tone: "text-violet-300",
    bg: "from-violet-500/15 to-transparent ring-violet-400/30",
    label: "Teacher",
  },
  parent: {
    icon: Heart,
    tone: "text-rose-300",
    bg: "from-rose-500/15 to-transparent ring-rose-400/30",
    label: "Parent",
  },
};

export function DemoLogin({ role }: { role: DemoRole }) {
  const t = useTranslations("demo");
  const tLanding = useTranslations("landing");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const visual = ROLE_VISUAL[role];
  const Icon = visual.icon;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: DEMO_ACCOUNTS[role],
        password: DEMO_PASSWORD,
      });
      if (cancelled) return;
      if (signInError) {
        setError(t("loadError"));
        return;
      }
      router.replace("/post-login");
      router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [role, router, t]);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Match the landing's hairline so the chrome stays consistent
          during the transition — page no longer feels naked. */}
      <div
        aria-hidden="true"
        className="from-sky-400 via-primary to-amber-400 absolute inset-x-0 top-0 h-px bg-gradient-to-r"
      />
      {/* Subtle dot grid + role-tinted ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:32px_32px]"
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-32 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-br ${visual.bg.split(" ")[0]} ${visual.bg.split(" ")[1]} blur-3xl`}
      />

      {/* Minimal header with brand — gives the transition a stable
          chrome instead of going blank between click and redirect. */}
      <header className="relative">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            aria-label={tLanding("brandAriaLabel")}
            className="inline-flex text-white transition hover:opacity-80"
          >
            <BrandLogo size="md" />
          </Link>
        </div>
      </header>

      <main className="relative flex min-h-[calc(100dvh-5rem)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6 text-center">
          {error ? (
            <>
              <div className="bg-rose-500/15 text-rose-300 ring-rose-400/30 inline-flex size-16 items-center justify-center rounded-2xl ring-1">
                <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="text-rose-300 text-sm font-medium" role="alert">
                {error}
              </p>
              <Link
                href="/demo"
                className="border-white/20 bg-white/5 hover:bg-white/10 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium backdrop-blur-sm transition"
              >
                {t("backHome")}
              </Link>
            </>
          ) : (
            <>
              {/* Role badge with pulsing ring + spinning border */}
              <div className="relative mx-auto inline-flex">
                <div
                  className={`relative inline-flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br ${visual.bg} ring-2 backdrop-blur-sm`}
                >
                  <Icon className={`size-9 ${visual.tone}`} />
                </div>
                {/* Spinning gradient ring */}
                <div
                  aria-hidden
                  className={`absolute -inset-2 rounded-2xl border-2 border-transparent motion-safe:animate-spin`}
                  style={{
                    borderTopColor: "rgb(251 191 36)",
                    borderRightColor: "rgb(56 189 248 / 0.4)",
                    animationDuration: "2s",
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-amber-300 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
                  <span className="relative inline-flex size-1.5">
                    <span className="bg-amber-400 absolute inset-0 rounded-full motion-safe:animate-ping motion-safe:opacity-75" />
                    <span className="bg-amber-400 relative inline-block size-1.5 rounded-full" />
                  </span>
                  {t("banner")}
                </p>
                <h1 className="text-2xl font-bold tracking-tight">
                  {visual.label}
                </h1>
                <p className="text-slate-300 text-sm">{t("loading")}</p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
