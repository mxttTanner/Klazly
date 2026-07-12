"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserSquare2, GraduationCap, Heart } from "lucide-react";
import { type DemoRole } from "@/lib/demo";
import { signInAsDemo } from "./actions";
import { BrandLogo } from "@/components/brand-logo";

// Per-role identity is carried by icon + label only — no hue-coding.
// Labels come from the demo card titles so Vietnamese prospects don't
// see an English heading mid sign-in.
const ROLE_VISUAL: Record<
  DemoRole,
  { icon: typeof UserSquare2; labelKey: "roleAdminTitle" | "roleTeacherTitle" | "roleParentTitle" }
> = {
  admin: { icon: UserSquare2, labelKey: "roleAdminTitle" },
  teacher: { icon: GraduationCap, labelKey: "roleTeacherTitle" },
  parent: { icon: Heart, labelKey: "roleParentTitle" },
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
      // Server action: the session cookie is set server-side, so the
      // shared demo password never ships in the client bundle.
      const res = await signInAsDemo(role).catch(() => ({
        error: "signin failed",
      }));
      if (cancelled) return;
      if (res.error) {
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
    <div className="relative min-h-dvh bg-slate-950 text-white">
      {/* Minimal header with brand — gives the transition a stable
          chrome instead of going blank between click and redirect. */}
      <header className="relative">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            aria-label={tLanding("brandAriaLabel")}
            className="inline-flex text-white transition-opacity hover:opacity-80"
          >
            <BrandLogo size="md" />
          </Link>
        </div>
      </header>

      <main className="relative flex min-h-[calc(100dvh-5rem)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6 text-center">
          {error ? (
            <>
              <div className="bg-white/5 text-slate-300 ring-white/15 inline-flex size-16 items-center justify-center rounded-2xl ring-1">
                <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="text-slate-300 text-sm font-medium" role="alert">
                {error}
              </p>
              <Link
                href="/demo"
                className="border-white/20 bg-white/5 hover:bg-white/10 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
              >
                {t("backHome")}
              </Link>
            </>
          ) : (
            <>
              {/* Role badge with a quiet spinner ring while we sign in. */}
              <div className="relative mx-auto inline-flex">
                <div className="bg-white/5 ring-white/15 relative inline-flex size-20 items-center justify-center rounded-2xl ring-1">
                  <Icon className="text-slate-200 size-9" />
                </div>
                <div
                  aria-hidden
                  className="border-white/15 border-t-white/70 absolute -inset-2 rounded-2xl border-2 motion-safe:animate-spin"
                  style={{ animationDuration: "1.2s" }}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
                  {t("banner")}
                </p>
                <h1 className="text-2xl font-bold tracking-tight">
                  {t(visual.labelKey)}
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
