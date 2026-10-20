import { NextRequest, NextResponse } from "next/server";
import { getDefaultRestaurant, getCategories, getProducts } from "@/lib/supabase/queries";
import { getProductDiscount } from "@/lib/discount";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    const restaurant = await getDefaultRestaurant();
    if (!restaurant) {
      return NextResponse.json({ results: [] });
    }

    const [categories, products] = await Promise.all([
      getCategories(restaurant.id),
      getProducts(restaurant.id),
    ]);

    const catMap = new Map<string, string>();
    for (const c of categories) {
      catMap.set(c.id, c.name);
    }

    const restaurantSlug = restaurant.slug || "the-indulgent-spoon";

    // When query is empty, return top featured / bestsellers for instant suggestions
    if (!q) {
      const popular = products.filter((p) => p.featured).slice(0, 8);
      const items = (popular.length > 0 ? popular : products.slice(0, 8)).map((p) => {
        const disc = getProductDiscount(p);
        const pGallery = Array.isArray(p.gallery_images) ? p.gallery_images : [];
        return {
          id: p.id,
          name: p.name,
          categoryName: (p.category_id && catMap.get(p.category_id)) || "Artisanal Bakery",
          price: disc.discountedPrice,
          originalPrice: disc.originalPrice,
          hasDiscount: disc.hasDiscount,
          imageUrl: p.image_url || (pGallery.length > 0 ? pGallery[0] : "") || "",
          slug: restaurantSlug,
          description: p.description || "",
        };
      });

      return NextResponse.json({ results: items, total: items.length });
    }

    const tokens = q.split(/\s+/).filter(Boolean);

    const matched = products.filter((p) => {
      const pName = p.name.toLowerCase();
      const pDesc = (p.description || "").toLowerCase();
      const pCat = ((p.category_id && catMap.get(p.category_id)) || "").toLowerCase();
      const pTags = Array.isArray(p.tags) ? p.tags.join(" ").toLowerCase() : "";
      const pStory = (p.story_text || "").toLowerCase();
      const combined = `${pName} ${pDesc} ${pCat} ${pTags} ${pStory}`;

      return tokens.every((token) => combined.includes(token));
    });

    const results = matched.slice(0, 20).map((p) => {
      const disc = getProductDiscount(p);
      const pGallery = Array.isArray(p.gallery_images) ? p.gallery_images : [];
      return {
        id: p.id,
        name: p.name,
        categoryName: (p.category_id && catMap.get(p.category_id)) || "Artisanal Bakery",
        price: disc.discountedPrice,
        originalPrice: disc.originalPrice,
        hasDiscount: disc.hasDiscount,
        imageUrl: p.image_url || (pGallery.length > 0 ? pGallery[0] : "") || "",
        slug: restaurantSlug,
        description: p.description || "",
      };
    });

    return NextResponse.json({ results, total: matched.length });
  } catch (error) {
    console.error("Error handling search request:", error);
    return NextResponse.json({ results: [], error: "Search failed" }, { status: 500 });
  }
}
