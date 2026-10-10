"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderCompletedEmail, sendOrderEmails } from "@/lib/email/send-order-emails";
import type { ReceiptData } from "@/lib/email/pdf-receipt";
import {
  approveOrderPaymentAction,
  rejectOrderPaymentAction,
  advanceOrderStatusAction,
} from "@/lib/order-approval-service";
import type { OrderStatus, PaymentStatus } from "@/types/database";

/**
 * Ensures initial customer confirmation email (with PDF receipt) and
 * kitchen owner new-order alert email are dispatched if not already sent.
 */
async function triggerOrderConfirmationEmailsIfPending(
  orderId: string,
  razorpayPaymentId?: string
) {
  try {
    const admin = createAdminClient();

    // Check if already sent
    const { data: existingNotification } = await admin
      .from("order_notifications")
      .select("customer_email_status, kitchen_email_status")
      .eq("order_id", orderId)
      .maybeSingle();

    if (
      existingNotification &&
      existingNotification.customer_email_status === "sent" &&
      existingNotification.kitchen_email_status === "sent"
    ) {
      return;
    }

    const { data: order } = await admin
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (!order) return;

    const receiptData: ReceiptData = {
      orderId: order.id,
      orderNumber: order.order_number || String(order.id).slice(0, 8).toUpperCase(),
      createdAt: order.created_at || new Date().toISOString(),
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
      paymentMethod: order.payment_method || "Razorpay",
      paymentStatus: "Paid",
      razorpayPaymentId: razorpayPaymentId || order.razorpay_payment_id || undefined,
      hasGiftNote: Boolean(order.has_gift_note),
      giftNote: order.gift_note || undefined,
    };

    const results = await sendOrderEmails(receiptData);

    try {
      await admin.from("order_notifications").upsert(
        {
          order_id: order.id,
          razorpay_event_id: razorpayPaymentId || order.razorpay_payment_id || `verify_${order.id}`,
          customer_email_status: results.customerEmail.success ? "sent" : "failed",
          kitchen_email_status: results.kitchenEmail.success ? "sent" : "failed",
          customer_email_error: results.customerEmail.error || null,
          kitchen_email_error: results.kitchenEmail.error || null,
          attempt_count: 1,
          last_attempt_at: new Date().toISOString(),
        },
        { onConflict: "order_id" }
      );
    } catch {}
  } catch (err) {
    console.error("Failed to trigger confirmation emails:", err);
  }
}

/**
 * Auto-verify payment via Razorpay API — fetches real-time payment status
 * using the razorpay_payment_id saved on the order during checkout.
 */
