import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import type {
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  ApprovalSource,
} from "@/types/database";
import { generateOrderReceiptPdf } from "./pdf-generator";
import {
  sendWhatsAppMessage,
  sendCustomerOrderEmail,
  sendAdminNewOrderEmail,
  ADMIN_WHATSAPP_NUMBER,
  BAKERY_NAME,
  SITE_URL,
} from "./notifications";

const ACTION_SECRET = process.env.ORDER_ACTION_SECRET || "the-indulgent-spoon-secret-key-2026";

/**
 * Generate a short compact HMAC signature for WhatsApp 1-click actions
 */
export function generateActionSignature(orderId: string, action: "approve" | "reject"): string {
  return crypto
    .createHmac("sha256", ACTION_SECRET)
    .update(`${orderId}:${action}`)
    .digest("hex")
    .slice(0, 12);
}

/**
 * Generate a secure URL for WhatsApp 1-click action
 */
export function generateActionUrl(orderId: string, action: "approve" | "reject"): string {
  const sig = generateActionSignature(orderId, action);
  return `${SITE_URL}/api/order-action?id=${encodeURIComponent(orderId)}&a=${action}&s=${sig}`;
}

/**
 * Backwards compatible legacy token generator
 */
export function generateActionToken(orderId: string, action: "approve" | "reject", adminId: string = "admin"): string {
  return generateActionSignature(orderId, action);
}

/**
 * Verify signed action token or parameters
 */
