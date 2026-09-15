import { createClient } from "@/lib/supabase/client";
import { uploadProductImage, deleteProductImage } from "@/lib/supabase/storage";
import type {
  Restaurant,
  Category,
  Product,
  Order,
  OrderStatus,
} from "@/types/database";

export interface DashboardMetrics {
  todaysOrdersCount: number;
  todaysSalesTotal: number;
  totalProductsCount: number;
  availableProductsCount: number;
  isOpen: boolean;
}

/**
 * Get or provision the current restaurant for the admin user
 */
export async function getOrCreateAdminRestaurant(): Promise<Restaurant | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const defaultSlug =
    process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG || "the-indulgent-spoon";

  // If user is authenticated, query for owner_id or default slug in one call
  if (user) {
    const { data: restaurants } = await supabase
      .from("restaurants")
      .select("*")
      .or(`owner_id.eq.${user.id},slug.eq.${defaultSlug}`)
      .limit(2);

    if (restaurants && restaurants.length > 0) {
      const owned = restaurants.find((r) => r.owner_id === user.id);
      return (owned || restaurants[0]) as Restaurant;
    }

    // Auto-provision a default restaurant for newly registered admin
    const { data: newRestaurant, error: createError } = await supabase
      .from("restaurants")
      .insert({
        owner_id: user.id,
        name: "The Indulgent Spoon",
        slug: defaultSlug,
        whatsapp_number: "+919876543210",
        phone: "+919876543210",
        address: "Sector 14, Rewari, Haryana",
        description: "Artisanal cloud kitchen & bakery.",
        delivery_enabled: true,
        takeaway_enabled: true,
        delivery_charge: 40,
        minimum_order: 150,
        is_open: true,
      })
      .select()
      .single();

    if (!createError && newRestaurant) {
      return newRestaurant as Restaurant;
    }
  }

  // Fallback / Public read for demo or initial configuration
  const { data: fallback } = await supabase
    .from("restaurants")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (fallback as Restaurant) || null;
}

/**
 * Fetch dashboard overview metrics
 */
export async function getDashboardMetrics(
  restaurantId: string
): Promise<DashboardMetrics> {
  const supabase = createClient();

  // 1. Fetch restaurant status
  const { data: restData } = await supabase
    .from("restaurants")
    .select("is_open")
    .eq("id", restaurantId)
    .single();

  // 2. Fetch products counts
  const { data: products } = await supabase
    .from("products")
    .select("id, available")
    .eq("restaurant_id", restaurantId);

  const totalProducts = products?.length || 0;
  const availableProducts =
    products?.filter((p) => p.available === true).length || 0;

  // 3. Fetch today's orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, total, status, created_at")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", todayIso);

  const todaysOrdersCount = orders?.length || 0;
  const todaysSalesTotal =
    orders?.reduce((acc, curr) => acc + Number(curr.total || 0), 0) || 0;

  return {
    todaysOrdersCount,
    todaysSalesTotal,
    totalProductsCount: totalProducts,
    availableProductsCount: availableProducts,
    isOpen: restData?.is_open ?? true,
  };
}

/**
 * Fetch all categories for a restaurant
 */
export async function getAdminCategories(
  restaurantId: string
): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data as Category[]) || [];
}

/**
 * Create a new category
 */
export async function createAdminCategory(
  restaurantId: string,
  name: string
): Promise<Category> {
  const supabase = createClient();
  
  // Get max sort_order
  const { data: existing } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextSort = (existing?.[0]?.sort_order || 0) + 1;

  const { data, error } = await supabase
    .from("categories")
    .insert({
      restaurant_id: restaurantId,
      name: name.trim(),
      sort_order: nextSort,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

/**
 * Rename/Update category
 */
export async function updateAdminCategory(
  categoryId: string,
  updates: Partial<Category>
): Promise<Category> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", categoryId)
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

/**
 * Delete a category
 */
export async function deleteAdminCategory(categoryId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (error) throw error;
}

/**
 * Reorder categories in bulk
 */
export async function reorderAdminCategories(
  orderedCategories: { id: string; sort_order: number }[]
): Promise<void> {
  const supabase = createClient();
  
  const updates = orderedCategories.map((cat) =>
    supabase
      .from("categories")
      .update({ sort_order: cat.sort_order })
      .eq("id", cat.id)
  );

  await Promise.all(updates);
}

/**
 * Fetch all products for a restaurant with category information
 */
export async function getAdminProducts(
  restaurantId: string,
  categoryId?: string,
  searchQuery?: string
): Promise<Product[]> {
  const supabase = createClient();
  let query = supabase
    .from("products")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  if (categoryId && categoryId !== "all") {
    query = query.eq("category_id", categoryId);
  }

  if (searchQuery && searchQuery.trim().length > 0) {
    query = query.ilike("name", `%${searchQuery.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as Product[]) || [];
}

/**
 * Fetch single product by ID
 */
export async function getAdminProductById(
  productId: string
): Promise<Product | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (error) throw error;
  return data as Product | null;
}

/**
 * Create a new product with optional image upload
 */
export async function createAdminProduct(
  restaurantId: string,
  productData: {
    name: string;
    description: string;
    price: number;
    category_id: string;
    available: boolean;
    featured: boolean;
    sort_order?: number;
  },
  imageFile?: File | null
): Promise<Product> {
  let imageUrl: string | null = null;

  if (imageFile) {
    const uploadResult = await uploadProductImage(restaurantId, imageFile);
    if (uploadResult.error) {
      throw new Error(`Failed to upload image: ${uploadResult.error}`);
    }
    imageUrl = uploadResult.url;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      restaurant_id: restaurantId,
      name: productData.name.trim(),
      description: productData.description.trim() || null,
      price: productData.price,
      category_id: productData.category_id || null,
      available: productData.available,
      featured: productData.featured,
      sort_order: productData.sort_order || 0,
      image_url: imageUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Product;
}

/**
 * Update an existing product with optional new image replacement
 */
export async function updateAdminProduct(
  productId: string,
  restaurantId: string,
  productData: Partial<Product>,
  newImageFile?: File | null
): Promise<Product> {
  const updates: Partial<Product> = { ...productData };

  if (newImageFile) {
    const uploadResult = await uploadProductImage(restaurantId, newImageFile);
    if (uploadResult.error) {
      throw new Error(`Failed to upload new image: ${uploadResult.error}`);
    }
    updates.image_url = uploadResult.url;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", productId)
    .select()
    .single();

  if (error) throw error;
  return data as Product;
}

/**
 * Delete a product
 */
export async function deleteAdminProduct(productId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) throw error;
}

/**
 * Toggle availability of a product
 */
export async function toggleAdminProductAvailability(
  productId: string,
  currentStatus: boolean
): Promise<boolean> {
  const newStatus = !currentStatus;
  const supabase = createClient();
  const { error } = await supabase
    .from("products")
    .update({ available: newStatus })
    .eq("id", productId);

  if (error) throw error;
  return newStatus;
}

/**
 * Fetch orders for restaurant
 */
export async function getAdminOrders(restaurantId: string): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Order[]) || [];
}

/**
 * Update an order's status
 */
export async function updateAdminOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  if (error) throw error;
}

/**
 * Update restaurant settings
 */
export async function updateAdminRestaurantSettings(
  restaurantId: string,
  settings: Partial<Restaurant>
): Promise<Restaurant> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .update(settings)
    .eq("id", restaurantId)
    .select()
    .single();

  if (error) throw error;
  return data as Restaurant;
}
