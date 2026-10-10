"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderType } from "@/types/database";
import { calculateRoadDistanceAndCharge } from "@/lib/delivery-config";

export interface CartItemPayload {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  sizeLabel?: string;
  addons?: Array<{ id: string; label: string; price: number }>;
}

export interface CheckoutFormData {
  orderType: OrderType;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  alternatePhone?: string;
  deliveryAddress: string;
  addressType?: "home" | "office" | "other";
  cartItems: CartItemPayload[];
  restaurantId: string;
  restaurantSlug: string;
  whatsappNumber: string;
  deliveryCharge: number;
  packagingCharge?: number;
  giftNote?: string;
  hasGiftNote?: boolean;
  deliverySlotId?: string;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  deliveryStartTime?: string;
  deliveryEndTime?: string;
}

export interface CreateOrderResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  trackingToken?: string;
  whatsappUrl?: string;
  error?: string;
}

export async function createOrder(
  data: CheckoutFormData
): Promise<CreateOrderResult> {
  try {
    const supabase = await createClient();

    // 1. Build order items from payload
    // Pre‑check product order limits before creating the order
    const productIds = data.cartItems.map((ci) => ci.productId);
    const { data: prodInfo, error: prodInfoErr } = await supabase
      .from('products')
      .select('id, order_limit, total_ordered')
      .in('id', productIds);

    if (!prodInfoErr && prodInfo) {
      const prodMap: Record<string, any> = {};
      prodInfo.forEach((p) => {
        prodMap[p.id] = p;
      });

      for (const ci of data.cartItems) {
        const p = prodMap[ci.productId];
        if (!p) continue;
        const prospective = (Number(p.total_ordered) || 0) + ci.quantity;
        if (p.order_limit && prospective > p.order_limit) {
          throw new Error(`Product "${ci.productName}" exceeds its order limit of ${p.order_limit}`);
        }
      }
    }

    // 1.5. If delivery/pickup slot is selected, check capacity
    if (data.deliverySlotId && !data.deliverySlotId.startsWith("fallback-")) {
      const { data: slotData, error: slotErr } = await supabase
        .from("delivery_slots")
        .select("id, capacity, current_order_count, is_active, is_closed")
        .eq("id", data.deliverySlotId)
        .maybeSingle();

      if (!slotErr && slotData) {
        if (slotData.is_closed) {
          throw new Error("The selected delivery slot is currently closed for bookings.");
        }
        if (!slotData.is_active) {
          throw new Error("The selected delivery slot is no longer active.");
        }
        if (slotData.current_order_count >= slotData.capacity) {
          throw new Error("The selected delivery slot has reached full capacity. Please choose another time slot.");
        }

        // Increment current_order_count
        await supabase
          .from("delivery_slots")
          .update({
            current_order_count: slotData.current_order_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.deliverySlotId);
      }
    }

    const orderItems = data.cartItems.map((cartItem) => {
      let displayName = cartItem.productName;
      if (cartItem.sizeLabel) {
        displayName += ` (${cartItem.sizeLabel})`;
      }
      if (cartItem.addons && cartItem.addons.length > 0) {
        const addonText = cartItem.addons
          .map((a) => `${a.label} (+₹${a.price})`)
          .join(", ");
        displayName += ` [${addonText}]`;
      }

      const unitPrice = cartItem.unitPrice;
      const subtotal = unitPrice * cartItem.quantity;

      return {
        productId: cartItem.productId,
        productName: displayName,
        quantity: cartItem.quantity,
        unitPrice,
        subtotal,
      };
    });

    // Add gift note / message card as a distinct order item if requested
    if (data.hasGiftNote && data.giftNote?.trim()) {
      orderItems.push({
        productId: null as any,
        productName: `💌 Message Card: "${data.giftNote.trim()}"`,
        quantity: 1,
        unitPrice: 40,
        subtotal: 40,
      });
    }

    const itemsSubtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);

    // 2. Server-side validation of delivery charge (never trust browser value)
    let calculatedDeliveryCharge = 0;
    let calculatedDistanceKm: number | null = null;

    if (data.orderType === "delivery") {
      const address = data.deliveryAddress?.trim();
      if (!address || address.length < 3) {
        throw new Error("Please enter a valid delivery address.");
      }

      const distResult = await calculateRoadDistanceAndCharge(address);
      if (!distResult.success || !distResult.available || distResult.deliveryCharge === null) {
        throw new Error(distResult.error || "Delivery is unavailable for the specified address.");
      }

      calculatedDistanceKm = distResult.distanceKm;
      calculatedDeliveryCharge = distResult.deliveryCharge;
    } else {
      calculatedDeliveryCharge = 0;
      calculatedDistanceKm = null;
    }

    const packagingCharge = data.packagingCharge || Math.round(itemsSubtotal * 0.04);
    const giftNoteCharge = data.hasGiftNote ? 40 : 0;
    const total =
      itemsSubtotal + calculatedDeliveryCharge + packagingCharge + giftNoteCharge;

    // Generate readable order number and secure tracking token
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedOrderNumber = `${randomSuffix}`;
    const generatedTrackingToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 3. Create order record with delivery slot details using admin client
    const admin = createAdminClient();

    const orderPayload: any = {
      restaurant_id: data.restaurantId,
      order_number: generatedOrderNumber,
      tracking_token: generatedTrackingToken,
      customer_name: data.customerName.trim(),
      customer_phone: data.customerPhone.trim(),
      customer_email: data.customerEmail?.trim() || null,
      alternate_phone: data.alternatePhone?.trim() || null,
      delivery_address:
        data.orderType === "delivery" ? data.deliveryAddress.trim() : null,
      pickup_location:
        data.orderType === "takeaway" ? "The Indulgent Spoon, DLF Phase 4, Gurugram" : null,
      order_type: data.orderType,
      subtotal: itemsSubtotal,
      delivery_charge: calculatedDeliveryCharge,
      total,
      payment_method: "UPI",
      payment_status: "unpaid",
      status: "payment_verification_pending",
    };

    // Store delivery/pickup slot data for both order types
    if (data.deliveryDate) {
      orderPayload.delivery_date = data.deliveryDate;
      orderPayload.delivery_time_slot = data.deliveryTimeSlot || null;
      orderPayload.delivery_start_time = data.deliveryStartTime || null;
      orderPayload.delivery_end_time = data.deliveryEndTime || null;
      if (data.deliverySlotId && !data.deliverySlotId.startsWith("fallback-")) {
        orderPayload.delivery_slot_id = data.deliverySlotId;
      }
    }

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert(orderPayload)
      .select()
      .single();

    if (orderError || !order) {
      console.error("Order creation error:", orderError);
      throw new Error(orderError?.message || "Failed to initialize order.");
    }

    const orderId = order.id;
    const orderNumber = order.order_number || generatedOrderNumber;
    const trackingToken = order.tracking_token || generatedTrackingToken;

    // 4. Insert order items with admin client (bypasses RLS reliably)
    const validUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Check which prospective product IDs actually exist in the products table
    const prospectiveIds = orderItems
      .map((i) => i.productId)
      .filter((id): id is string => Boolean(id && validUuidRegex.test(id)));

    const existingIdSet = new Set<string>();
    if (prospectiveIds.length > 0) {
      try {
        const { data: matchedProds } = await admin
          .from("products")
          .select("id")
          .in("id", prospectiveIds);
        if (matchedProds) {
          matchedProds.forEach((p) => existingIdSet.add(p.id));
        }
      } catch (checkErr) {
        console.warn("Could not check product ID existence:", checkErr);
      }
    }

    const itemsToInsert = orderItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId && existingIdSet.has(item.productId) ? item.productId : null,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.subtotal,
    }));

    const { error: itemsInsertError } = await admin.from("order_items").insert(itemsToInsert);

    if (itemsInsertError) {
      console.error("Failed to insert order items, trying safe fallback with null product_ids:", itemsInsertError);
      // Fallback: guaranteed insert with product_id: null so items are NEVER lost
      const safeFallbackItems = itemsToInsert.map((i) => ({ ...i, product_id: null }));
      const { error: fallbackErr } = await admin.from("order_items").insert(safeFallbackItems);
      if (fallbackErr) {
        console.error("Critical: Fallback order_items insert also failed:", fallbackErr);
      }
    }

    // Initial status history
    await admin.from("order_status_history").insert({
      order_id: order.id,
      status: "payment_verification_pending",
      changed_by: "customer",
      notes: "Order created, waiting for UPI payment submission",
    });

    // Increment total_ordered for each ordered product
    for (const item of data.cartItems) {
      if (item.productId) {
        const { data: prod } = await supabase
          .from("products")
          .select("total_ordered")
          .eq("id", item.productId)
          .single();

        const currentCount = prod?.total_ordered || 0;
        await supabase
          .from("products")
          .update({ total_ordered: currentCount + item.quantity })
          .eq("id", item.productId);
      }
    }

    // 5. Build WhatsApp URL
    let msg = `🍰 *New Bakery Order #${orderNumber}*\n`;
    msg += `━━━━━━━━━━━━━━\n`;
    msg += `*Customer:* ${data.customerName}\n`;
    msg += `*Phone:* ${data.customerPhone}\n`;
    if (data.alternatePhone) {
      msg += `*Alt Phone:* ${data.alternatePhone}\n`;
    }
    if (data.customerEmail) {
      msg += `*Email:* ${data.customerEmail}\n`;
    }
    msg += `*Type:* ${
      data.orderType === "delivery" ? "🛵 Home Delivery" : "🛍️ Store Pickup"
    }\n`;

    if (data.orderType === "delivery") {
      if (data.deliveryDate) {
        const dObj = new Date(data.deliveryDate + "T00:00:00");
        const formattedDeliveryDate = isNaN(dObj.getTime())
          ? data.deliveryDate
          : dObj.toLocaleDateString("en-IN", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });
        msg += `*Delivery Date:* ${formattedDeliveryDate}\n`;
      }
      if (data.deliveryTimeSlot) {
        msg += `*Time Slot:* ⏰ ${data.deliveryTimeSlot}\n`;
      }
      if (data.deliveryAddress) {
        const typeTag = data.addressType ? ` (${data.addressType.toUpperCase()})` : "";
        msg += `*Address${typeTag}:* ${data.deliveryAddress}\n`;
      }
    }

    if (data.orderType === "takeaway") {
      if (data.deliveryDate) {
        const dObj = new Date(data.deliveryDate + "T00:00:00");
        const formattedPickupDate = isNaN(dObj.getTime())
          ? data.deliveryDate
          : dObj.toLocaleDateString("en-IN", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });
        msg += `*Pickup Date:* ${formattedPickupDate}\n`;
      }
      if (data.deliveryTimeSlot) {
        msg += `*Pickup Slot:* ⏰ ${data.deliveryTimeSlot}\n`;
      }
      msg += `*Pickup Location:* The Indulgent Spoon, DLF Phase 4, Gurugram\n`;
    }

    msg += `━━━━━━━━━━━━━━\n`;
    msg += `*Items:*\n`;
    for (const item of orderItems) {
      msg += `• ${item.productName} × ${item.quantity} — ₹${item.subtotal}\n`;
    }
    msg += `━━━━━━━━━━━━━━\n`;
    msg += `*Subtotal:* ₹${itemsSubtotal}\n`;
    if (calculatedDeliveryCharge > 0) {
      msg += `*Delivery Fee (${calculatedDistanceKm ? `${calculatedDistanceKm} km` : "Standard"}):* ₹${calculatedDeliveryCharge}\n`;
    } else if (data.orderType === "takeaway") {
      msg += `*Delivery:* Free (Store Pickup)\n`;
    }
    if (packagingCharge > 0) {
      msg += `*Packing & Handling (4%):* ₹${packagingCharge}\n`;
    }
    if (data.hasGiftNote && data.giftNote) {
      msg += `*Gift Note (+₹40):* "${data.giftNote.trim()}"\n`;
    }
    msg += `*Total Amount:* ₹${total}\n`;
    msg += `*Payment:* UPI (Pending Verification)\n`;
    msg += `━━━━━━━━━━━━━━\n`;
    msg += `_Please confirm my order and verify payment._`;

    const cleanNumber = data.whatsappNumber.replace(/\D/g, "");
    const encodedMsg = encodeURIComponent(msg);
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMsg}`;

    return {
      success: true,
      orderId: order.id,
      orderNumber,
      trackingToken,
      whatsappUrl,
    };
  } catch (err: unknown) {
    console.error("createOrder unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to process order. Please try again.",
    };
  }
}

/**
 * Server Action for customer clicking "I PAID" on payment page
 */
export async function submitPaymentConfirmation(payload: {
  orderId: string;
}) {
  const { submitCustomerPaymentAction } = await import("@/lib/order-approval-service");
  return submitCustomerPaymentAction({ orderId: payload.orderId });
}

