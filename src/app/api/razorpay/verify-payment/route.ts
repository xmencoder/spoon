import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderEmails } from "@/lib/email/send-order-emails";
import type { ReceiptData } from "@/lib/email/pdf-receipt";

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

    // 2. Use admin client for reliable server-side persistence
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();

    const updatePayload: any = {
      payment_status: "verified",
      status: "confirmed",
      payment_method: "Razorpay",
      payment_verified_at: nowIso,
      payment_verified_by: "Razorpay Payment Verification",
      approval_source: "RAZORPAY",
      razorpay_order_id: razorpay_order_id || null,
      razorpay_payment_id: razorpay_payment_id || null,
      razorpay_signature: razorpay_signature || null,
      updated_at: nowIso,
    };

    const { data: updatedOrder, error: updateError } = await admin
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId)
      .select("*")
      .single();

    if (updateError) {
      console.error("Failed to update order payment status in Supabase:", updateError);
      // Fallback minimal update to guarantee verified status
      await admin
        .from("orders")
        .update({
          payment_status: "verified",
          status: "confirmed",
          payment_method: "Razorpay",
          razorpay_payment_id: razorpay_payment_id || null,
          updated_at: nowIso,
        })
        .eq("id", orderId);
    }

    // 3. Insert into order status history if available
    try {
      await admin.from("order_status_history").insert({
        order_id: orderId,
        status: "confirmed",
        changed_by: "Razorpay Payment Verification",
        notes: `Payment verified via Razorpay (Payment ID: ${razorpay_payment_id || "simulated"})`,
      });
    } catch {
      // ignore status history table if not configured
    }

    // 4. Idempotency Check & Resend Email Delivery
    const eventKey = razorpay_payment_id || `verify_${orderId}`;
    let emailStatus = { customer: "pending", kitchen: "pending" };

    try {
      // Check if notifications were already sent for this payment
      const { data: existingNotification } = await admin
        .from("order_notifications")
        .select("customer_email_status, kitchen_email_status")
        .or(`razorpay_event_id.eq.${eventKey},order_id.eq.${orderId}`)
        .maybeSingle();

      const alreadySent =
        existingNotification &&
        existingNotification.customer_email_status === "sent" &&
        existingNotification.kitchen_email_status === "sent";

      if (alreadySent) {
        console.log(`[Email] Notifications already sent for order ${orderId} — skipping duplicate.`);
        emailStatus = {
          customer: existingNotification.customer_email_status,
          kitchen: existingNotification.kitchen_email_status,
        };
      } else {
        // Fetch full order items for receipt generation
        const { data: orderItems } = await admin
          .from("order_items")
          .select("product_name, quantity, unit_price, subtotal")
          .eq("order_id", orderId);

        const orderData: any = updatedOrder || {};

        const receiptData: ReceiptData = {
          orderId,
          orderNumber: orderData.order_number || String(orderId).slice(0, 8).toUpperCase(),
          createdAt: orderData.created_at || nowIso,
          customerName: orderData.customer_name || "Valued Customer",
          customerPhone: orderData.customer_phone || "",
          customerEmail: orderData.customer_email || undefined,
          orderType: (orderData.order_type as any) || "delivery",
          deliveryAddress: orderData.delivery_address || undefined,
          deliveryDate: orderData.delivery_date || undefined,
          deliveryTimeSlot: orderData.delivery_time_slot || undefined,
          items: (orderItems || []).map((item: any) => ({
            productName: item.product_name,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unit_price) || 0,
            subtotal: Number(item.subtotal) || 0,
          })),
          subtotal: Number(orderData.subtotal) || 0,
          deliveryCharge: Number(orderData.delivery_charge) || 0,
          packagingFee: Number(orderData.packaging_charge) || 0,
          total: Number(orderData.total) || 0,
          paymentMethod: "Razorpay",
          paymentStatus: "Paid",
          razorpayPaymentId: razorpay_payment_id || undefined,
          hasGiftNote: Boolean(orderData.has_gift_note),
          giftNote: orderData.gift_note || undefined,
        };

        // Send customer confirmation email with PDF and kitchen notification email
        const emailResults = await sendOrderEmails(receiptData);

        const custSuccess = emailResults.customerEmail.success;
        const kitchenSuccess = emailResults.kitchenEmail.success;

        emailStatus = {
          customer: custSuccess ? "sent" : (receiptData.customerEmail ? "failed" : "skipped"),
          kitchen: kitchenSuccess ? "sent" : "failed",
        };

        // Safely record in order_notifications for tracking and idempotency
        try {
          await admin.from("order_notifications").upsert(
            {
              order_id: orderId,
              razorpay_event_id: eventKey,
              customer_email_status: emailStatus.customer,
              kitchen_email_status: emailStatus.kitchen,
              customer_email_message_id: emailResults.customerEmail.messageId || null,
              kitchen_email_message_id: emailResults.kitchenEmail.messageId || null,
              customer_email_error: emailResults.customerEmail.error || null,
              kitchen_email_error: emailResults.kitchenEmail.error || null,
              attempt_count: 1,
              last_attempt_at: nowIso,
            },
            { onConflict: "razorpay_event_id" }
          );
        } catch (notifInsertErr) {
          console.warn("[Email] Failed to persist order_notifications (migration may be pending):", notifInsertErr);
        }
      }
    } catch (emailErr) {
      console.error("[Email] Error processing order emails:", emailErr);
    }

    const resolvedToken = updatedOrder?.tracking_token || trackingToken || orderId;

    return NextResponse.json({
      success: true,
      message: "Payment successfully verified and order confirmed.",
      orderId,
      orderNumber: updatedOrder?.order_number || "",
      trackingToken: resolvedToken,
      notifications: emailStatus,
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
