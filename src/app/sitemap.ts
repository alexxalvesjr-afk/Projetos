import type { MetadataRoute } from "next";

import { db } from "@/lib/db";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Generated from live data, so a newly published vehicle is discoverable on the
 * next crawl and a sold one drops out of the index automatically.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The root now redirects to the sign-in screen, so it is deliberately absent:
  // listing a URL that 307s to a private page only wastes crawl budget. Only
  // the public storefronts belong in here.
  const entries: MetadataRoute.Sitemap = [];

  try {
    const stores = await db.organization.findMany({
      where: { websiteSettings: { published: true } },
      select: {
        slug: true,
        updatedAt: true,
        vehicles: {
          where: { published: true, status: { in: ["AVAILABLE", "RESERVED"] } },
          select: { slug: true, updatedAt: true },
        },
        pages: {
          where: { published: true },
          select: { slug: true, updatedAt: true },
        },
      },
    });

    for (const store of stores) {
      entries.push(
        {
          url: `${BASE}/loja/${store.slug}`,
          lastModified: store.updatedAt,
          changeFrequency: "daily",
          priority: 0.9,
        },
        {
          url: `${BASE}/loja/${store.slug}/estoque`,
          lastModified: store.updatedAt,
          changeFrequency: "daily",
          priority: 0.8,
        },
      );

      for (const vehicle of store.vehicles) {
        entries.push({
          url: `${BASE}/loja/${store.slug}/veiculo/${vehicle.slug}`,
          lastModified: vehicle.updatedAt,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }

      for (const page of store.pages) {
        entries.push({
          url: `${BASE}/loja/${store.slug}/${page.slug}`,
          lastModified: page.updatedAt,
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }
    }
  } catch (error) {
    // A database hiccup must not make the sitemap 500 and poison the crawl.
    console.error("[sitemap] failed to enumerate stores", error);
  }

  return entries;
}
