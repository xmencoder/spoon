import { createClient } from "./server";
import type {
  Restaurant,
  Category,
  Product,
  Order,
  OrderItem,
  OrderStatus,
} from "@/types/database";

/**
 * Fetch restaurant details by its unique slug
 */
export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return null;
  }
  return data as Restaurant;
}

/**
 * Fetch default restaurant (fallback by slug or first restaurant)
 */
export async function getDefaultRestaurant(): Promise<Restaurant | null> {
  const supabase = await createClient();
  const defaultSlug =
    process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG || "the-indulgent-spoon";

  const { data: match } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", defaultSlug)
    .maybeSingle();

  if (match) return match as Restaurant;

  const { data: first } = await supabase
    .from("restaurants")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (first as Restaurant) || null;
}

/**
 * Fetch all categories for a restaurant, ordered by sort_order
 */
export async function getCategories(restaurantId: string): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return [];
  }
  return data as Category[];
}

/**
 * Fetch products for a restaurant, optionally filtered by category
 */
export async function getProducts(
  restaurantId: string,
  categoryId?: string
): Promise<Product[]> {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  if (categoryId && categoryId !== "all") {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }
  return data as Product[];
}

/**
 * Fetch a single product by ID
 */
export async function getProductById(productId: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error || !data) {
    return null;
  }
  return data as Product;
}

/**
 * Fetch orders for a restaurant (protected for owners via RLS)
 */
export async function getRestaurantOrders(restaurantId: string): Promise<Order[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }
  return data as Order[];
}

/**
 * Fetch items for a specific order
 */
export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  if (error || !data) {
    return [];
  }
  return data as OrderItem[];
}
