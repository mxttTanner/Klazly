"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, SUPPORTED_LOCALES } from "@/i18n/request";

export async function setLocale(formData: FormData) {
  const value = String(formData.get("locale") ?? "");
  if (!SUPPORTED_LOCALES.includes(value as never)) return;

  cookies().set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  revalidatePath("/", "layout");
}
