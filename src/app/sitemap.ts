import type { MetadataRoute } from "next";

const BASE = "https://parent-portal-nine.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/demo`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
