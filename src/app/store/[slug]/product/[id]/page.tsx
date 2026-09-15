import {
  getRestaurantBySlug,
  getProductById,
  getCategories,
  getDefaultRestaurant,
} from "@/lib/supabase/queries";
import { MOCK_PRODUCTS } from "@/lib/products-data";
import { BAKERY_PRODUCTS, getBakeryProductDetail } from "@/lib/bakery-products";
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
  whatsapp_number: "919876543210",
  phone: "+91 98765 43210",
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
  const dbProduct = await getProductById(id);
  const bakeryProduct = BAKERY_PRODUCTS[id];
  const mockProduct = MOCK_PRODUCTS.find((m) => m.id === id);

  const title =
    dbProduct?.name ||
    bakeryProduct?.name ||
    mockProduct?.name ||
    "Artisanal Cake";

  const description =
    dbProduct?.description ||
    bakeryProduct?.subtitle ||
    mockProduct?.description ||
    "Order freshly prepared artisanal bakery creations online.";

  return {
    title: `${title} — The Indulgent Spoon`,
    description,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug, id } = await params;

  let restaurant: Restaurant | null = null;
  let dbProduct: Product | null = null;

  try {
    [restaurant, dbProduct] = await Promise.all([
      getRestaurantBySlug(slug),
      getProductById(id),
    ]);
  } catch {
    // If DB is offline or table empty, proceed with fallback
  }

  if (!restaurant) {
    restaurant = (await getDefaultRestaurant()) || DEFAULT_FALLBACK_RESTAURANT;
  }

  let product: Product | null = dbProduct;
  let badge: string | undefined = undefined;
  let categoryName = "Cakes";

  // Check BAKERY_PRODUCTS first (matches exact design in the image)
  const bakery = BAKERY_PRODUCTS[id];
  if (bakery) {
    product = {
      id: bakery.id,
      restaurant_id: restaurant.id,
      category_id: null,
      name: bakery.name,
      description: bakery.subtitle,
      price: bakery.price,
      image_url: bakery.mainImage,
      available: true,
      featured: true,
      sort_order: 0,
    };
    badge = bakery.badge;
    categoryName = bakery.category;
  } else if (!product) {
    const mock = MOCK_PRODUCTS.find((m) => m.id === id);
    if (mock) {
      product = {
        id: mock.id,
        restaurant_id: restaurant.id,
        category_id: null,
        name: mock.name,
        description: mock.description,
        price: mock.price,
        image_url: mock.image,
        available: true,
        featured: true,
        sort_order: 0,
      };
      badge = mock.badge;
      categoryName = mock.category;
    } else {
      // Dynamic fallback detail for any clicked item
      const dynamicDetail = getBakeryProductDetail(id);
      product = {
        id: dynamicDetail.id,
        restaurant_id: restaurant.id,
        category_id: null,
        name: dynamicDetail.name,
        description: dynamicDetail.subtitle,
        price: dynamicDetail.price,
        image_url: dynamicDetail.mainImage,
        available: true,
        featured: true,
        sort_order: 0,
      };
      badge = dynamicDetail.badge;
      categoryName = dynamicDetail.category;
    }
  }

  // If we have restaurant categories in DB, attempt lookup
  try {
    const categories = await getCategories(restaurant.id);
    if (categories && product.category_id) {
      const match = categories.find((c) => c.id === product?.category_id);
      if (match) categoryName = match.name;
    }
  } catch {
    // ignore
  }

  return (
    <ProductDetailClient
      product={product}
      restaurant={restaurant}
      categoryName={categoryName}
      slug={slug}
      badge={badge}
    />
  );
}
