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
      if (owned) return owned as Restaurant;

      // If restaurant exists but has no owner, claim it for this authenticated admin
      const target = restaurants[0];
      if (!target.owner_id) {
        try {
          const { data: claimed } = await supabase
            .from("restaurants")
            .update({ owner_id: user.id })
            .eq("id", target.id)
            .select()
            .single();
          if (claimed) return claimed as Restaurant;
        } catch {
          // ignore claim failure and return target
        }
      }
      return target as Restaurant;
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

  if (error) {
    console.error("createAdminCategory Supabase error:", error);
    throw new Error(error.message || "Failed to create category");
  }

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
 * Unpack embedded metadata if columns were missing in older Supabase schema
 */
export function unpackProductMetadata(product: any): Product {
  if (!product) return product;
  const p = { ...product };

  if (p.description && p.description.includes("<!-- BAKERY_META:")) {
    try {
      const match = p.description.match(/<!-- BAKERY_META:([\s\S]*?) -->/);
      if (match && match[1]) {
        const meta = JSON.parse(match[1]);
        if (!p.gallery_images || p.gallery_images.length === 0) p.gallery_images = meta.gallery_images;
        if (!p.sizes || p.sizes.length === 0) p.sizes = meta.sizes;
        if (!p.addons || p.addons.length === 0) p.addons = meta.addons;
        if (!p.tags || p.tags.length === 0) p.tags = meta.tags;
        if (!p.story_text) p.story_text = meta.story_text;
        if (!p.badge) p.badge = meta.badge;
        if (p.order_limit === undefined || p.order_limit === null) p.order_limit = meta.order_limit;
        if (p.total_ordered === undefined || p.total_ordered === null) p.total_ordered = meta.total_ordered;
      }
      p.description = p.description.replace(/<!-- BAKERY_META:([\s\S]*?) -->/, "").trim();
    } catch {
      // ignore parse errors
    }
  }

  // Ensure gallery_images is always a valid array
  if (!p.gallery_images || !Array.isArray(p.gallery_images) || p.gallery_images.length === 0) {
    if (p.image_url) {
      p.gallery_images = [p.image_url];
    } else {
      p.gallery_images = [];
    }
  }

  p.total_ordered = Number(p.total_ordered || 0);
  p.order_limit = p.order_limit != null && p.order_limit !== "" ? Number(p.order_limit) : null;

  return p as Product;
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
  return (data || []).map(unpackProductMetadata);
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
  return data ? unpackProductMetadata(data) : null;
}

/**
 * Create a new product with optional image upload
 */
