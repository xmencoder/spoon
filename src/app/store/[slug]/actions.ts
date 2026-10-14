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

/** Helper to get date string 'YYYY-MM-DD' in Indian Standard Time (Asia/Kolkata) */
export function getISTDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Helper to extract 'YYYY-MM-DD' from an order record */
export function getOrderDateString(order: { delivery_date?: string | null; created_at?: string | null }): string {
  if (order.delivery_date && /^\d{4}-\d{2}-\d{2}$/.test(order.delivery_date.trim())) {
    return order.delivery_date.trim();
  }
  if (order.created_at) {
    return getISTDateString(new Date(order.created_at));
  }
  return getISTDateString();
}

export async function createOrder(
  data: CheckoutFormData
): Promise<CreateOrderResult> {
  try {
    const supabase = await createClient();

    // 0. Validate compulsory customer email
    const trimmedEmail = data.customerEmail?.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      throw new Error("A valid email address is required for order updates and receipt delivery.");
    }

    // Determine target day for this order (per-day limits apply to that day)
    const targetOrderDate = (data.deliveryDate && /^\d{4}-\d{2}-\d{2}$/.test(data.deliveryDate.trim()))
      ? data.deliveryDate.trim()
      : getISTDateString();

    // 1. Build order items from payload
    // Pre‑check product order limits per day before creating the order
    const admin = createAdminClient();
    const productIds = data.cartItems.map((ci) => ci.productId);
    const { data: prodInfo, error: prodInfoErr } = await admin
      .from('products')
      .select('id, order_limit')
      .in('id', productIds);

    if (!prodInfoErr && prodInfo) {
      const prodMap: Record<string, any> = {};
      prodInfo.forEach((p) => {
        prodMap[p.id] = p;
      });

      for (const ci of data.cartItems) {
        const p = prodMap[ci.productId];
        if (!p || !p.order_limit || p.order_limit <= 0) continue;

        const { data: pItems } = await admin
          .from('order_items')
          .select('quantity, orders!inner(status, delivery_date, created_at)')
          .eq('product_id', p.id)
          .neq('orders.status', 'cancelled');

        const prodAlreadyOrdered = (pItems || []).reduce(
          (sum, it: any) => {
            const oDate = getOrderDateString(it.orders);
            return oDate === targetOrderDate ? sum + (Number(it.quantity) || 0) : sum;
          },
          0
        );

        const prospective = prodAlreadyOrdered + ci.quantity;
        if (prospective > p.order_limit) {
          const remaining = Math.max(0, p.order_limit - prodAlreadyOrdered);
          throw new Error(
            remaining === 0
              ? `Sorry, "${ci.productName}" is sold out for ${targetOrderDate}.`
              : `Only ${remaining} unit${remaining === 1 ? '' : 's'} remaining for "${ci.productName}" today (${targetOrderDate}). Please adjust your cart.`
          );
        }
      }
    }

    // 1.2. Pre-check category order limits per day
    // Group cart items by their product's category_id
    const { data: prodCatInfo } = await admin
      .from('products')
      .select('id, category_id')
      .in('id', productIds);

    if (prodCatInfo && prodCatInfo.length > 0) {
      // Collect unique category IDs that have products in cart
      const catIdSet = new Set<string>();
      const prodToCat: Record<string, string> = {};
      prodCatInfo.forEach((p) => {
        if (p.category_id) {
          catIdSet.add(p.category_id);
          prodToCat[p.id] = p.category_id;
        }
      });

      if (catIdSet.size > 0) {
        const catIds = Array.from(catIdSet);

        // Fetch categories with limits
        const { data: catsWithLimit } = await admin
          .from('categories')
          .select('id, name, category_limit')
          .in('id', catIds)
          .not('category_limit', 'is', null);

        const limitedCats = (catsWithLimit || []).filter(
          (c) => c.category_limit != null && c.category_limit > 0
        );

        if (limitedCats.length > 0) {
          // For each limited category, count already-ordered quantities from non-cancelled orders for this day
          for (const cat of limitedCats) {
            // Get all product IDs in this category
            const { data: catProds } = await admin
              .from('products')
              .select('id')
              .eq('category_id', cat.id);

            const catProdIds = (catProds || []).map((p) => p.id);
            if (catProdIds.length === 0) continue;

            const { data: catOrderItems } = await admin
              .from('order_items')
              .select('quantity, orders!inner(status, delivery_date, created_at)')
              .in('product_id', catProdIds)
              .neq('orders.status', 'cancelled');

            const alreadyOrdered = (catOrderItems || []).reduce(
              (sum, oi: any) => {
                const oDate = getOrderDateString(oi.orders);
                return oDate === targetOrderDate ? sum + (Number(oi.quantity) || 0) : sum;
              },
              0
            );

            // How much is this customer adding from this category
            const cartQtyInCat = data.cartItems
              .filter((ci) => prodToCat[ci.productId] === cat.id)
              .reduce((sum, ci) => sum + ci.quantity, 0);

            const prospective = alreadyOrdered + cartQtyInCat;
            if (prospective > cat.category_limit) {
              const remaining = Math.max(0, cat.category_limit - alreadyOrdered);
              throw new Error(
                remaining === 0
                  ? `Sorry, "${cat.name}" is sold out for ${targetOrderDate}.`
                  : `Only ${remaining} unit${remaining === 1 ? '' : 's'} remaining in "${cat.name}" today (${targetOrderDate}). Please adjust your cart.`
              );
            }
          }
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
        data.orderType === "takeaway" ? "The Indulgent Spoon, N 376, 2nd Floor, Mayfield Gardens, Sec 51, Gurgaon 122018" : null,
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

    // 5. Build WhatsApp Ping URL
    let msg = `🧁 *New Order from The Indulgent Spoon* 🧁\n\n`;
    msg += `*Order ID:* #${orderNumber}\n`;
    msg += `*Customer:* ${data.customerName}\n`;
    msg += `*Phone:* ${data.customerPhone}\n`;
    if (data.customerEmail) {
      msg += `*Email:* ${data.customerEmail}\n`;
    }

    msg += `\n`;
    if (data.orderType === "delivery") {
      msg += `📦 *Fulfilment:* Home Delivery\n`;
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
        msg += `🗓️ *Delivery Date:* ${formattedDeliveryDate}\n`;
      }
      if (data.deliveryTimeSlot) {
        msg += `⏰ *Delivery Slot:* ${data.deliveryTimeSlot}\n`;
      }
      if (data.deliveryAddress) {
        const typeTag = data.addressType ? ` (${data.addressType.toUpperCase()})` : "";
        msg += `📍 *Delivery Address${typeTag}:* ${data.deliveryAddress}\n`;
      }
    } else {
      msg += `🛍️ *Fulfilment:* Bakery Takeaway (Self Pickup)\n`;
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
        msg += `🗓️ *Pickup Date:* ${formattedPickupDate}\n`;
      }
      if (data.deliveryTimeSlot) {
        msg += `⏰ *Pickup Slot:* ${data.deliveryTimeSlot}\n`;
      }
      msg += `📍 *Pickup Address:* N 376, 2nd Floor, Mayfield Gardens, Sec 51, Gurgaon\n`;
    }

    msg += `\n🛍️ *Items Ordered:*\n`;
    for (const item of orderItems) {
      msg += `• ${item.productName} × ${item.quantity} — ₹${item.subtotal}\n`;
    }

    msg += `\n💰 *Total Paid:* ₹${total} (Paid Online)\n`;
    if (data.hasGiftNote && data.giftNote) {
      msg += `💌 *Gift Note:* "${data.giftNote.trim()}"\n`;
    }

    msg += `\n_Hi! I've just placed and paid for this order on your website. Please confirm my order. Thank you!_ ✨`;

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

/**
 * Returns a map of categoryId → { limit, totalOrdered, remaining }
 * for all categories in a restaurant that have a category_limit set.
 * Aggregates actual quantities from order_items (excluding cancelled orders)
 * for a specific day (targetDate defaults to today in IST).
 * Category limits reset every day.
 */
export async function getCategoryRemainingStock(
  restaurantId: string,
  targetDate?: string
): Promise<Record<string, { limit: number; totalOrdered: number; remaining: number }>> {
  try {
    const admin = createAdminClient();
    const dateStr = (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate.trim()))
      ? targetDate.trim()
      : getISTDateString();

    // Fetch all categories with a limit for this restaurant
    const { data: cats, error: catErr } = await admin
      .from("categories")
      .select("id, name, category_limit")
      .eq("restaurant_id", restaurantId)
      .not("category_limit", "is", null);

    if (catErr || !cats) return {};

    const limitedCats = cats.filter(
      (c) => c.category_limit != null && c.category_limit > 0
    );

    if (limitedCats.length === 0) return {};

    const catIds = limitedCats.map((c) => c.id);

    // Fetch products belonging to these limited categories
    const { data: products, error: prodErr } = await admin
      .from("products")
      .select("id, category_id")
      .eq("restaurant_id", restaurantId)
      .in("category_id", catIds);

    if (prodErr || !products || products.length === 0) {
      const emptyResult: Record<string, { limit: number; totalOrdered: number; remaining: number }> = {};
      limitedCats.forEach((cat) => {
        const limit = cat.category_limit as number;
        emptyResult[cat.id] = { limit, totalOrdered: 0, remaining: limit };
      });
      return emptyResult;
    }

    const prodToCat: Record<string, string> = {};
    const prodIds: string[] = [];
    products.forEach((p) => {
      if (p.category_id) {
        prodToCat[p.id] = p.category_id;
        prodIds.push(p.id);
      }
    });

    // Query order_items for these products from non-cancelled orders
    const { data: items, error: itemsErr } = await admin
      .from("order_items")
      .select("product_id, quantity, orders!inner(id, status, delivery_date, created_at)")
      .in("product_id", prodIds)
      .neq("orders.status", "cancelled");

    const orderedPerCat: Record<string, number> = {};
    if (!itemsErr && items) {
      items.forEach((it: any) => {
        const oDate = getOrderDateString(it.orders);
        if (oDate === dateStr) {
          const catId = it.product_id ? prodToCat[it.product_id] : null;
          if (catId) {
            orderedPerCat[catId] = (orderedPerCat[catId] || 0) + (Number(it.quantity) || 0);
          }
        }
      });
    }

    const result: Record<string, { limit: number; totalOrdered: number; remaining: number }> = {};
    limitedCats.forEach((cat) => {
      const totalOrdered = orderedPerCat[cat.id] || 0;
      const limit = cat.category_limit as number;
      result[cat.id] = {
        limit,
        totalOrdered,
        remaining: Math.max(0, limit - totalOrdered),
      };
    });

    return result;
  } catch (err) {
    console.error("Error in getCategoryRemainingStock:", err);
    return {};
  }
}
