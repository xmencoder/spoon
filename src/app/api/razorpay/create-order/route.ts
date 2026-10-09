import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

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

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

    const isLiveConfigured =
      keyId &&
      keySecret &&
      !keyId.includes("placeholder") &&
      !keySecret.includes("placeholder");

    if (isLiveConfigured) {
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

      return NextResponse.json({
        success: true,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId,
        isTest: false,
      });
    } else {
      // Demo / Test simulated Razorpay order when live keys are pending
      const mockOrderId = `order_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return NextResponse.json({
        success: true,
        orderId: mockOrderId,
        amount: Math.round(amount * 100),
        currency: "INR",
        keyId: keyId || "rzp_test_placeholder",
        isTest: true,
      });
    }
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
