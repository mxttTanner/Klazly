import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { ClarityScript } from "@/components/clarity-script";
import { InAppBrowserHint } from "@/components/in-app-browser-hint";
import "./globals.css";

/**
 * Viewport + mobile chrome.
 *
 * - maximumScale stays >= 5 (and userScalable defaults to true) so the
 *   site remains pinch-zoomable. We never disable user scaling — it's
 *   an accessibility violation.
 * - themeColor tints the iOS Safari address bar and Android Chrome
 *   status bar so the chrome blends with our white surface; the dark
 *   variant matches the navy hero used on /login and /demo.
 * - viewportFit: "cover" tells iOS to extend layout into the safe
 *   area (notch + home indicator), which we then offset per-element
 *   via the pt-safe / pb-safe utilities defined in globals.css.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  const tLanding = await getTranslations("landing");
  const name = t("appName");
  const description = tLanding("tagline");
  // Canonical site URL. Reads from NEXT_PUBLIC_APP_URL so production,
  // preview, and local-dev each report the right origin in OG /
  // Twitter / metadataBase tags. Falls back to the live custom
  // domain for safety if the env var is missing.
  const url = process.env.NEXT_PUBLIC_APP_URL || "https://klazly.com";

  return {
    metadataBase: new URL(url),
    title: {
      default: name,
      template: `%s · ${name}`,
    },
    description,
    keywords: [
      "parent portal",
      "english center",
      "vietnam",
      "trung tâm tiếng anh",
      "cổng phụ huynh",
      "lesson report",
      "báo cáo phụ huynh",
    ],
    applicationName: name,
    authors: [{ name: "Matthew Stadler" }],
    icons: {
      icon: "/favicon.ico",
      // Next looks for src/app/apple-icon.png automatically — if a
      // PNG version of the brand mark is added there later, iOS Home
      // Screen install pulls it without further config. Until then
      // the SVG icon is the fallback.
      apple: "/icon.svg",
    },
    // Apple PWA hints. If a parent or center owner adds the site to
    // their iOS Home Screen, these meta tags make the launched
    // window feel like a real app (fullscreen, dark-content status
    // bar, branded title under the icon) instead of a Safari tab.
    appleWebApp: {
      capable: true,
      title: name,
      statusBarStyle: "default",
    },
    formatDetection: {
      // Disable iOS's auto-linkifying of phone numbers / emails — we
      // already render <a href="tel:…"> and <a href="mailto:…">
      // explicitly where it matters, and Safari's auto-detection
      // mangles Vietnamese phone-format strings inside other text.
      telephone: false,
      email: false,
      address: false,
    },
    // Cross-platform PWA capability flag. Chrome deprecated the
    // Apple-specific 'apple-mobile-web-app-capable' meta in favour
    // of 'mobile-web-app-capable'; Next's appleWebApp config only
    // emits the legacy Apple variant, so we add the standard one
    // here. Keeps the Apple flag too — older iOS Safari still
    // honours it.
    other: {
      "mobile-web-app-capable": "yes",
    },
    openGraph: {
      type: "website",
      url,
      title: name,
      description,
      siteName: name,
      locale: "vi_VN",
      alternateLocale: ["en_US"],
    },
    twitter: {
      card: "summary",
      title: name,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${beVietnamPro.variable} antialiased`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <InAppBrowserHint />
          {children}
        </NextIntlClientProvider>
        <ClarityScript />
      </body>
    </html>
  );
}
