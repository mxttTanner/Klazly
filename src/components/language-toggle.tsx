import { getLocale, getTranslations } from "next-intl/server";
import { setLocale } from "@/app/actions/set-locale";

/**
 * Segmented locale toggle — VI | EN pills inside a single rounded
 * container. The active locale renders filled (white pill on muted
 * track), inactive is quiet text. Replaces the previous "click to
 * switch" plain link which was hard to spot in the topbar.
 */
export async function LanguageToggle() {
  const locale = await getLocale();
  const t = await getTranslations("common");

  const options = [
    { code: "vi", label: "VI" },
    { code: "en", label: "EN" },
  ] as const;

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="bg-muted/70 inline-flex items-center rounded-full p-0.5"
    >
      {options.map((o) => {
        const active = locale === o.code;
        if (active) {
          return (
            <span
              key={o.code}
              aria-current="true"
              className="bg-background text-foreground inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold shadow-sm"
            >
              {o.label}
            </span>
          );
        }
        return (
          <form key={o.code} action={setLocale}>
            <input type="hidden" name="locale" value={o.code} />
            <button
              type="submit"
              className="text-muted-foreground hover:text-foreground inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium transition"
            >
              {o.label}
            </button>
          </form>
        );
      })}
    </div>
  );
}
