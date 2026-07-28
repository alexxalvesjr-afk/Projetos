import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/loja/"],
      // The authenticated application holds commercial data and must never be
      // indexed, regardless of any accidental public link.
      disallow: [
        "/api/",
        "/dashboard",
        "/inventory",
        "/crm",
        "/agenda",
        "/goals",
        "/reports",
        "/marketing",
        "/users",
        "/settings",
        "/cms",
        "/login",
        "/register",
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
