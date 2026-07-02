import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const SUPPORTED_LOCALES = ["vi", "en"] as const;
export const DEFAULT_LOCALE = "vi";
export const LOCALE_COOKIE = "locale";

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export async function readLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return value === "en" ? "en" : "vi";
}

export default getRequestConfig(async () => {
  const locale = await readLocale();
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
