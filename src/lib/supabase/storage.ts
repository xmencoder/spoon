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

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a product image to Supabase Storage inside the restaurant's folder.
 * Falls back gracefully to base64 Data URL if storage bucket is not configured.
 */
export async function uploadProductImage(
  restaurantId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { url: null, error: validation.error || "Invalid file" };
  }

  try {
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

    if (!uploadError) {
      const {
        data: { publicUrl },
      } = supabase.storage.from(PRODUCT_STORAGE_BUCKET).getPublicUrl(filePath);

      if (publicUrl) {
        return { url: publicUrl, error: null };
      }
    } else {
      console.warn("Supabase storage upload returned error, falling back to data URL:", uploadError.message);
    }
  } catch (storageErr) {
    console.warn("Supabase storage upload threw exception, falling back to data URL:", storageErr);
  }

  // Graceful fallback to Data URL (base64) so product creation NEVER fails
  try {
    const dataUrl = await fileToBase64(file);
    return { url: dataUrl, error: null };
  } catch (convErr) {
    return { url: null, error: "Failed to read image file" };
  }
}

/**
 * Upload multiple product images in parallel to Supabase Storage
 */
export async function uploadMultipleProductImages(
  restaurantId: string,
  files: File[]
): Promise<{ urls: string[]; errors: string[] }> {
  const results = await Promise.all(
    files.map((file) => uploadProductImage(restaurantId, file))
  );

  const urls: string[] = [];
  const errors: string[] = [];

  results.forEach((res, index) => {
    if (res.url) {
      urls.push(res.url);
    } else if (res.error) {
      errors.push(`File ${files[index].name}: ${res.error}`);
    }
  });

  return { urls, errors };
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

/**
 * Upload a category image to Supabase Storage
 */
export async function uploadCategoryImage(
  restaurantId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  return uploadProductImage(restaurantId, file);
}
