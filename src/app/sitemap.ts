import type { MetadataRoute } from "next";
import { getDefaultRestaurant, getProducts } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.theindulgentspoon.in";
  const now = new Date();

  // 1. Static Canonical Public Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/full-menu`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/bulk-orders`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // 2. Dynamic Crawlable Product Pages
  try {
    const restaurant = await getDefaultRestaurant();
    const slug = restaurant?.slug || "the-indulgent-spoon";
    const products = restaurant ? await getProducts(restaurant.id) : [];

    const productRoutes: MetadataRoute.Sitemap = (products || [])
      .filter((p) => p.available !== false)
      .map((p) => ({
        url: `${baseUrl}/store/${slug}/product/${p.id}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));

    return [...staticRoutes, ...productRoutes];
  } catch (err) {
    console.error("Error generating sitemap products:", err);
    return staticRoutes;
  }
}
