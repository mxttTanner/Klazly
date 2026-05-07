import { getLocale, getTranslations } from "next-intl/server";
import { setLocale } from "@/app/actions/set-locale";

export async function LanguageToggle() {
  const locale = await getLocale();
  const t = await getTranslations("common");
  const next = locale === "vi" ? "en" : "vi";
  const nextLabel = next === "vi" ? t("languageVi") : t("languageEn");

  return (
    <form action={setLocale}>
      <input type="hidden" name="locale" value={next} />
      <button
        type="submit"
        className="text-muted-foreground hover:text-foreground text-sm"
        aria-label={t("language")}
      >
        {nextLabel}
      </button>
    </form>
  );
}
