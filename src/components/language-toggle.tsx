import { getLocale, getTranslations } from "next-intl/server";
import { setLocale } from "@/app/actions/set-locale";

/**
 * Segmented locale toggle — VI | EN pills inside a rounded container.
 *
 * `tone="dark"` renders a translucent-dark track for placement on the
 * navy app bars / marketing nav (the default light track is for light
 * surfaces like the super-admin bar and the login form side).
 */
export async function LanguageToggle({
  tone = "light",
}: {
  tone?: "light" | "dark";
} = {}) {
  const locale = await getLocale();
  const t = await getTranslations("common");

  const track = tone === "dark" ? "bg-white/10" : "bg-muted/70";
  const activeCls =
    tone === "dark" ? "bg-white/20 text-white" : "bg-background text-foreground";
  const inactiveCls =
    tone === "dark"
      ? "text-brand-mut-2 hover:text-white"
      : "text-muted-foreground hover:text-foreground";

  const options = [
    { code: "vi", label: "VI" },
    { code: "en", label: "EN" },
  ] as const;

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={`${track} inline-flex items-center rounded-full p-0.5`}
    >
      {options.map((o) => {
        const active = locale === o.code;
        if (active) {
          return (
            <span
              key={o.code}
              aria-current="true"
              className={`${activeCls} inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold shadow-sm`}
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
              className={`${inactiveCls} inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium transition`}
            >
              {o.label}
            </button>
          </form>
        );
      })}
    </div>
  );
}
