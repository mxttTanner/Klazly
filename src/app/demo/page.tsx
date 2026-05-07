"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";

export default function DemoPage() {
  const t = useTranslations("demo");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      // If somebody is already signed in (e.g. as a real teacher/parent), sign
      // them out first so the demo always starts clean.
      await supabase.auth.signOut();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
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
  }, [router, t]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-3 text-center">
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">{t("loading")}</p>
            <div
              aria-hidden
              className="border-muted-foreground/40 border-t-foreground mx-auto size-8 animate-spin rounded-full border-2"
            />
          </>
        )}
      </div>
    </main>
  );
}
