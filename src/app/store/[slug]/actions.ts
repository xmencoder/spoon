"use server";

import { createClient } from "@/lib/supabase/server";
import type { OrderType } from "@/types/database";

export interface CheckoutFormData {
  orderType: OrderType;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  cartItems: { productId: string; quantity: number }[];
  restaurantId: string;
  restaurantSlug: string;
  whatsappNumber: string;
  deliveryCharge: number;
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

    // 1. Re-fetch product prices from DB — never trust client pricing
    const productIds = data.cartItems.map((i) => i.productId);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, available")
      .in("id", productIds)
      .eq("restaurant_id", data.restaurantId);

    if (productsError || !products) {
      return { success: false, error: "Failed to verify product prices." };
    }

    // 2. Check all products are still available
    const unavailable = products.filter((p) => !p.available);
    if (unavailable.length > 0) {
      return {
        success: false,
        error: `"${unavailable[0].name}" is no longer available. Please remove it from your cart.`,
      };
    }

    // 3. Build order items with server-side prices
    const orderItems = data.cartItems.map((cartItem) => {
      const product = products.find((p) => p.id === cartItem.productId);
      if (!product) throw new Error(`Product not found: ${cartItem.productId}`);
      return {
        productId: cartItem.productId,
        productName: product.name,
        quantity: cartItem.quantity,
        unitPrice: product.price,
        subtotal: product.price * cartItem.quantity,
      };
    });

    const subtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);
    const deliveryCharge =
      data.orderType === "delivery" ? data.deliveryCharge : 0;
    const total = subtotal + deliveryCharge;

    // 4. Create order record
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        restaurant_id: data.restaurantId,
        customer_name: data.customerName.trim(),
        customer_phone: data.customerPhone.trim(),
        delivery_address:
          data.orderType === "delivery"
            ? data.deliveryAddress.trim()
            : null,
        order_type: data.orderType,
        subtotal,
        delivery_charge: deliveryCharge,
        total,
        status: "pending",
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Order creation error:", orderError);
      return { success: false, error: "Failed to create order. Please try again." };
    }

    // 5. Create order_items
    const { error: itemsError } = await supabase.from("order_items").insert(
      orderItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.subtotal,
      }))
    );

    if (itemsError) {
      console.error("Order items error:", itemsError);
      // Don't fail — order is created, items just failed
    }

    // 6. Build WhatsApp message
    const shortId = order.id.slice(0, 8).toUpperCase();
    let msg = `*New Order #${shortId}*\n`;
    msg += `━━━━━━━━━━━━━━\n`;
    msg += `*Customer:* ${data.customerName}\n`;
    msg += `*Phone:* ${data.customerPhone}\n`;
    msg += `*Type:* ${data.orderType === "delivery" ? "🛵 Home Delivery" : "🛍️ Takeaway"}\n`;
    if (data.orderType === "delivery" && data.deliveryAddress) {
      msg += `*Address:* ${data.deliveryAddress}\n`;
    }
    msg += `━━━━━━━━━━━━━━\n`;
    msg += `*Items:*\n`;
    for (const item of orderItems) {
      msg += `• ${item.productName} × ${item.quantity} — ₹${item.subtotal}\n`;
    }
    msg += `━━━━━━━━━━━━━━\n`;
    msg += `*Subtotal:* ₹${subtotal}\n`;
    if (deliveryCharge > 0) {
      msg += `*Delivery:* ₹${deliveryCharge}\n`;
    }
    msg += `*Total:* ₹${total}\n`;
    msg += `━━━━━━━━━━━━━━\n`;
    msg += `Powered by The Indulgent Spoon`;

    const rawPhone = data.whatsappNumber.replace(/[^0-9]/g, "");
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

    return {
      success: true,
      orderId: order.id,
      whatsappUrl,
    };
  } catch (err: unknown) {
    console.error("createOrder server action error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong.",
    };
  }
}
