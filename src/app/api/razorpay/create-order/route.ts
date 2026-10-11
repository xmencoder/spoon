import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, orderId, customerName, customerPhone } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid order amount" },
        { status: 400 }
      );
    }

    const rawKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
    const rawKeySecret = process.env.RAZORPAY_KEY_SECRET || "";

    // Clean keys: trim and strip accidental quotes
    const keyId = rawKeyId.trim().replace(/^["']|["']$/g, "");
    const keySecret = rawKeySecret.trim().replace(/^["']|["']$/g, "");

    const isLiveConfigured =
      Boolean(keyId) &&
      Boolean(keySecret) &&
      !keyId.includes("placeholder") &&
      !keySecret.includes("placeholder");

    if (!isLiveConfigured) {
      const missingDetails = [];
      if (!keyId || keyId.includes("placeholder")) missingDetails.push("NEXT_PUBLIC_RAZORPAY_KEY_ID");
      if (!keySecret || keySecret.includes("placeholder")) missingDetails.push("RAZORPAY_KEY_SECRET");

      console.error(
        `[Razorpay] Missing or invalid environment keys: ${missingDetails.join(", ")}. Please configure them in Vercel Project Settings -> Environment Variables and redeploy.`
      );

      return NextResponse.json(
        {
          success: false,
          error: `Razorpay payment keys are not configured in Vercel (${missingDetails.join(", ")}). Please add them to Vercel and redeploy.`,
        },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Amount in paise
    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: (orderId || `rcpt_${Date.now()}`).slice(0, 40),
      notes: {
        customer_name: customerName || "",
        customer_phone: customerPhone || "",
        order_id: orderId || "",
      },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Persist the generated Razorpay order ID to the order immediately
    if (orderId && razorpayOrder?.id) {
      try {
        const admin = createAdminClient();
        await admin
          .from("orders")
          .update({ razorpay_order_id: razorpayOrder.id })
          .eq("id", orderId);
      } catch (dbErr) {
        console.warn("Failed to attach razorpay_order_id to order:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId,
      isTest: keyId.startsWith("rzp_test_"),
    });
  } catch (error: any) {
    console.error("Razorpay create-order error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to initialize Razorpay order",
      },
      { status: 500 }
    );
  }
}
