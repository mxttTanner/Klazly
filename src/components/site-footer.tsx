import Link from "next/link";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BrandWordmark } from "@/components/brand-wordmark";
import { ZALO_URL, ZALO_PHONE_DISPLAY } from "@/lib/zalo";

/**
 * Shared marketing-site footer — dark 4-column layout (brand /
 * product / resources / contact) with the new wordmark. Used across
 * the landing, pricing and demo pages.
 */
export async function SiteFooter() {
  const t = await getTranslations("home");
  return (
    <footer className="bg-[#0b1220] py-12 text-[13px] text-brand-mut">
      <div className="mx-auto w-full max-w-[1180px] px-5 sm:px-7">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <BrandWordmark className="text-[23px]" />
            <p className="mt-2.5 max-w-[260px] leading-[1.5] text-brand-mut">
              {t("footerDesc")}
            </p>
          </div>
          <div>
            <h4 className="mb-3.5 text-[13px] font-bold text-white">
              {t("footerProduct")}
            </h4>
            <FooterLink href="/#features">{t("navFeatures")}</FooterLink>
            <FooterLink href="/pricing">{t("navPricing")}</FooterLink>
            <FooterLink href="/demo">{t("navDemo")}</FooterLink>
            <FooterLink href="/login">{t("navLogin")}</FooterLink>
          </div>
          <div>
            <h4 className="mb-3.5 text-[13px] font-bold text-white">
              {t("footerResources")}
            </h4>
            <FooterLink href="/#contact">{t("footerSupport")}</FooterLink>
            <FooterLink href="/pricing">{t("footerGuide")}</FooterLink>
          </div>
          <div>
            <h4 className="mb-3.5 text-[13px] font-bold text-white">
              {t("footerContactHead")}
            </h4>
            <a
              href={ZALO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-2.5 flex items-center gap-2 transition hover:text-white"
            >
              <MessageCircle className="size-3.5" /> Zalo {ZALO_PHONE_DISPLAY}
            </a>
            <a
              href="mailto:matthewstadlers14@gmail.com"
              className="mb-2.5 flex items-center gap-2 transition hover:text-white"
            >
              <Mail className="size-3.5" /> matthewstadlers14@gmail.com
            </a>
            <span className="flex items-center gap-2">
              <MapPin className="size-3.5" /> {t("footerLocation")}
            </span>
          </div>
        </div>
        <div className="mt-9 flex flex-col items-start gap-3 border-t border-brand-line-dark pt-5 text-[12px] text-[#5b6b82] sm:flex-row sm:items-center sm:justify-between">
          <span>{t("footerCopyright")}</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/legal/terms" className="transition hover:text-white">
              {t("footerTerms")}
            </Link>
            <Link href="/legal/privacy" className="transition hover:text-white">
              {t("footerPrivacy")}
            </Link>
            <span>{t("footerMade")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="mb-2.5 block transition hover:text-white">
      {children}
    </Link>
  );
}