export function verifyActionToken(params: {
  token?: string | null;
  id?: string | null;
  action?: string | null;
  sig?: string | null;
}): {
  valid: boolean;
  orderId?: string;
  action?: "approve" | "reject";
  adminId?: string;
  error?: string;
} {
  try {
    // 1. Direct compact signature check
    if (params.id && params.action && params.sig) {
      const act = params.action as "approve" | "reject";
      if (act !== "approve" && act !== "reject") {
        return { valid: false, error: "Invalid action parameter" };
      }
      const expectedSig = generateActionSignature(params.id, act);
      if (params.sig === expectedSig) {
        return { valid: true, orderId: params.id, action: act, adminId: "whatsapp-admin" };
      }
      return { valid: false, error: "Invalid action signature" };
    }

    // 2. Legacy base64 token check fallback
    if (params.token) {
      try {
        const raw = Buffer.from(params.token, "base64url").toString("utf-8");
        const parts = raw.split(":");
        if (parts.length >= 2) {
          return { valid: true, orderId: parts[0], action: parts[1] as any, adminId: "whatsapp-admin" };
        }
      } catch {}
    }

    return { valid: false, error: "Missing action parameters" };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

/**
 * 1. Customer clicks "I PAID" -> set payment_verification_pending, alert admin
 */
export async function submitCustomerPaymentAction(payload: {
  orderId: string;
  customerPhone?: string;
}) {
  let supabase;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    supabase = createAdminClient();
  } catch {
    supabase = await createClient();
  }

  // 1. Fetch order (flexible lookup by id or order_number)
  let order: any = null;
  const { data: orderData, error: orderErr } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", payload.orderId)
    .maybeSingle();

  if (!orderErr && orderData) {
    order = orderData;
  } else {
    // Fallback: try lookup by order_number or tracking_token
    const { data: fallbackData } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .or(`order_number.eq.${payload.orderId},tracking_token.eq.${payload.orderId}`)
      .maybeSingle();
    order = fallbackData;
  }

  const orderId = order?.id || payload.orderId;
  const orderNum = order?.order_number || `#${orderId.slice(0, 8).toUpperCase()}`;
  const trackingToken = order?.tracking_token || orderId;
  const now = new Date().toISOString();

  // 2. If already verified, return idempotent success
  if (order?.payment_status === "verified") {
    return {
      success: true,
      alreadyVerified: true,
      orderNumber: orderNum,
      trackingToken,
    };
  }

  // 3. Update status atomically if not already pending verification
  try {
    await supabase
      .from("orders")
      .update({
        payment_status: "verification_pending",
        status: "payment_verification_pending",
        payment_submitted_at: now,
      })
      .eq("id", orderId);
  } catch (err) {
    console.warn("Full order update failed, trying status-only update:", err);
    try {
      await supabase
        .from("orders")
        .update({ status: "payment_verification_pending" })
        .eq("id", orderId);
    } catch (e2) {
      console.warn("Status update fallback error:", e2);
    }
  }

  // 4. Record in status history & audit log safely
  try {
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      status: "payment_verification_pending",
      changed_by: "customer",
      notes: "Customer confirmed manual UPI payment submission",
    });
  } catch (e) {
    // ignore if table does not exist
  }

  try {
    await supabase.from("audit_logs").insert({
      order_id: orderId,
      action: "PAYMENT_SUBMITTED_BY_CUSTOMER",
      source: "CUSTOMER_UI",
      metadata: { total: order?.total, method: "UPI" },
    });
  } catch (e) {
    // ignore if table does not exist
  }

  // 5. Generate admin action URLs (clean, short & 100% clickable)
  const approveUrl = generateActionUrl(orderId, "approve");
  const rejectUrl = generateActionUrl(orderId, "reject");
  const adminDashboardUrl = `${SITE_URL}/admin/orders`;

  // 6. Send Admin WhatsApp Notification
  try {
    const itemsList =
      order?.order_items && order.order_items.length > 0
        ? order.order_items.map((i: any) => `• ${i.product_name} × ${i.quantity}`).join("\n")
        : `Order value ₹${order?.total || "N/A"}`;

    const dateFormatted = order?.delivery_date
      ? new Date(order.delivery_date + "T00:00:00").toLocaleDateString("en-IN", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : "Scheduled";

    const adminMsg =
      `🔔 *PAYMENT VERIFICATION REQUIRED*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `*Order Reference:* ${orderNum}\n` +
      `*Customer:* ${order?.customer_name || "Customer"}\n` +
      `*Phone:* +91 ${order?.customer_phone || payload.customerPhone || "N/A"}\n\n` +
      `*Items:*\n${itemsList}\n\n` +
      `*Total Amount:* ₹${order?.total || "N/A"} (UPI)\n` +
      `*Status:* Customer clicked "I PAID"\n` +
      `*Fulfillment:* ${order?.order_type === "delivery" ? "🛵 Home Delivery" : "🛍️ Store Pickup"}\n` +
      `*Scheduled:* ${dateFormatted} (${order?.delivery_time_slot || "Scheduled"})\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👇 *TAP A BUTTON BELOW TO VERIFY:*\n\n` +
      `✅ *[ APPROVE PAYMENT ]*\n${approveUrl}\n\n` +
      `❌ *[ MONEY NOT RECEIVED ]*\n${rejectUrl}\n\n` +
      `🔗 *[ Admin Dashboard ]*\n${adminDashboardUrl}\n` +
      `━━━━━━━━━━━━━━━━━━`;

    const cleanAdminNum = ADMIN_WHATSAPP_NUMBER.replace(/\D/g, "");
    const adminTarget = cleanAdminNum.startsWith("91") ? cleanAdminNum : `91${cleanAdminNum}`;
    const adminWhatsAppUrl = `https://wa.me/${adminTarget}?text=${encodeURIComponent(adminMsg)}`;

    await sendWhatsAppMessage({
      to: ADMIN_WHATSAPP_NUMBER,
      messageText: adminMsg,
      orderId: orderId,
      type: "ADMIN_PAYMENT_PENDING",
    });

    // Also dispatch instant email to bakery/kitchen inbox with 1-click approve link
    try {
      await sendAdminNewOrderEmail({
        orderId,
        orderNumber: orderNum,
        customerName: order?.customer_name || "Customer",
        customerPhone: order?.customer_phone || payload.customerPhone || "N/A",
        total: order?.total || 0,
        orderType: order?.order_type || "delivery",
        deliveryDate: order?.delivery_date,
        deliveryTimeSlot: order?.delivery_time_slot,
        itemsList,
        approveUrl,
        rejectUrl,
      });
    } catch (emailErr) {
      console.warn("Kitchen email notice dispatch failed:", emailErr);
    }

    return {
      success: true,
      orderNumber: orderNum,
      trackingToken,
      adminWhatsAppUrl,
    };
  } catch (err) {
    console.error("Failed to send admin WhatsApp alert:", err);
  }

  const cleanAdminNum = ADMIN_WHATSAPP_NUMBER.replace(/\D/g, "");
  const adminTarget = cleanAdminNum.startsWith("91") ? cleanAdminNum : `91${cleanAdminNum}`;
  const fallbackAdminUrl = `https://wa.me/${adminTarget}?text=${encodeURIComponent(
    `🔔 PAYMENT VERIFICATION REQUIRED for Order ${orderNum}. Total: ₹${order?.total || ""}. Click to verify: ${approveUrl}`
  )}`;

  return {
    success: true,
    orderNumber: orderNum,
    trackingToken,
    adminWhatsAppUrl: fallbackAdminUrl,
  };
}

