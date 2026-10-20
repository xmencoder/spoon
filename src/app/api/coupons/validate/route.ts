import { NextRequest, NextResponse } from "next/server";
import { validateCoupon } from "@/lib/coupons";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, subtotal } = body;

    const result = validateCoupon(code, Number(subtotal) || 0);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, error: error?.message || "Invalid coupon request." },
      { status: 400 }
    );
  }
}
