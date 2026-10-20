import fs from "fs";
import path from "path";

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number; // e.g. 5, 10, 15
  minOrderAmount: number; // e.g. 300, 500, 0 for none
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_COUPONS: Coupon[] = [
  {
    id: "coupon-welcome10",
    code: "WELCOME10",
    discountPercent: 10,
    minOrderAmount: 499,
    isActive: true,
    description: "Get 10% off on your order above ₹499",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "coupon-spoon5",
    code: "SPOON5",
    discountPercent: 5,
    minOrderAmount: 299,
    isActive: true,
    description: "Get 5% off on your order above ₹299",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function getCouponsFilePath(): string {
  return path.join(process.cwd(), "src", "lib", "coupons-config.json");
}

export function getAllCoupons(): Coupon[] {
  try {
    if (typeof window === "undefined") {
      const filePath = getCouponsFilePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } else {
        // Initialize with default coupons
        saveAllCoupons(DEFAULT_COUPONS);
        return DEFAULT_COUPONS;
      }
    }
  } catch (err) {
    console.warn("Could not read coupons-config.json, using defaults:", err);
  }
  return DEFAULT_COUPONS;
}

export function saveAllCoupons(coupons: Coupon[]): boolean {
  try {
    if (typeof window === "undefined") {
      const filePath = getCouponsFilePath();
      fs.writeFileSync(filePath, JSON.stringify(coupons, null, 2), "utf-8");
      return true;
    }
  } catch (err) {
    console.error("Failed to write coupons-config.json:", err);
  }
  return false;
}

export function findCouponByCode(code: string): Coupon | null {
  const normalized = code.trim().toUpperCase();
  const coupons = getAllCoupons();
  return coupons.find((c) => c.code.toUpperCase() === normalized) || null;
}

export type CouponValidationResult =
  | {
      valid: true;
      coupon: {
        id: string;
        code: string;
        discountPercent: number;
        minOrderAmount: number;
        description?: string;
      };
      discountAmount: number;
      message: string;
    }
  | {
      valid: false;
      code: string;
      error: string;
      shortage?: number;
      minOrderAmount?: number;
    };

export function validateCoupon(code: string, subtotal: number): CouponValidationResult {
  const cleanCode = (code || "").trim().toUpperCase();
  if (!cleanCode) {
    return {
      valid: false,
      code: cleanCode,
      error: "Please enter a coupon code.",
    };
  }

  const coupon = findCouponByCode(cleanCode);
  if (!coupon || !coupon.isActive) {
    return {
      valid: false,
      code: cleanCode,
      error: "Coupon code is invalid or has expired.",
    };
  }

  const minAmt = Number(coupon.minOrderAmount) || 0;
  if (minAmt > 0 && subtotal < minAmt) {
    const shortage = minAmt - subtotal;
    return {
      valid: false,
      code: coupon.code,
      minOrderAmount: minAmt,
      shortage,
      error: `Add ₹${shortage} more to avail coupon "${coupon.code}" (Min order ₹${minAmt})`,
    };
  }

  const percent = Number(coupon.discountPercent) || 0;
  const discountAmount = Math.max(0, Math.round((subtotal * percent) / 100));

  return {
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountPercent: percent,
      minOrderAmount: minAmt,
      description: coupon.description,
    },
    discountAmount,
    message: `Coupon "${coupon.code}" applied! You saved ₹${discountAmount} (${percent}% off)`,
  };
}
