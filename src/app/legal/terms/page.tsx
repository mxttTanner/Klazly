import { getTranslations } from "next-intl/server";

export default async function TermsPage() {
  const t = await getTranslations("legal.terms");

  return (
    <article className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground mt-1 text-sm">{t("effective")}</p>

      {/* Founder transparency note — kept near the top so the
          honest framing colours how readers approach the rest. */}
      <h2 className="mt-8 text-xl font-semibold">{t("smallOpTitle")}</h2>
      <p className="leading-relaxed">{t("smallOpBody")}</p>

      <p className="mt-6 leading-relaxed">{t("intro")}</p>

      <h2 className="mt-8 text-xl font-semibold">{t("serviceTitle")}</h2>
      <p className="leading-relaxed">{t("serviceBody")}</p>

      <h2 className="mt-6 text-xl font-semibold">{t("payTitle")}</h2>
      <p className="leading-relaxed">{t("payBody")}</p>

      <h2 className="mt-6 text-xl font-semibold">{t("refundTitle")}</h2>
      <p className="leading-relaxed">{t("refundBody")}</p>

      <h2 className="mt-6 text-xl font-semibold">{t("subTitle")}</h2>
      <p className="leading-relaxed">{t("subBody")}</p>

      <h2 className="mt-6 text-xl font-semibold">{t("dataTitle")}</h2>
      <p className="leading-relaxed">{t("dataBody")}</p>

      <h2 className="mt-6 text-xl font-semibold">{t("licenseTitle")}</h2>
      <p className="leading-relaxed">{t("licenseBody")}</p>

      <h2 className="mt-6 text-xl font-semibold">{t("termTitle")}</h2>
      <p className="leading-relaxed">{t("termBody")}</p>

      <h2 className="mt-6 text-xl font-semibold">{t("supportTitle")}</h2>
      <p className="leading-relaxed">{t("supportBody")}</p>

      <h2 className="mt-6 text-xl font-semibold">{t("warrantyTitle")}</h2>
      <p className="leading-relaxed">{t("warrantyBody")}</p>

      <h2 className="mt-6 text-xl font-semibold">{t("lawTitle")}</h2>
      <p className="leading-relaxed">{t("lawBody")}</p>

      <p className="text-muted-foreground mt-10 text-sm">{t("contact")}</p>
    </article>
  );
}
