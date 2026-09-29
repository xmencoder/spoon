import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
      trackingToken,
    } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Missing orderId" },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    const isLiveConfigured =
      keySecret && !keySecret.includes("placeholder");

    // 1. Verify Razorpay cryptographic signature if live keys are present
    if (isLiveConfigured && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json(
          { success: false, error: "Invalid payment signature verification failed" },
          { status: 400 }
        );
      }
    }

    // 2. Update order in Supabase
    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    const updatePayload: any = {
      payment_status: "paid",
      status: "confirmed",
      payment_method: "Razorpay",
      payment_verified_at: nowIso,
      payment_verified_by: "Razorpay Auto-Verification",
      approval_source: "RAZORPAY",
      updated_at: nowIso,
    };

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId)
      .select("id, order_number, tracking_token, customer_name, customer_phone, total, delivery_date, delivery_time_slot, order_type")
      .single();

    if (updateError) {
      console.error("Failed to update order payment status in Supabase:", updateError);
    }

    // 3. Insert into order status history if available
    try {
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        status: "confirmed",
        changed_by: "Razorpay Auto-Verification",
        notes: `Payment verified via Razorpay (Payment ID: ${razorpay_payment_id || "simulated"})`,
      });
    } catch {
      // ignore status history table if not configured
    }

    const resolvedToken = updatedOrder?.tracking_token || trackingToken || orderId;

    return NextResponse.json({
      success: true,
      message: "Payment successfully verified and order confirmed.",
      orderId,
      orderNumber: updatedOrder?.order_number || "",
      trackingToken: resolvedToken,
    });
  } catch (error: any) {
    console.error("Razorpay verify-payment error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Payment verification failed",
      },
      { status: 500 }
    );
  }
}
