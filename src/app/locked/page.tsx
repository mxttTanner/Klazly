import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Lock, Mail, MessageCircle, Phone } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ZALO_URL } from "@/lib/zalo";

export const dynamic = "force-dynamic";

/**
 * Lock screen for centers whose trial has expired or whose
 * subscription was cancelled past the grace period. requireUser()
 * redirects here instead of letting the authed page render.
 *
 * The user is *still logged into Supabase Auth* — we don't sign them
 * out, because we want them to be able to flip back to their
 * dashboard the moment the super-admin reactivates them. So this is
 * a "soft" lock: their data stays intact, they just can't see it
 * until the center is reactivated.
 *
 * All three contact channels (Zalo + phone + email) are present;
 * Zalo gets the largest visual weight per the VN-first pattern.
 */
export default async function LockedPage() {
  const t = await getTranslations("locked");
  const tLanding = await getTranslations("landing");

  return (
    <div className="min-h-dvh bg-slate-950 text-white">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LanguageToggle />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-4 py-12 sm:px-6">
        <Link
          href="/"
          className="mb-10 inline-flex items-center text-white"
          aria-label={tLanding("brandAriaLabel")}
        >
          <BrandLogo size="md" />
        </Link>

        <div className="bg-white/5 ring-white/10 w-full rounded-2xl p-6 backdrop-blur-sm ring-1 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white/10 ring-white/15 flex size-14 items-center justify-center rounded-full text-white ring-1">
              <Lock className="size-7" />
            </div>
            <h1 className="mt-5 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              {t("title")}
            </h1>
            <p className="text-slate-300 mt-3 max-w-md text-balance leading-relaxed">
              {t("subtitle")}
            </p>
            <p className="text-slate-400 mt-2 max-w-md text-balance text-sm leading-relaxed">
              {t("dataPreserved")}
            </p>
          </div>

          {/* Contact card — Zalo most prominent, QR + phone + email all
              visible without scrolling. */}
          <div className="border-white/10 mt-7 border-t pt-6">
            <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest">
              {t("contactLabel")}
            </p>

            <div className="mt-4 grid items-center gap-5 sm:grid-cols-[auto_1fr]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/zalo-qr.jpg"
                alt={tLanding("zaloQrAlt")}
                width={160}
                height={160}
                className="bg-white mx-auto h-[160px] w-[160px] rounded-xl object-contain p-2 shadow-lg sm:mx-0"
              />
              <div className="space-y-3">
                <a
                  href={ZALO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold shadow-sm transition"
                >
                  <MessageCircle className="size-4" />
                  {t("zaloButton")}
                </a>
                <div className="border-white/10 space-y-2 border-t pt-3 text-sm">
                  <a
                    href="tel:+84862404036"
                    className="text-slate-200 hover:text-white flex items-center gap-2"
                  >
                    <Phone className="size-4 text-slate-400" />
                    +84 86 240 4036
                  </a>
                  <a
                    href="mailto:matthewstadlers14@gmail.com"
                    className="text-slate-200 hover:text-white flex items-center gap-2 break-all"
                  >
                    <Mail className="size-4 text-slate-400" />
                    matthewstadlers14@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Soft "sign out" link — escape hatch if a wrong-center user
            is somehow stuck. Doesn't render unless we expect it. */}
        <form action="/logout" method="post" className="mt-6">
          <button
            type="submit"
            className="text-slate-400 hover:text-white text-xs underline-offset-4 hover:underline"
          >
            {t("signOut")}
          </button>
        </form>
      </div>
    </div>
  );
}
