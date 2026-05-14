import type { MetadataRoute } from "next";

/**
 * Tell crawlers what's safe to index. Landing + legal pages are crawlable;
 * everything role-gated (admin, teacher, parent dashboards) is not. The
 * disallow list isn't a security mechanism — those routes still require
 * auth — it just keeps them out of search results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/legal/", "/login", "/forgot-password", "/demo", "/pricing"],
      disallow: [
        "/admin",
        "/admin/",
        "/teacher",
        "/teacher/",
        "/parent",
        "/parent/",
        "/super-admin",
        "/super-admin/",
        "/post-login",
        "/reset-password",
        "/locked",
      ],
    },
    sitemap: "https://parent-portal-nine.vercel.app/sitemap.xml",
  };
}
