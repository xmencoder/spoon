"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Server Action to create a new category safely bypassing browser RLS role mismatches
 */
export async function createCategoryServerAction(
  restaurantId: string | undefined | null,
  name: string,
  imageUrl?: string | null,
  bakingPeriodHours?: number | null,
  categoryLimit?: number | null
) {
  try {
    const supabase = await createClient();

    let targetRestId = restaurantId;
    if (!targetRestId) {
      const { data: defaultRest } = await supabase
        .from("restaurants")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      targetRestId = defaultRest?.id;
    }

    if (!targetRestId) {
      return {
        success: false,
        error: "No restaurant found. Please ensure database migration is executed.",
      };
    }

    // Get max sort_order
    const { data: existing } = await supabase
      .from("categories")
      .select("sort_order")
      .eq("restaurant_id", targetRestId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSort = (existing?.[0]?.sort_order || 0) + 1;

    const payload: Record<string, any> = {
      restaurant_id: targetRestId,
      name: name.trim(),
      sort_order: nextSort,
    };

    if (imageUrl) {
      payload.image_url = imageUrl;
    }

    if (bakingPeriodHours !== undefined && bakingPeriodHours !== null) {
      payload.baking_period_hours = bakingPeriodHours;
    } else {
      payload.baking_period_hours = null;
    }

    payload.category_limit =
      categoryLimit != null && !isNaN(categoryLimit) && categoryLimit > 0
        ? categoryLimit
        : null;

    let { data, error } = await supabase
      .from("categories")
      .insert(payload)
      .select()
      .single();

    if (error && error.message?.includes("image_url")) {
      delete payload.image_url;
      const retry = await supabase
        .from("categories")
        .insert(payload)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("createCategoryServerAction error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, category: data };
  } catch (err: unknown) {
    console.error("createCategoryServerAction unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create category",
    };
  }
}

/**
 * Server Action to update a category
 */
export async function updateCategoryServerAction(
  categoryId: string,
  name: string,
  imageUrl?: string | null,
  bakingPeriodHours?: number | null,
  categoryLimit?: number | null
) {
  try {
    const supabase = await createClient();
    const payload: Record<string, any> = { name: name.trim() };
    if (imageUrl !== undefined) {
      payload.image_url = imageUrl;
    }
    // Always persist baking_period_hours (null clears it)
    payload.baking_period_hours = (bakingPeriodHours !== undefined && bakingPeriodHours !== null && !isNaN(bakingPeriodHours))
      ? bakingPeriodHours
      : null;

    // Always persist category_limit (null clears it)
    payload.category_limit =
      categoryLimit != null && !isNaN(categoryLimit) && categoryLimit > 0
        ? categoryLimit
        : null;

    let { data, error } = await supabase
      .from("categories")
      .update(payload)
      .eq("id", categoryId)
      .select()
      .single();

    if (error && error.message?.includes("image_url")) {
      delete payload.image_url;
      const retry = await supabase
        .from("categories")
        .update(payload)
        .eq("id", categoryId)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, category: data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update category",
    };
  }
}

/**
 * Server Action to delete a category
 */
export async function deleteCategoryServerAction(categoryId: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete category",
    };
  }
}
/**
 * Server Action to update a category's sort_order (rank) directly
 */
export async function updateCategoryRankServerAction(
  categoryId: string,
  newRank: number,
  restaurantId: string
) {
  try {
    const supabase = await createClient();

    // Fetch all other categories for this restaurant, sorted
    const { data: others } = await supabase
      .from("categories")
      .select("id, sort_order")
      .eq("restaurant_id", restaurantId)
      .neq("id", categoryId)
      .order("sort_order", { ascending: true });

    const siblings = (others || []) as { id: string; sort_order: number }[];

    // Clamp rank to valid range [1, total]
    const clampedRank = Math.max(1, Math.min(newRank, siblings.length + 1));

    // Insert the current category at clampedRank, shift others
    const sorted = [...siblings];
    sorted.splice(clampedRank - 1, 0, { id: categoryId, sort_order: clampedRank });

    // Build bulk update payload
    const updates = sorted.map((item, idx) => ({
      id: item.id,
      sort_order: idx + 1,
    }));

    // Apply all updates
    for (const u of updates) {
      await supabase
        .from("categories")
        .update({ sort_order: u.sort_order })
        .eq("id", u.id);
    }

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update rank",
    };
  }
}
