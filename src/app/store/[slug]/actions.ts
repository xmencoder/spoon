"use server";

import { createClient } from "@/lib/supabase/server";
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
}

export interface CreateOrderResult {
  success: boolean;
  orderId?: string;
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

    // 3. Create order record
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        restaurant_id: data.restaurantId,
        customer_name: data.customerName.trim(),
        customer_phone: data.customerPhone.trim(),
        delivery_address:
          data.orderType === "delivery" ? data.deliveryAddress.trim() : null,
        order_type: data.orderType,
        subtotal: itemsSubtotal,
        delivery_charge: calculatedDeliveryCharge,
        total,
        status: "pending",
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Order creation error:", orderError);
      // Even if database save has issues, we can still generate the WhatsApp link so the customer is never blocked
    }

    const orderId = order?.id || `ORD-${Date.now().toString().slice(-6)}`;
    const shortId = orderId.slice(0, 8).toUpperCase();

    // 3. Try to insert order items if order was saved
    if (order?.id) {
      await supabase.from("order_items").insert(
        orderItems.map((item) => ({
          order_id: order.id,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          subtotal: item.subtotal,
        }))
      );

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
    }

    // 4. Build WhatsApp message
    let msg = `🍰 *New Bakery Order #${shortId}*\n`;
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
    if (data.orderType === "delivery" && data.deliveryAddress) {
      const typeTag = data.addressType ? ` (${data.addressType.toUpperCase()})` : "";
      msg += `*Address${typeTag}:* ${data.deliveryAddress}\n`;
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
    msg += `━━━━━━━━━━━━━━\n`;
    msg += `_Please confirm my order and share payment details._`;

    // 5. Build WhatsApp URL
    const cleanNumber = data.whatsappNumber.replace(/\D/g, "");
    const encodedMsg = encodeURIComponent(msg);
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMsg}`;

    return {
      success: true,
      orderId: order?.id || orderId,
      whatsappUrl,
    };
  } catch (err: unknown) {
    console.error("createOrder unexpected error:", err);
    return {
      success: false,
      error: "Failed to process order. Please try again.",
    };
  }
}
