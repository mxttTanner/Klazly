import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const SUPPORTED_LOCALES = ["vi", "en"] as const;
export const DEFAULT_LOCALE = "vi";
export const LOCALE_COOKIE = "locale";

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function readLocale(): Locale {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return value === "en" ? "en" : "vi";
}

export default getRequestConfig(async () => {
  const locale = readLocale();
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
