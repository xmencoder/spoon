"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Server Action to create a new category safely bypassing browser RLS role mismatches
 */
export async function createCategoryServerAction(
  restaurantId: string | undefined | null,
  name: string,
  imageUrl?: string | null
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
  imageUrl?: string | null
) {
  try {
    const supabase = await createClient();
    const payload: Record<string, any> = { name: name.trim() };
    if (imageUrl !== undefined) {
      payload.image_url = imageUrl;
    }

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