/**
 * 2. Admin approves payment -> atomic update, PDF receipt, customer WhatsApp + Email
 */
export async function approveOrderPaymentAction(payload: {
  orderId: string;
  adminId?: string;
  approvalSource: ApprovalSource;
}) {
  let supabase: any;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    supabase = createAdminClient();
  } catch {
    supabase = await createClient();
  }

  // 1. Fetch order
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", payload.orderId)
    .single();

  if (orderErr || !order) {
    throw new Error("Order not found.");
  }

  // 2. Idempotency guard: If already approved/verified, return immediately
  if (order.payment_status === "verified" && order.status !== "payment_verification_pending") {
    return {
      success: true,
      alreadyVerified: true,
      order,
    };
  }

  const now = new Date().toISOString();
  const orderNum = order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`;

  // 3. Atomically update order to verified + confirmed
  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      payment_status: "verified",
      status: "confirmed",
      payment_verified_at: now,
      payment_verified_by: payload.adminId || "admin",
      approval_source: payload.approvalSource,
    })
    .eq("id", order.id);

  if (updateErr) {
    throw new Error(`Failed to update order status: ${updateErr.message}`);
  }

  // 4. Record in status history
  await supabase.from("order_status_history").insert({
    order_id: order.id,
    status: "confirmed",
    changed_by: payload.adminId || "admin",
    notes: `Payment verified via ${payload.approvalSource}`,
  });

  // 5. Record in audit log
  await supabase.from("audit_logs").insert({
    order_id: order.id,
    action: "PAYMENT_APPROVED",
    admin_id: payload.adminId || "admin",
    source: payload.approvalSource,
    metadata: {
      verifiedAt: now,
      total: order.total,
    },
  });

  // 6. Generate Receipt PDF
  const itemsForPdf = (order.order_items || []).map((i: any) => ({
    name: i.product_name,
    quantity: i.quantity,
    unitPrice: i.unit_price,
    subtotal: i.subtotal,
  }));

  const pdfDoc = generateOrderReceiptPdf({
    orderNumber: orderNum,
    orderId: order.id,
    createdAt: order.created_at || now,
    orderType: order.order_type,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerEmail: order.customer_email,
    deliveryAddress: order.delivery_address,
    pickupLocation: order.pickup_location,
    deliveryDate: order.delivery_date,
    deliveryTimeSlot: order.delivery_time_slot,
    items: itemsForPdf,
    subtotal: order.subtotal,
    deliveryCharge: order.delivery_charge,
    total: order.total,
    paymentMethod: "UPI",
    paymentStatus: "VERIFIED",
    paymentVerifiedAt: now,
    bakeryName: BAKERY_NAME,
    bakeryPhone: "+91 9691639268",
    bakeryAddress: "The Indulgent Spoon, DLF Phase 4, Gurugram",
  });

  const pdfArrayBuffer = pdfDoc.output("arraybuffer");
  const pdfBuffer = Buffer.from(pdfArrayBuffer);

  // 7. Send Customer WhatsApp Confirmation
  const isDelivery = order.order_type === "delivery";
  const dateFormatted = order.delivery_date
    ? new Date(order.delivery_date + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "Scheduled";

  const customerItemsList =
    order.order_items && order.order_items.length > 0
      ? order.order_items.map((i: any) => `• ${i.product_name} × ${i.quantity}`).join("\n")
      : `Order total ₹${order.total}`;

  let customerMsg =
    `🎉 *ORDER CONFIRMED!*\n\n` +
    `Hi ${order.customer_name} 👋\n\n` +
    `Your bakery order has been confirmed.\n\n` +
    `*Order:* ${orderNum}\n\n` +
    `*Items:*\n${customerItemsList}\n\n` +
    `*Total:* ₹${order.total}\n` +
    `*Payment:* ✓ UPI Payment Received\n\n`;

  if (isDelivery) {
    customerMsg +=
      `*Fulfillment:* 🚚 Delivery\n` +
      `*Date:* ${dateFormatted}\n` +
      `*Time:* ${order.delivery_time_slot || "Scheduled"}\n\n`;
  } else {
    customerMsg +=
      `*Fulfillment:* 🛍️ Takeaway / Pickup\n` +
      `*Pickup Date:* ${dateFormatted}\n` +
      `*Pickup Time:* ${order.delivery_time_slot || "Scheduled"}\n` +
      `*Location:* The Indulgent Spoon, DLF Phase 4, Gurugram\n\n`;
  }

  customerMsg +=
    `Your order has been received by our kitchen team.\n\n` +
    `Thank you for ordering from ${BAKERY_NAME} ❤️`;

  await sendWhatsAppMessage({
    to: order.customer_phone,
    messageText: customerMsg,
    orderId: order.id,
    type: "CUSTOMER_ORDER_CONFIRMED",
  });

  // 8. Send Customer Email Confirmation with PDF attachment
  if (order.customer_email) {
    await sendCustomerOrderEmail({
      orderId: order.id,
      orderNumber: orderNum,
      customerEmail: order.customer_email,
      customerName: order.customer_name,
      total: order.total,
      orderType: order.order_type,
      deliveryDate: order.delivery_date,
      deliveryTimeSlot: order.delivery_time_slot,
      pdfBuffer,
    });
  }

  return {
    success: true,
    orderNumber: orderNum,
  };
}

/**
 * 3. Admin rejects payment -> mark not_received, notify customer
 */
export async function rejectOrderPaymentAction(payload: {
  orderId: string;
  adminId?: string;
  rejectionSource: ApprovalSource;
  reason?: string;
}) {
  let supabase: any;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    supabase = createAdminClient();
  } catch {
    supabase = await createClient();
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", payload.orderId)
    .single();

  if (orderErr || !order) {
    throw new Error("Order not found.");
  }

  const now = new Date().toISOString();
  const orderNum = order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`;

  await supabase
    .from("orders")
    .update({
      payment_status: "not_received",
      status: "pending",
      payment_rejected_at: now,
      payment_rejected_by: payload.adminId || "admin",
      rejection_source: payload.rejectionSource,
    })
    .eq("id", order.id);

  await supabase.from("order_status_history").insert({
    order_id: order.id,
    status: "pending",
    changed_by: payload.adminId || "admin",
    notes: `Payment rejected: ${payload.reason || "Payment not reflected in bank account"}`,
  });

  await supabase.from("audit_logs").insert({
    order_id: order.id,
    action: "PAYMENT_REJECTED",
    admin_id: payload.adminId || "admin",
    source: payload.rejectionSource,
    metadata: { reason: payload.reason || "Money not received" },
  });

  // Notify customer
  const rejectMsg =
    `⚠️ *Payment Update on Order ${orderNum}*\n\n` +
    `Hi ${order.customer_name},\n\n` +
    `We could not verify your UPI payment for Order ${orderNum}. ` +
    `Please contact us at +91 9691639268 or retry the payment.\n\n` +
    `— ${BAKERY_NAME}`;

  await sendWhatsAppMessage({
    to: order.customer_phone,
    messageText: rejectMsg,
    orderId: order.id,
    type: "CUSTOMER_PAYMENT_REJECTED",
  });

  return { success: true };
}

