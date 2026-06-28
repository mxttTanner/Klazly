import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Check, Mail, MapPin, MessageCircle, X } from "lucide-react";
import { getCurrentUser, dashboardPathFor } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/super-admin";
import { LanguageToggle } from "@/components/language-toggle";
import { PricingCtaButton } from "@/components/pricing-cta-button";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ZALO_URL, ZALO_PHONE_DISPLAY } from "@/lib/zalo";

/**
 * Marketing landing page — navy + emerald + amber redesign.
 *
 * Restyled to match Klazly-Site-Redesign-Reference: a clean modern
 * SaaS look built on the centrally-defined brand tokens (navy / emerald
 * / amber, see globals.css). Structure mirrors the reference homepage:
 *   1. Sticky translucent navy nav
 *   2. Dark hero (radial emerald glow) + composed product shot
 *   3. Stats strip (navy-2 band, emerald numerals)
 *   4. Three role cards (dark image wells)
 *   5. PDF report feature (dark, amber glow)
 *   6. Before / after
 *   7. Founder note
 *   8. Pricing (1-năm card highlighted)
 *   9. Final CTA (dark, emerald glow)
 *  10. Footer
 *
 * Copy lives in the `home` i18n namespace (VI default + EN). Product
 * screenshots in the image wells are lightweight on-brand mockups for
 * now — to be swapped for real captures of the live UI.
 */

const WRAP = "mx-auto w-full max-w-[1180px] px-5 sm:px-7";
const BTN_EM =
  "inline-flex items-center justify-center gap-2 rounded-full bg-emerald px-[22px] py-[13px] text-[15px] font-bold text-[#06281f] shadow-sm transition hover:bg-emerald-light";
const BTN_GHOST =
  "inline-flex items-center justify-center gap-2 rounded-full border border-[#2a405e] bg-white/[0.06] px-[22px] py-[13px] text-[15px] font-bold text-white transition hover:bg-white/[0.12]";
const KICKER =
  "text-[11px] font-extrabold uppercase tracking-[1px] text-brand-slate";

