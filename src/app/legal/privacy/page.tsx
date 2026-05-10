import { getTranslations } from "next-intl/server";

export default async function PrivacyPage() {
  const t = await getTranslations("legal.privacy");

  return (
    <article className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground mt-1 text-sm">{t("effective")}</p>

      <p className="mt-6 leading-relaxed">{t("intro")}</p>

      <h2 className="mt-8 text-xl font-semibold">{t("whoTitle")}</h2>
      <p className="leading-relaxed">{t("whoBody")}</p>

      <h2 className="mt-6 text-xl font-semibold">{t("dataTitle")}</h2>
      <p className="leading-relaxed">{t("dataBody")}</p>

      <h2 className="mt-6 text-xl font-semibold">{t("useTitle")}</h2>
      <p className="leading-relaxed">{t("useBody")}</p>

      <h2 className="mt-6 text-xl font-semibold">{t("shareTitle")}</h2>
      <p className="leading-relaxed">{t("shareBody")}</p>

      <h2 className="mt-6 text-xl font-semibold">{t("retentionTitle")}</h2>
      <p className="leading-relaxed">{t("retentionBody")}</p>

      <h2 className="mt-6 text-xl font-semibold">{t("rightsTitle")}</h2>
      <p className="leading-relaxed">{t("rightsBody")}</p>

      <h2 className="mt-6 text-xl font-semibold">{t("securityTitle")}</h2>
      <p className="leading-relaxed">{t("securityBody")}</p>

      <h2 className="mt-6 text-xl font-semibold">{t("childrenTitle")}</h2>
      <p className="leading-relaxed">{t("childrenBody")}</p>

      <p className="text-muted-foreground mt-10 text-sm">{t("contact")}</p>
    </article>
  );
}
