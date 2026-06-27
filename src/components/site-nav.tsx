import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LanguageToggle } from "@/components/language-toggle";
import { BrandWordmark } from "@/components/brand-wordmark";
import { ZALO_URL } from "@/lib/zalo";

type NavKey = "features" | "pricing" | "demo" | "contact";

/**
 * Shared marketing-site nav — sticky translucent navy bar with the
 * Klazly wordmark, section links, VI/EN toggle, login link and the
 * emerald Zalo CTA. Used on the landing, pricing and demo pages so the
 * public surface stays one consistent theme.
 */
export async function SiteNav({ active }: { active?: NavKey }) {
  const t = await getTranslations("home");
  const links: { key: NavKey; href: string; label: string }[] = [
    { key: "features", href: "/#features", label: t("navFeatures") },
    { key: "pricing", href: "/pricing", label: t("navPricing") },
    { key: "demo", href: "/demo", label: t("navDemo") },
    { key: "contact", href: "/#contact", label: t("navContact") },
  ];
  return (
    <nav className="sticky top-0 z-50 border-b border-brand-line-dark bg-navy/95 backdrop-blur-md supports-[backdrop-filter]:bg-navy/85">
      <div className="mx-auto flex h-[66px] w-full max-w-[1180px] items-center gap-7 px-5 sm:px-7">
        <Link href="/" aria-label="Klazly">
          <BrandWordmark className="text-[23px]" />
        </Link>
        <div className="ml-3 hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              aria-current={l.key === active ? "page" : undefined}
              className={
                l.key === active
                  ? "text-sm font-semibold text-white"
                  : "text-sm text-brand-mut-2 transition hover:text-white"
              }
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <LanguageToggle />
          <Link
            href="/login"
            className="hidden text-sm text-brand-mut-2 transition hover:text-white sm:inline"
          >
            {t("navLogin")}
          </Link>
          <a
            href={ZALO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald px-[18px] py-[10px] text-[14px] font-bold text-[#06281f] transition hover:bg-emerald-light"
          >
            <MessageCircle className="size-4" />
            <span className="hidden sm:inline">{t("zaloCta")}</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
