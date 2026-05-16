import type { MetadataRoute } from "next";

/**
 * PWA manifest. Next generates /manifest.webmanifest from this file
 * automatically. Most-visible effect: when a user adds Klazly to
 * their Android home screen, the installed app uses these values
 * (name, short name, theme colour) instead of falling back to the
 * page title and a generic icon.
 *
 * Apple iOS reads <meta name="apple-mobile-web-app-title"> instead
 * (set via Metadata.appleWebApp in src/app/layout.tsx) — both paths
 * coexist so each platform sees the canonical name.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Klazly · Cổng Phụ Huynh",
    short_name: "Klazly",
    description: "Cổng Phụ Huynh cho trung tâm tiếng Anh tại Việt Nam.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    lang: "vi",
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
    ],
  };
}
