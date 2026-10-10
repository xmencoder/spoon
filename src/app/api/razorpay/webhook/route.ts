import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderEmails } from "@/lib/email/send-order-emails";
import type { ReceiptData } from "@/lib/email/pdf-receipt";

export async function POST(req: NextRequest) {
  try {
    // 1. Read raw body as text for cryptographic HMAC verification
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      process.env.RAZORPAY_KEY_SECRET ||
      "";

    const isLiveConfigured =
      webhookSecret && !webhookSecret.includes("placeholder");

    // 2. Cryptographic signature check
    if (isLiveConfigured) {
      if (!signature) {
        return NextResponse.json(
          { success: false, error: "Missing x-razorpay-signature header" },
          { status: 400 }
        );
      }

      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        console.error("[Webhook] Invalid Razorpay webhook signature");
        return NextResponse.json(
          { success: false, error: "Invalid signature" },
          { status: 400 }
        );
      }
    }

    // 3. Parse JSON event payload
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const eventType = event.event;
    console.log(`[Webhook] Received Razorpay event: ${eventType} (ID: ${event.id})`);

    // Process only successful payment events
    if (eventType !== "payment.captured" && eventType !== "order.paid") {
      return NextResponse.json({
        success: true,
        message: `Ignored unhandled event: ${eventType}`,
      });
    }

    const payment = event.payload?.payment?.entity;
    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Missing payment entity" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const nowIso = new Date().toISOString();
    const eventKey = event.id || payment.id;

    // 4. Locate order in database using trusted identifiers
    // Priority: 1) notes.order_id, 2) order.receipt, 3) razorpay_order_id in orders
    const candidateOrderId =
      payment.notes?.order_id || event.payload?.order?.entity?.receipt;

    let order: any = null;

    if (candidateOrderId) {
      const { data } = await admin
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", candidateOrderId)
        .maybeSingle();
      order = data;
    }

    if (!order && payment.order_id) {
      const { data } = await admin
        .from("orders")
        .select("*, order_items(*)")
        .eq("razorpay_order_id", payment.order_id)
        .maybeSingle();
      order = data;
    }

    if (!order) {
      console.warn(`[Webhook] Order not found for payment ${payment.id}. Candidate ID: ${candidateOrderId}`);
      // Return 200 so Razorpay does not endlessly retry orphan test payments
      return NextResponse.json({
        success: false,
        warning: "Order record not found in database",
      });
    }

    // 5. Amount & Currency Verification
    const expectedAmountPaise = Math.round(Number(order.total) * 100);
    if (payment.currency !== "INR") {
      console.error(`[Webhook] Currency mismatch: expected INR, received ${payment.currency}`);
      return NextResponse.json(
        { success: false, error: "Currency mismatch" },
        { status: 400 }
      );
    }

    if (payment.amount < expectedAmountPaise) {
      console.error(`[Webhook] Underpayment detected: expected ${expectedAmountPaise} paise, received ${payment.amount} paise`);
      return NextResponse.json(
        { success: false, error: "Underpayment detected" },
        { status: 400 }
      );
    }

    // 6. Idempotency Check — has this webhook event already been processed?
    const { data: existingNotif } = await admin
      .from("order_notifications")
      .select("customer_email_status, kitchen_email_status")
      .eq("razorpay_event_id", eventKey)
      .maybeSingle();

    if (
      existingNotif &&
      existingNotif.customer_email_status === "sent" &&
      existingNotif.kitchen_email_status === "sent"
    ) {
      console.log(`[Webhook] Event ${eventKey} already processed and emails sent. Idempotent return.`);
      return NextResponse.json({
        success: true,
        message: "Already processed (idempotent)",
      });
    }

    // 7. Update order status in Supabase
    await admin
      .from("orders")
      .update({
        payment_status: "verified",
        status: "confirmed",
        payment_method: payment.method || "Razorpay",
        payment_verified_at: nowIso,
        payment_verified_by: "Razorpay Webhook",
        approval_source: "RAZORPAY_WEBHOOK",
        razorpay_order_id: payment.order_id || order.razorpay_order_id,
        razorpay_payment_id: payment.id,
        updated_at: nowIso,
      })
      .eq("id", order.id);

    try {
      await admin.from("order_status_history").insert({
        order_id: order.id,
        status: "confirmed",
        changed_by: "Razorpay Webhook",
        notes: `Payment captured via webhook (Payment ID: ${payment.id}, Event: ${eventType})`,
      });
    } catch {
      // ignore status history if not configured
    }

    // 8. Generate PDF and send automated emails
    const receiptData: ReceiptData = {
      orderId: order.id,
      orderNumber: order.order_number || String(order.id).slice(0, 8).toUpperCase(),
      createdAt: order.created_at || nowIso,
      customerName: order.customer_name || "Valued Customer",
      customerPhone: order.customer_phone || "",
      customerEmail: order.customer_email || undefined,
      orderType: order.order_type || "delivery",
      deliveryAddress: order.delivery_address || undefined,
      deliveryDate: order.delivery_date || undefined,
      deliveryTimeSlot: order.delivery_time_slot || undefined,
      items: (order.order_items || []).map((item: any) => ({
        productName: item.product_name,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unit_price) || 0,
        subtotal: Number(item.subtotal) || 0,
      })),
      subtotal: Number(order.subtotal) || 0,
      deliveryCharge: Number(order.delivery_charge) || 0,
      packagingFee: Number(order.packaging_charge) || 0,
      total: Number(order.total) || 0,
      paymentMethod: payment.method || "Razorpay",
      paymentStatus: "Paid",
      razorpayPaymentId: payment.id,
      hasGiftNote: Boolean(order.has_gift_note),
      giftNote: order.gift_note || undefined,
    };

    const emailResults = await sendOrderEmails(receiptData);

    const custStatus = emailResults.customerEmail.success
      ? "sent"
      : (receiptData.customerEmail ? "failed" : "skipped");
    const kitchenStatus = emailResults.kitchenEmail.success ? "sent" : "failed";

    // 9. Persist idempotency notification record
    try {
      await admin.from("order_notifications").upsert(
        {
          order_id: order.id,
          razorpay_event_id: eventKey,
          customer_email_status: custStatus,
          kitchen_email_status: kitchenStatus,
          customer_email_message_id: emailResults.customerEmail.messageId || null,
          kitchen_email_message_id: emailResults.kitchenEmail.messageId || null,
          customer_email_error: emailResults.customerEmail.error || null,
          kitchen_email_error: emailResults.kitchenEmail.error || null,
          attempt_count: 1,
          last_attempt_at: nowIso,
        },
        { onConflict: "razorpay_event_id" }
      );
    } catch (saveErr) {
      console.warn("[Webhook] Could not save order_notifications record:", saveErr);
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed, payment confirmed, and notifications dispatched.",
      orderId: order.id,
      event: eventType,
      notifications: { customer: custStatus, kitchen: kitchenStatus },
    });
  } catch (err: any) {
    console.error("[Webhook] Razorpay webhook processing error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