/**
 * 4. Advance Order Status (Kitchen / Baking / Delivery pipeline)
 */
export async function advanceOrderStatusAction(payload: {
  orderId: string;
  newStatus: OrderStatus;
  adminId?: string;
  notes?: string;
}) {
  const supabase = await createClient();

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", payload.orderId)
    .single();

  if (orderErr || !order) {
    throw new Error("Order not found.");
  }

  const isDelivery = order.order_type === "delivery";
  const orderNum = order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`;

  // Strict state validation based on fulfillment type
  if (isDelivery && payload.newStatus === "ready_for_pickup") {
    throw new Error("Cannot set 'Ready for Pickup' on a Home Delivery order.");
  }
  if (!isDelivery && payload.newStatus === "out_for_delivery") {
    throw new Error("Cannot set 'Out for Delivery' on a Takeaway / Pickup order.");
  }

  await supabase
    .from("orders")
    .update({ status: payload.newStatus })
    .eq("id", order.id);

  await supabase.from("order_status_history").insert({
    order_id: order.id,
    status: payload.newStatus,
    changed_by: payload.adminId || "admin",
    notes: payload.notes || `Status advanced to ${payload.newStatus}`,
  });

  await supabase.from("audit_logs").insert({
    order_id: order.id,
    action: "ORDER_STATUS_CHANGED",
    admin_id: payload.adminId || "admin",
    source: "DASHBOARD",
    metadata: { oldStatus: order.status, newStatus: payload.newStatus },
  });

  // Automated status-specific WhatsApp notifications to customer
  let notificationText: string | null = null;

  if (payload.newStatus === "out_for_delivery") {
    notificationText =
      `🚚 *YOUR ORDER IS ON THE WAY!*\n\n` +
      `Order ${orderNum}\n\n` +
      `Your freshly baked order is out for delivery.\n` +
      `Delivery slot: ${order.delivery_time_slot || "Scheduled window"}\n\n` +
      `— ${BAKERY_NAME} ❤️`;
  } else if (payload.newStatus === "delivered") {
    notificationText =
      `🎉 *ORDER DELIVERED!*\n\n` +
      `Your order ${orderNum} has been delivered.\n` +
      `Thank you for ordering from ${BAKERY_NAME} ❤️\n\n` +
      `We hope you enjoy every bite!`;
  } else if (payload.newStatus === "ready_for_pickup") {
    notificationText =
      `🛍️ *YOUR ORDER IS READY FOR PICKUP!*\n\n` +
      `Order ${orderNum}\n\n` +
      `Your order is freshly prepared and packed ready for pickup.\n` +
      `Pickup Location: The Indulgent Spoon, DLF Phase 4, Gurugram\n` +
      `Pickup Slot: ${order.delivery_time_slot || "Scheduled window"}\n\n` +
      `— ${BAKERY_NAME} ❤️`;
  }

  if (notificationText) {
    await sendWhatsAppMessage({
      to: order.customer_phone,
      messageText: notificationText,
      orderId: order.id,
      type: `STATUS_${payload.newStatus.toUpperCase()}`,
    });
  }

  return { success: true, status: payload.newStatus };
}
