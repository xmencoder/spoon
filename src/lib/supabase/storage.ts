import { createClient } from "./client";

export const PRODUCT_STORAGE_BUCKET = "product-images";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Please upload a JPG, PNG, or WebP image.",
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: "Image exceeds 5MB size limit. Please choose a smaller image.",
    };
  }

  return { valid: true };
}

/**
 * Upload a product image to Supabase Storage inside the restaurant's folder
 */
export async function uploadProductImage(
  restaurantId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { url: null, error: validation.error || "Invalid file" };
  }

  const supabase = createClient();
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = `${restaurantId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PRODUCT_STORAGE_BUCKET).getPublicUrl(filePath);

  return { url: publicUrl, error: null };
}

/**
 * Delete a product image from storage
 */
export async function deleteProductImage(
  restaurantId: string,
  fileName: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();
  const filePath = `${restaurantId}/${fileName}`;

  const { error } = await supabase.storage
    .from(PRODUCT_STORAGE_BUCKET)
    .remove([filePath]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