export async function createAdminProduct(
  restaurantId: string,
  productData: {
    name: string;
    description?: string;
    price: number;
    category_id?: string | null;
    available?: boolean;
    featured?: boolean;
    sort_order?: number;
    badge?: string | null;
    order_limit?: number | null;
    total_ordered?: number | null;
    image_url?: string | null;
    gallery_images?: string[] | null;
    sizes?: any;
    addons?: any;
    tags?: string[];
    allergen_info?: string[];
    storage_care?: string[];
    is_veg?: boolean;
    story_text?: string | null;
    rating?: number;
  },
  imageFile?: File | null
): Promise<Product> {
  let imageUrl: string | null = productData.image_url || null;

  if (imageFile) {
    const uploadResult = await uploadProductImage(restaurantId, imageFile);
    if (uploadResult.url) {
      imageUrl = uploadResult.url;
    }
  }

  const supabase = createClient();
  const galleryList = productData.gallery_images && productData.gallery_images.length > 0
    ? productData.gallery_images
    : (imageUrl ? [imageUrl] : []);
  
  const coverUrl = imageUrl || (galleryList.length > 0 ? galleryList[0] : null);

  // Attempt rich insert with all bakery attributes
  const fullPayload = {
    restaurant_id: restaurantId,
    name: productData.name.trim(),
    description: productData.description?.trim() || null,
    price: productData.price,
    category_id: productData.category_id || null,
    available: productData.available ?? true,
    featured: productData.featured ?? false,
    sort_order: productData.sort_order || 0,
    image_url: coverUrl,
    gallery_images: galleryList,
    badge: productData.badge || null,
    order_limit: productData.order_limit || null,
    total_ordered: productData.total_ordered || 0,
    sizes: productData.sizes || [],
    addons: productData.addons || [],
    tags: productData.tags || [],
    allergen_info: productData.allergen_info || [],
    storage_care: productData.storage_care || [],
    is_veg: productData.is_veg ?? true,
    story_text: productData.story_text || null,
    rating: productData.rating || 4.8,
  };

  const { data, error } = await supabase
    .from("products")
    .insert(fullPayload)
    .select()
    .single();

  if (error) {
    console.warn("Full payload insert notice, trying safe fallback insert:", error.message);
    
    // Embed rich metadata into description comment for seamless resilience
    const metaPayload = {
      gallery_images: galleryList,
      sizes: productData.sizes || [],
      addons: productData.addons || [],
      tags: productData.tags || [],
      story_text: productData.story_text || null,
      badge: productData.badge || null,
      is_veg: productData.is_veg ?? true,
      order_limit: productData.order_limit || null,
      total_ordered: productData.total_ordered || 0,
    };
    const cleanDesc = productData.description?.trim() || "";
    const descriptionWithMeta = cleanDesc
      ? `${cleanDesc}\n<!-- BAKERY_META:${JSON.stringify(metaPayload)} -->`
      : `<!-- BAKERY_META:${JSON.stringify(metaPayload)} -->`;

    const basicPayload = {
      restaurant_id: restaurantId,
      name: productData.name.trim(),
      description: descriptionWithMeta,
      price: productData.price,
      category_id: productData.category_id || null,
      available: productData.available ?? true,
      featured: productData.featured ?? false,
      sort_order: productData.sort_order || 0,
      image_url: coverUrl,
    };

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("products")
      .insert(basicPayload)
      .select()
      .single();

    if (!fallbackError && fallbackData) {
      return unpackProductMetadata(fallbackData);
    }

    const detailMsg = [fallbackError?.message || error.message, error.details, error.hint]
      .filter(Boolean)
      .join(" - ");
    throw new Error(detailMsg || "Database insert failed");
  }

  return unpackProductMetadata(data);
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
    if (uploadResult.url) {
      updates.image_url = uploadResult.url;
    }
  }

  // Ensure gallery_images is array if passed
  if (updates.gallery_images && !Array.isArray(updates.gallery_images)) {
    updates.gallery_images = [updates.gallery_images];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", productId)
    .select()
    .single();

  if (error) {
    console.warn("Full payload update notice, trying safe fallback update:", error.message);

    // Fallback: Embed rich metadata into description comment for seamless resilience
    const metaPayload = {
      gallery_images: updates.gallery_images || (updates.image_url ? [updates.image_url] : []),
      sizes: updates.sizes || [],
      addons: updates.addons || [],
      tags: updates.tags || [],
      story_text: updates.story_text || null,
      badge: updates.badge || null,
      is_veg: updates.is_veg ?? true,
      order_limit: updates.order_limit !== undefined ? updates.order_limit : null,
      total_ordered: updates.total_ordered !== undefined ? updates.total_ordered : 0,
    };
    const cleanDesc = (updates.description || "").replace(/<!-- BAKERY_META:([\s\S]*?) -->/, "").trim();
    const descriptionWithMeta = cleanDesc
      ? `${cleanDesc}\n<!-- BAKERY_META:${JSON.stringify(metaPayload)} -->`
      : `<!-- BAKERY_META:${JSON.stringify(metaPayload)} -->`;

    const basicUpdates: any = {};
    if (updates.name !== undefined) basicUpdates.name = updates.name;
    basicUpdates.description = descriptionWithMeta;
    if (updates.price !== undefined) basicUpdates.price = updates.price;
    if (updates.category_id !== undefined) basicUpdates.category_id = updates.category_id;
    if (updates.available !== undefined) basicUpdates.available = updates.available;
    if (updates.featured !== undefined) basicUpdates.featured = updates.featured;
    if (updates.sort_order !== undefined) basicUpdates.sort_order = updates.sort_order;
    if (updates.image_url !== undefined) basicUpdates.image_url = updates.image_url;

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("products")
      .update(basicUpdates)
      .eq("id", productId)
      .select()
      .single();

    if (!fallbackError && fallbackData) {
      return unpackProductMetadata(fallbackData);
    }

    const detailMsg = [fallbackError?.message || error.message, error.details, error.hint]
      .filter(Boolean)
      .join(" - ");
    throw new Error(detailMsg || "Database update failed");
  }

  return unpackProductMetadata(data);
}

/**
 * Reset ordered count for a product back to 0
 */
export async function resetProductOrderCount(productId: string): Promise<void> {
  const supabase = createClient();
  const { data: prod } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (prod) {
    await updateAdminProduct(productId, prod.restaurant_id, {
      total_ordered: 0,
    });
  }
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
