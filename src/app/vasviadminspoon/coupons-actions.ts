"use server";

import {
  getAllCoupons,
  saveAllCoupons,
  validateCoupon,
  type Coupon,
  type CouponValidationResult,
} from "@/lib/coupons";

export async function getAdminCouponsAction(): Promise<Coupon[]> {
  return getAllCoupons();
}

export async function saveAdminCouponAction(data: {
  id?: string;
  code: string;
  discountPercent: number;
  minOrderAmount: number;
  isActive?: boolean;
  description?: string;
}): Promise<{ success: boolean; error?: string; coupon?: Coupon }> {
  try {
    const cleanCode = (data.code || "").trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, error: "Coupon code is required." };
    }

    if (!/^[A-Z0-9_-]{3,20}$/.test(cleanCode)) {
      return {
        success: false,
        error: "Coupon code must be 3-20 characters long (letters, numbers, hyphens only).",
      };
    }

    const percent = Number(data.discountPercent);
    if (isNaN(percent) || percent <= 0 || percent > 100) {
      return { success: false, error: "Discount percentage must be between 1% and 100%." };
    }

    const minAmount = Number(data.minOrderAmount) || 0;
    if (minAmount < 0) {
      return { success: false, error: "Minimum order amount cannot be negative." };
    }

    const coupons = getAllCoupons();

    // Check for duplicate code if adding new or changing code
    const existingIndex = coupons.findIndex(
      (c) => c.code.toUpperCase() === cleanCode && (!data.id || c.id !== data.id)
    );
    if (existingIndex !== -1) {
      return { success: false, error: `Coupon code "${cleanCode}" already exists.` };
    }

    const now = new Date().toISOString();
    let updatedCoupon: Coupon;

    if (data.id) {
      const idx = coupons.findIndex((c) => c.id === data.id);
      if (idx === -1) {
        return { success: false, error: "Coupon not found." };
      }
      updatedCoupon = {
        ...coupons[idx],
        code: cleanCode,
        discountPercent: percent,
        minOrderAmount: minAmount,
        isActive: data.isActive !== undefined ? data.isActive : coupons[idx].isActive,
        description: data.description?.trim() || undefined,
        updatedAt: now,
      };
      coupons[idx] = updatedCoupon;
    } else {
      updatedCoupon = {
        id: `coupon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        code: cleanCode,
        discountPercent: percent,
        minOrderAmount: minAmount,
        isActive: data.isActive !== undefined ? data.isActive : true,
        description: data.description?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      coupons.unshift(updatedCoupon);
    }

    const saved = saveAllCoupons(coupons);
    if (!saved) {
      return { success: false, error: "Failed to save coupon to storage." };
    }

    return { success: true, coupon: updatedCoupon };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save coupon." };
  }
}

export async function toggleAdminCouponAction(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const coupons = getAllCoupons();
    const idx = coupons.findIndex((c) => c.id === id);
    if (idx === -1) {
      return { success: false, error: "Coupon not found." };
    }

    coupons[idx].isActive = isActive;
    coupons[idx].updatedAt = new Date().toISOString();

    const saved = saveAllCoupons(coupons);
    if (!saved) {
      return { success: false, error: "Failed to update coupon status." };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to toggle coupon status." };
  }
}

export async function deleteAdminCouponAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const coupons = getAllCoupons();
    const filtered = coupons.filter((c) => c.id !== id);
    if (filtered.length === coupons.length) {
      return { success: false, error: "Coupon not found." };
    }

    const saved = saveAllCoupons(filtered);
    if (!saved) {
      return { success: false, error: "Failed to delete coupon." };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete coupon." };
  }
}

export async function validateCustomerCouponAction(
  code: string,
  subtotal: number
): Promise<CouponValidationResult> {
  return validateCoupon(code, subtotal);
}