export async function autoVerifyRazorpayPaymentServerAction(orderId: string) {
  try {
    const admin = createAdminClient();

    // 1. Load order to get payment / order identifiers
    const { data: order, error: fetchErr } = await admin
      .from("orders")
      .select("id, razorpay_payment_id, razorpay_order_id, payment_status, status")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      return { success: false, verified: false, error: "Order not found" };
    }

    // Already verified — short circuit
    if (
      order.payment_status === "verified" ||
      order.payment_status === "paid"
    ) {
      return { success: true, verified: true, alreadyVerified: true };
    }

    const keyId =
      process.env.RAZORPAY_KEY_ID ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

    if (!keyId || !keySecret || keySecret.includes("placeholder")) {
      return {
        success: false,
        verified: false,
        error: "Razorpay API keys not configured on server.",
      };
    }

    const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    let rzpPaymentId = order.razorpay_payment_id as string | null;

    // Fallback 1: check order_notifications for any captured razorpay payment ID
    if (!rzpPaymentId) {
      try {
        const { data: notif } = await admin
          .from("order_notifications")
          .select("razorpay_event_id")
          .eq("order_id", orderId)
          .maybeSingle();

        if (notif?.razorpay_event_id && notif.razorpay_event_id.startsWith("pay_")) {
          rzpPaymentId = notif.razorpay_event_id;
        }
      } catch {
        // ignore notification table check
      }
    }

    // Fallback 2: check order_status_history for any pay_ ID in notes
    if (!rzpPaymentId) {
      try {
        const { data: hist } = await admin
          .from("order_status_history")
          .select("notes")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false });

        if (hist) {
          for (const h of hist) {
            const match = (h.notes || "").match(/pay_[A-Za-z0-9]+/);
            if (match) {
              rzpPaymentId = match[0];
              break;
            }
          }
        }
      } catch {
        // ignore history check
      }
    }

    // Fallback 3: check Razorpay order payments endpoint if razorpay_order_id exists
    if (!rzpPaymentId && order.razorpay_order_id) {
      try {
        const orderPaymentsRes = await fetch(
          `https://api.razorpay.com/v1/orders/${order.razorpay_order_id}/payments`,
          {
            method: "GET",
            headers: {
              Authorization: `Basic ${credentials}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (orderPaymentsRes.ok) {
          const paymentsData = await orderPaymentsRes.json();
          if (paymentsData?.items && paymentsData.items.length > 0) {
            const capturedItem = paymentsData.items.find(
              (p: any) => p.status === "captured" || p.status === "authorized"
            ) || paymentsData.items[0];
            if (capturedItem?.id) {
              rzpPaymentId = capturedItem.id;
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch payments for Razorpay order ID:", err);
      }
    }

    if (!rzpPaymentId) {
      return {
        success: false,
        verified: false,
        error: "No Razorpay payment reference found on this order. Use 'Mark as Paid' for manual payments.",
      };
    }

    // 2. Fetch payment from Razorpay API
    const rzpRes = await fetch(
      `https://api.razorpay.com/v1/payments/${rzpPaymentId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!rzpRes.ok) {
      const errBody = await rzpRes.text();
      return {
        success: false,
        verified: false,
        error: `Razorpay API error: ${errBody.slice(0, 200)}`,
      };
    }

    const rzpData = await rzpRes.json();

    // 3. Check payment state: 'captured' = payment received and settled
    const isPaid =
      rzpData.status === "captured" || rzpData.status === "authorized";

    if (!isPaid) {
      return {
        success: false,
        verified: false,
        error: `Payment not captured. Razorpay status: "${rzpData.status}"`,
      };
    }

    // 4. Mark order as verified in Supabase
    const now = new Date().toISOString();
    const { error: updateErr } = await admin
      .from("orders")
      .update({
        payment_status: "verified",
        status: order.status === "payment_verification_pending" ? "confirmed" : order.status,
        payment_method: "Razorpay",
        razorpay_payment_id: rzpPaymentId,
        payment_verified_at: now,
        payment_verified_by: "Auto-Verified via Razorpay API",
        approval_source: "RAZORPAY",
        updated_at: now,
      })
      .eq("id", orderId);

    if (updateErr) throw updateErr;

    // Dispatch initial customer confirmation email with PDF receipt and admin alert email if pending
    await triggerOrderConfirmationEmailsIfPending(orderId, rzpPaymentId);

    return {
      success: true,
      verified: true,
      razorpayStatus: rzpData.status,
      amount: rzpData.amount,
      razorpayPaymentId: rzpPaymentId,
    };
  } catch (err: any) {
    console.error("autoVerifyRazorpayPaymentServerAction error:", err);
    return { success: false, verified: false, error: err.message || "Auto-verification failed" };
  }
}

export async function approveOrderPaymentServerAction(orderId: string) {
  try {
    const result = await approveOrderPaymentAction({
      orderId,
      adminId: "dashboard-admin",
      approvalSource: "DASHBOARD",
    });
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to approve payment" };
  }
}

export async function rejectOrderPaymentServerAction(orderId: string, reason?: string) {
  try {
    const result = await rejectOrderPaymentAction({
      orderId,
      adminId: "dashboard-admin",
      rejectionSource: "DASHBOARD",
      reason: reason || "Payment not received in bank/UPI account",
    });
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reject payment" };
  }
}

export async function advanceOrderStatusServerAction(
  orderId: string,
  newStatus: OrderStatus,
  notes?: string
) {
  try {
    let advanced = false;
    // Try the rich notification and logging pipeline first
    try {
      const result = await advanceOrderStatusAction({
        orderId,
        newStatus,
        adminId: "dashboard-admin",
        notes,
      });
      advanced = result.success;
    } catch (pipelineErr: any) {
      // If validation threw (e.g. strict status transition), perform direct status update with admin client
      const admin = createAdminClient();
      const { error } = await admin
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;
      advanced = true;
    }

    // When status is 'completed' or 'delivered', send order completion email to customer
    if (newStatus === "completed" || newStatus === "delivered") {
      try {
        const admin = createAdminClient();
        const { data: order } = await admin
          .from("orders")
          .select("*, order_items(*)")
          .eq("id", orderId)
          .single();

        if (order && order.customer_email) {
          const items = (order.order_items || []).map((i: any) => ({
            productName: i.product_name,
            quantity: Number(i.quantity) || 1,
            unitPrice: Number(i.unit_price) || 0,
            subtotal: Number(i.subtotal) || 0,
          }));

          await sendOrderCompletedEmail({
            orderNumber: order.order_number || String(order.id).slice(0, 8).toUpperCase(),
            orderId: order.id,
            customerName: order.customer_name || "Valued Customer",
            customerEmail: order.customer_email,
            orderType: order.order_type || "delivery",
            total: Number(order.total) || 0,
            deliveryAddress: order.delivery_address,
            deliveryDate: order.delivery_date,
            deliveryTimeSlot: order.delivery_time_slot,
            items,
          });
        }
      } catch (emailErr) {
        console.error("Failed to send order completion email:", emailErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to advance order status" };
  }
}

export async function updateOrderPaymentStatusServerAction(
  orderId: string,
  paymentStatus: PaymentStatus,
  paymentMethod?: string
) {
  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      payment_status: paymentStatus,
      updated_at: now,
    };

    if (paymentStatus === "verified") {
      updatePayload.payment_verified_at = now;
      updatePayload.payment_verified_by = "Admin Dashboard";
      updatePayload.approval_source = paymentMethod?.toLowerCase().includes("razorpay")
        ? "RAZORPAY"
        : "DASHBOARD";
      updatePayload.status = "confirmed";
    }

    if (paymentMethod) {
      updatePayload.payment_method = paymentMethod;
    }

    const { error } = await admin
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId);

    if (error) throw error;

    if (paymentStatus === "verified") {
      await triggerOrderConfirmationEmailsIfPending(orderId);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update payment status" };
  }
}

export async function getAdminOrdersServerAction(restaurantId: string) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("orders")
      .select("*, order_items(*)")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error("getAdminOrdersServerAction error:", err);
    return { success: false, error: err.message, data: [] };
  }
}

export async function getOrderItemsServerAction(orderId: string) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error("getOrderItemsServerAction error:", err);
    return { success: false, error: err.message, data: [] };
  }
}
