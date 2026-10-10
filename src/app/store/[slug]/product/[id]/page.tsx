import {
  getRestaurantBySlug,
  getProductById,
  getProducts,
  getCategories,
  getDefaultRestaurant,
} from "@/lib/supabase/queries";
import type { Metadata } from "next";
import ProductDetailClient from "./ProductDetailClient";
import type { Product, Restaurant } from "@/types/database";

type Props = {
  params: Promise<{ slug: string; id: string }>;
};

const DEFAULT_FALLBACK_RESTAURANT: Restaurant = {
  id: "default-spoon-restaurant",
  owner_id: "default-owner",
  name: "The Indulgent Spoon",
  slug: "the-indulgent-spoon",
  description: "Handcrafted Artisanal Bakery & Patisserie",
  logo_url: "/logo-m.png",
  whatsapp_number: "9717123510",
  phone: "+91 9717123510",
  address: "Shop 4, Heritage Lane, Bandra West, Mumbai",
  delivery_enabled: true,
  takeaway_enabled: true,
  delivery_charge: 50,
  minimum_order: 250,
  is_open: true,
  opening_hours: "8:00 AM – 10:00 PM Daily",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  let dbProduct: Product | null = null;
  try {
    dbProduct = await getProductById(id);
  } catch {
    dbProduct = null;
  }

  const title = dbProduct?.name || "Artisanal Bakery Creation";
  const description = dbProduct?.description || "Order freshly prepared artisanal bakery creations online.";

  return {
    title: `${title} — The Indulgent Spoon`,
    description,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug, id } = await params;

  let restaurant: Restaurant | null = null;
  let dbProduct: Product | null = null;
  let otherProducts: Product[] = [];

  try {
    [restaurant, dbProduct] = await Promise.all([
      getRestaurantBySlug(slug),
      getProductById(id),
    ]);
  } catch {
    // If DB is offline or table empty, proceed with fallback
  }

  if (!restaurant) {
    try {
      restaurant = await getDefaultRestaurant();
    } catch {
      restaurant = null;
    }
    if (!restaurant) {
      restaurant = DEFAULT_FALLBACK_RESTAURANT;
    }
  }

  let product: Product | null = dbProduct;
  let badge: string | undefined = undefined;
  let categoryName = "Bakery";

  if (dbProduct) {
    product = dbProduct;
    badge = (dbProduct.badge as string) || undefined;
  } else {
    product = {
      id,
      restaurant_id: restaurant.id,
      category_id: null,
      name: "Bakery Item",
      description: "Artisanal bake prepared with premium ingredients.",
      price: 500,
      image_url:
        "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80",
      available: true,
      featured: true,
      sort_order: 0,
    };
  }

  // Fetch sibling products for recommendations and categories in parallel
  if (restaurant?.id) {
    try {
      const [all, categories] = await Promise.all([
        getProducts(restaurant.id),
        getCategories(restaurant.id),
      ]);
      otherProducts = all.filter((p) => p.id !== id).slice(0, 5);
      if (categories && product?.category_id) {
        const match = categories.find((c) => c.id === product?.category_id);
        if (match) categoryName = match.name;
      }
    } catch {
      otherProducts = [];
    }
  }

  return (
    <ProductDetailClient
      product={product}
      restaurant={restaurant}
      categoryName={categoryName}
      slug={slug}
      badge={badge}
      recommendedProducts={otherProducts}
    />
  );
}