export default async function HomePage() {
  // Logged-in users get bounced to their portal — the bare domain
  // should feel like the app for them, not the marketing site.
  const user = await getCurrentUser();
  if (user) {
    if (isSuperAdminEmail(user.email)) redirect("/super-admin");
    redirect(dashboardPathFor(user.role));
  }

  const t = await getTranslations("home");

  const navLinks = [
    { href: "#features", label: t("navFeatures") },
    { href: "/pricing", label: t("navPricing") },
    { href: "/demo", label: t("navDemo") },
    { href: "#contact", label: t("navContact") },
  ];

  const stats = [
    { n: t("stat1Num"), l: t("stat1Label") },
    { n: t("stat2Num"), l: t("stat2Label") },
    { n: t("stat3Num"), l: t("stat3Label") },
    { n: t("stat4Num"), l: t("stat4Label") },
  ];

  const roles = [
    { n: 1, title: t("role1Title"), body: t("role1Body"), shot: "/shots/admin.png" },
    { n: 2, title: t("role2Title"), body: t("role2Body"), shot: "/shots/teacher.png" },
    { n: 3, title: t("role3Title"), body: t("role3Body"), shot: "/shots/parent.png" },
  ];

  const pdfItems = [t("pdfItem1"), t("pdfItem2"), t("pdfItem3"), t("pdfItem4")];
  const beforeItems = [
    t("before1"),
    t("before2"),
    t("before3"),
    t("before4"),
    t("before5"),
  ];
  const afterItems = [
    t("after1"),
    t("after2"),
    t("after3"),
    t("after4"),
    t("after5"),
  ];

  return (
    <div className="bg-white text-ink">
      {/* ---------- NAV ---------- */}
      <nav className="sticky top-0 z-50 border-b border-brand-line-dark bg-navy/95 backdrop-blur-md supports-[backdrop-filter]:bg-navy/85">
        <div className={`${WRAP} flex h-[66px] items-center gap-7`}>
          <Wordmark className="text-[23px]" />
          <div className="ml-3 hidden items-center gap-6 md:flex">
            {navLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-sm text-brand-mut-2 transition hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3 sm:gap-3.5">
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
              className={`${BTN_EM} px-[18px] py-[10px] text-[14px]`}
            >
              <MessageCircle className="size-4" />
              <span className="hidden sm:inline">{t("zaloCta")}</span>
            </a>
          </div>
        </div>
      </nav>

      {/* ---------- HERO ---------- */}
      <header className="relative overflow-hidden bg-[radial-gradient(120%_120%_at_85%_0%,#16304a_0%,#0f172a_55%)] py-16 text-white sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-52 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,.16),transparent_70%)]"
        />
        <div
          className={`${WRAP} relative grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]`}
        >
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald/[0.12] px-3.5 py-1.5 text-[12px] font-bold tracking-wide text-emerald-light">
              <span className="size-[7px] rounded-full bg-emerald-light shadow-[0_0_0_3px_rgba(16,185,129,.25)]" />
              {t("heroPill")}
            </span>
            <h1 className="mt-4 text-[34px] font-black leading-[1.06] tracking-[-1px] sm:text-[44px] lg:text-[50px]">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 max-w-[540px] text-[17px] leading-[1.5] text-brand-mut-2 sm:text-[18px]">
              {t("heroLead")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={ZALO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={BTN_EM}
              >
                {t("zaloCta")} <ArrowRight className="size-4" />
              </a>
              <Link href="/demo" className={BTN_GHOST}>
                {t("heroCtaDemo")}
              </Link>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-3">
              {[t("trust1"), t("trust2"), t("trust3"), t("trust4")].map((s) => (
                <li
                  key={s}
                  className="flex items-center gap-1.5 text-[13px] text-brand-mut"
                >
                  <Check className="size-3.5 text-emerald-light" strokeWidth={3} />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Composed product shot: dashboard frame + overlapping phone */}
          <div className="relative mx-auto w-full max-w-[480px] pb-10 lg:pb-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/shots/admin.png"
              alt={t("imgWellAlt")}
              loading="eager"
              fetchPriority="high"
              className="w-full rounded-2xl border border-[#243a57] shadow-[0_30px_70px_rgba(0,0,0,.55)]"
            />
            <div className="absolute -bottom-2 -right-2 w-[120px] sm:w-[140px] lg:-bottom-8 lg:-right-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/shots/parent.png"
                alt={t("imgWellAlt")}
                loading="eager"
                className="w-full rounded-[22px] shadow-[0_24px_50px_rgba(0,0,0,.6)]"
              />
            </div>
          </div>
        </div>
      </header>

      {/* ---------- STATS ---------- */}
      <section className="border-y border-brand-line-dark bg-navy-2">
        <div className={`${WRAP} grid grid-cols-2 lg:grid-cols-4`}>
          {stats.map((s, i) => (
            <div
              key={s.l}
              className={`px-6 py-8 text-center ${
                i < stats.length - 1 ? "lg:border-r lg:border-brand-line-dark" : ""
              } ${i % 2 === 0 ? "border-r border-brand-line-dark lg:border-r" : ""} ${
                i < 2 ? "border-b border-brand-line-dark lg:border-b-0" : ""
              }`}
            >
              <div className="text-[28px] font-black text-emerald-light sm:text-[32px]">
                {s.n}
              </div>
              <div className="mt-1.5 text-[13px] text-brand-mut">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- ROLES ---------- */}
      <section id="features" className="bg-brand-light py-16 sm:py-20">
        <div className={WRAP}>
          <ScrollReveal className="text-center">
            <span className={KICKER}>{t("rolesKicker")}</span>
            <h2 className="mt-2 text-[28px] font-black leading-[1.12] tracking-[-0.5px] text-navy sm:text-[34px]">
              {t("rolesTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-[620px] text-[16px] text-brand-slate">
              {t("rolesSub")}
            </p>
          </ScrollReveal>
          <div className="mt-10 grid gap-5 sm:mt-11 md:grid-cols-3">
            {roles.map((r) => (
              <ScrollReveal
                key={r.n}
                delay={(r.n - 1) * 90}
                className="overflow-hidden rounded-2xl border border-brand-line bg-white shadow-[0_10px_30px_rgba(15,23,42,.06)]"
              >
                <div className="bg-navy p-[18px]">
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.shot}
                      alt={r.title}
                      loading="lazy"
                      className="size-full object-contain"
                    />
                  </div>
                </div>
                <div className="px-6 pb-7 pt-6">
                  <span className="inline-flex size-8 items-center justify-center rounded-[9px] bg-navy text-[15px] font-extrabold text-emerald-light">
                    {r.n}
                  </span>
                  <h3 className="mb-2 mt-3.5 text-[19px] font-extrabold text-navy">
                    {r.title}
                  </h3>
                  <p className="text-[14px] leading-[1.5] text-brand-slate">
                    {r.body}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- PDF FEATURE (dark, amber glow) ---------- */}
      <section className="relative overflow-hidden bg-navy py-20 text-white sm:py-[84px]">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-44 size-[460px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,.1),transparent_70%)]"
        />
        <div
          className={`${WRAP} relative grid items-center gap-10 lg:grid-cols-[.9fr_1.1fr] lg:gap-[50px]`}
        >
          <div className="order-2 mx-auto w-[78%] min-w-[230px] lg:order-1 lg:w-[78%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/shots/pdf.png"
              alt={t("imgWellAlt")}
              loading="lazy"
              className="w-full rounded-[14px] shadow-[0_30px_60px_rgba(0,0,0,.5)]"
            />
          </div>
          <div className="order-1 lg:order-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-amber/[0.14] px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-wide text-amber-light">
              {t("pdfPill")}
            </span>
            <h2 className="mt-3.5 text-[26px] font-black leading-[1.15] tracking-[-0.5px] sm:text-[32px]">
              {t("pdfTitle")}
            </h2>
            <p className="mt-4 text-[16px] leading-[1.55] text-brand-mut-2">
              {t("pdfLead")}
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {pdfItems.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-[14.5px] text-brand-mut-2"
                >
                  <span className="mt-0.5 inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-emerald/[0.16] text-emerald-light">
                    <Check className="size-3" strokeWidth={3.5} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- BEFORE / AFTER ---------- */}
      <section className="bg-white py-16 sm:py-20">
        <div className={WRAP}>
          <ScrollReveal className="text-center">
            <span className={KICKER}>{t("baKicker")}</span>
            <h2 className="mt-2 text-[28px] font-black leading-[1.12] tracking-[-0.5px] text-navy sm:text-[34px]">
              {t("baTitle")}
            </h2>
          </ScrollReveal>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <ScrollReveal className="rounded-2xl border border-brand-line bg-white p-7">
              <h3 className="mb-4 text-[18px] font-extrabold text-amber">
                {t("beforeTitle")}
              </h3>
              <ul className="flex flex-col gap-3.5">
                {beforeItems.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-[14px] leading-[1.45] text-[#6b5440]"
                  >
                    <X className="mt-0.5 size-4 shrink-0 text-[#dc8a3a]" strokeWidth={3} />
                    {item}
                  </li>
                ))}
              </ul>
            </ScrollReveal>
            <ScrollReveal
              delay={90}
              className="rounded-2xl bg-navy p-7 text-white"
            >
              <h3 className="mb-4 text-[18px] font-extrabold text-emerald-light">
                {t("afterTitle")}
              </h3>
              <ul className="flex flex-col gap-3.5">
                {afterItems.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-[14px] leading-[1.45] text-brand-mut-2"
                  >
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-emerald-light"
                      strokeWidth={3}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ---------- FOUNDER ---------- */}
      <section className="bg-brand-light py-16 sm:py-20">
        <div className={WRAP}>
          <ScrollReveal className="grid items-center gap-6 rounded-2xl border border-brand-line bg-white p-7 shadow-[0_10px_30px_rgba(15,23,42,.06)] sm:grid-cols-[auto_1fr] sm:p-[30px]">
            <div className="flex size-[84px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#10b981,#0ea5a4)] text-[32px] font-black text-[#06281f]">
              M
            </div>
            <div>
              <p className="text-[16px] italic leading-[1.55] text-ink">
                {t("founderQuote")}
              </p>
              <p className="mt-3 text-[14px] font-extrabold text-navy">
                {t("founderName")}
              </p>
              <p className="text-[13px] text-brand-slate">{t("founderRole")}</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ---------- PRICING ---------- */}
      <section id="pricing" className="bg-white py-16 sm:py-20">
        <div className={WRAP}>
          <ScrollReveal className="text-center">
            <span className={KICKER}>{t("pricingKicker")}</span>
            <h2 className="mt-2 text-[28px] font-black leading-[1.12] tracking-[-0.5px] text-navy sm:text-[34px]">
              {t("pricingTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-[620px] text-[16px] text-brand-slate">
              {t("pricingSub")}
            </p>
          </ScrollReveal>

          <div className="mt-11 grid gap-5 md:grid-cols-3">
            {/* 1 month */}
            <PriceCard
              name={t("priceMicroName")}
              amount={t("priceMicroAmt")}
              per={t("priceMicroPer")}
              desc={t("priceMicroDesc")}
              planKey="micro"
            />
            {/* 6 months */}
            <PriceCard
              name={t("price6Name")}
              amount={t("price6Amt")}
              per={t("price6Per")}
              save={t("price6Save")}
              desc={t("price6Desc")}
              planKey="monthly"
            />
            {/* 1 year — highlighted */}
            <PriceCard
              name={t("priceYearName")}
              amount={t("priceYearAmt")}
              per={t("priceYearPer")}
              save={t("priceYearSave")}
              desc={t("priceYearDesc")}
              planKey="annual"
              highlighted
            />
          </div>

          <p className="mt-7 text-center text-[13px] leading-relaxed text-brand-slate">
            <b className="text-navy">{t("pricingIncludesLabel")}</b>{" "}
            {t("pricingIncludesRest")}
          </p>
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section
        id="contact"
        className="relative overflow-hidden bg-navy py-16 text-center text-white sm:py-20"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 -top-64 size-[500px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,.16),transparent_70%)]"
        />
        <div className={`${WRAP} relative`}>
          <h2 className="text-[30px] font-black tracking-[-0.7px] sm:text-[38px]">
            {t("ctaTitle")}
          </h2>
          <p className="mx-auto mt-3.5 max-w-[520px] text-[16px] text-brand-mut-2">
            {t("ctaSub")}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a
              href={ZALO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={BTN_EM}
            >
              {t("zaloCta")} <ArrowRight className="size-4" />
            </a>
            <Link href="/demo" className={BTN_GHOST}>
              {t("ctaDemo")}
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="bg-[#0b1220] py-12 text-[13px] text-brand-mut">
        <div className={WRAP}>
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Wordmark className="text-[23px]" />
              <p className="mt-2.5 max-w-[260px] leading-[1.5] text-brand-mut">
                {t("footerDesc")}
              </p>
            </div>
            <FooterCol title={t("footerProduct")}>
              <FooterLink href="#features">{t("navFeatures")}</FooterLink>
              <FooterLink href="/pricing">{t("navPricing")}</FooterLink>
              <FooterLink href="/demo">{t("navDemo")}</FooterLink>
              <FooterLink href="/login">{t("navLogin")}</FooterLink>
            </FooterCol>
            <FooterCol title={t("footerResources")}>
              <FooterLink href="#contact">{t("footerSupport")}</FooterLink>
              <FooterLink href="/pricing">{t("footerGuide")}</FooterLink>
            </FooterCol>
            <FooterCol title={t("footerContactHead")}>
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
            </FooterCol>
          </div>
          <div className="mt-9 flex flex-col items-start justify-between gap-2 border-t border-brand-line-dark pt-5 text-[12px] text-[#5b6b82] sm:flex-row sm:items-center">
            <span>{t("footerCopyright")}</span>
            <span>{t("footerMade")} 🇻🇳</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ============================ helpers ============================ */

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-black tracking-[-0.5px] text-white ${className}`}
    >
      Klaz<span className="text-emerald-light">ly</span>
    </span>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-3.5 text-[13px] font-bold text-white">{title}</h4>
      {children}
    </div>
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
    <Link
      href={href}
      className="mb-2.5 block transition hover:text-white"
    >
      {children}
    </Link>
  );
}

function PriceCard({
  name,
  amount,
  per,
  save,
  desc,
  planKey,
  highlighted = false,
}: {
  name: string;
  amount: string;
  per: string;
  save?: string;
  desc: string;
  planKey: "micro" | "monthly" | "annual";
  highlighted?: boolean;
}) {
  return (
    <div
      className={
        highlighted
          ? "relative rounded-[18px] bg-navy p-7 text-white shadow-[0_22px_50px_rgba(15,23,42,.25)]"
          : "relative rounded-[18px] border border-brand-line bg-white p-7"
      }
    >
      <div
        className={`text-[12px] font-extrabold uppercase tracking-[1.2px] ${
          highlighted ? "text-brand-mut" : "text-brand-slate"
        }`}
      >
        {name}
      </div>
      <div
        className={`mt-2.5 text-[34px] font-black ${highlighted ? "text-white" : "text-navy"}`}
      >
        {amount}
      </div>
      <div className={`text-[13px] ${highlighted ? "text-brand-mut" : "text-brand-slate"}`}>
        {per}
      </div>
      {save ? (
        <span
          className={`mt-3 inline-block rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
            highlighted
              ? "bg-emerald-light text-[#06281f]"
              : "bg-[#d9f7ec] text-emerald-dark"
          }`}
        >
          {save}
        </span>
      ) : null}
      <p
        className={`mt-3.5 text-[13px] leading-[1.45] ${
          highlighted ? "text-brand-mut-2" : "text-brand-slate"
        }`}
      >
        {desc}
      </p>
      <PricingCtaButton
        planKey={planKey}
        buttonClassName={`mt-5 block w-full rounded-[24px] px-3 py-3 text-center text-[14px] font-extrabold transition ${
          highlighted
            ? "bg-emerald text-[#06281f] hover:bg-emerald-light"
            : "bg-[#eef2f7] text-navy hover:bg-[#e2e8f2]"
        }`}
      />
    </div>
  );
}
