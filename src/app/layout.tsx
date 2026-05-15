import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { ClarityScript } from "@/components/clarity-script";
import "./globals.css";

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
  const url = "https://parent-portal-nine.vercel.app";

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
          {children}
        </NextIntlClientProvider>
        <ClarityScript />
      </body>
    </html>
  );
}
