/**
 * Utilities for product discounts and promotional pricing
 */

export interface DiscountInfo {
  hasDiscount: boolean;
  originalPrice: number;
  discountedPrice: number;
  savings: number;
  discountType: "percent" | "fixed" | null;
  discountValue: number;
  discountPercent?: number | null;
  discountAmount?: number | null;
  discountName?: string | null;
  /**
   * Artisanal minimal badge label for frontend display
   * e.g. "Diwali Special • 15% OFF" or "15% OFF" or "Diwali Special • ₹50 OFF"
   */
  badgeLabel: string | null;
  /**
   * Short discount tag, e.g. "15% OFF" or "₹50 OFF"
   */
  shortBadge: string | null;
}

export function getProductDiscount(
  product: {
    price?: number | null;
    discount_percent?: number | null;
    discount_amount?: number | null;
    discount_name?: string | null;
  } | null | undefined,
  customBasePrice?: number
): DiscountInfo {
  if (!product) {
    return {
      hasDiscount: false,
      originalPrice: 0,
      discountedPrice: 0,
      savings: 0,
      discountType: null,
      discountValue: 0,
      discountPercent: null,
      discountAmount: null,
      discountName: null,
      badgeLabel: null,
      shortBadge: null,
    };
  }

  const origPrice =
    Number(customBasePrice !== undefined ? customBasePrice : product.price) || 0;

  const dPercent =
    product.discount_percent != null &&
    !isNaN(Number(product.discount_percent)) &&
    Number(product.discount_percent) > 0
      ? Number(product.discount_percent)
      : null;

  const dAmount =
    product.discount_amount != null &&
    !isNaN(Number(product.discount_amount)) &&
    Number(product.discount_amount) > 0
      ? Number(product.discount_amount)
      : null;

  const dName = product.discount_name ? String(product.discount_name).trim() : null;

  // Percentage discount takes priority if set
  if (dPercent && dPercent > 0) {
    const cappedPercent = Math.min(100, Math.max(1, Math.round(dPercent)));
    const savings = Math.round((origPrice * cappedPercent) / 100);
    const discountedPrice = Math.max(0, origPrice - savings);
    const shortBadge = `${cappedPercent}% OFF`;
    const badgeLabel = dName ? `${dName} • ${shortBadge}` : shortBadge;

    return {
      hasDiscount: savings > 0,
      originalPrice: origPrice,
      discountedPrice,
      savings,
      discountType: "percent",
      discountValue: cappedPercent,
      discountPercent: cappedPercent,
      discountAmount: null,
      discountName: dName,
      badgeLabel,
      shortBadge,
    };
  }

  // Fixed amount discount
  if (dAmount && dAmount > 0) {
    const rawSavings = Math.round(dAmount);
    const savings = Math.min(origPrice, Math.max(0, rawSavings));
    const discountedPrice = Math.max(0, origPrice - savings);
    const shortBadge = `₹${savings} OFF`;
    const badgeLabel = dName ? `${dName} • ${shortBadge}` : shortBadge;

    return {
      hasDiscount: savings > 0,
      originalPrice: origPrice,
      discountedPrice,
      savings,
      discountType: "fixed",
      discountValue: savings,
      discountPercent: null,
      discountAmount: savings,
      discountName: dName,
      badgeLabel,
      shortBadge,
    };
  }

  return {
    hasDiscount: false,
    originalPrice: origPrice,
    discountedPrice: origPrice,
    savings: 0,
    discountType: null,
    discountValue: 0,
    discountPercent: null,
    discountAmount: null,
    discountName: null,
    badgeLabel: null,
    shortBadge: null,
  };
}
