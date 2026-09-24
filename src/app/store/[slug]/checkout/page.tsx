"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "@/lib/store/CartContext";
import { createOrder } from "../actions";
import { getRestaurantBySlug } from "@/lib/supabase/queries";
import { formatPrice } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import type { Restaurant } from "@/types/database";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Truck,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  Utensils,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function CheckoutPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const {
    items,
    totalItems,
    subtotal,
    deliveryFee: defaultDeliveryFee,
    packagingFee,
    giftNoteFee,
    hasGiftNote,
    giftNote,
    clearCart,
  } = useCart();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);

  // Form
  const [orderType, setOrderType] = useState<"delivery" | "takeaway">("delivery");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRestaurant() {
      // Use browser client since this is a client component
      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", slug)
        .single();
      setRestaurant(data as Restaurant | null);
      setLoadingRestaurant(false);
    }
    fetchRestaurant();
  }, [slug]);

  const deliveryCharge =
    orderType === "delivery" ? (restaurant?.delivery_charge ?? defaultDeliveryFee) : 0;
  const currentGiftFee = hasGiftNote ? giftNoteFee : 0;
  const total = subtotal + deliveryCharge + packagingFee + currentGiftFee;
  const minimumOrder = restaurant?.minimum_order ?? 0;

  // Validation
  const isBelowMinimum = minimumOrder > 0 && subtotal < minimumOrder;
  const isClosed = restaurant && !restaurant.is_open;
  const canCheckout =
    !isClosed &&
    !isBelowMinimum &&
    totalItems > 0 &&
    name.trim().length >= 2 &&
    phone.trim().length >= 7 &&
    (orderType === "takeaway" || address.trim().length >= 5);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !canCheckout) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const result = await createOrder({
        orderType,
        customerName: name,
        customerPhone: phone,
        deliveryAddress: address,
        cartItems: items.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          sizeLabel: i.sizeLabel,
          addons: i.addons,
        })),
        restaurantId: restaurant.id,
        restaurantSlug: slug,
        whatsappNumber: restaurant.whatsapp_number,
        deliveryCharge,
        packagingCharge: packagingFee,
        hasGiftNote,
        giftNote,
      });

      if (!result.success || !result.whatsappUrl) {
        setErrorMsg(result.error || "Failed to place order. Please try again.");
        setSubmitting(false);
        return;
      }

      // Clear cart then redirect to success, opening WhatsApp
      clearCart();

      // Store orderId in sessionStorage for success page
      if (result.orderId) {
        sessionStorage.setItem(`order-${slug}`, result.orderId);
      }

      // Open WhatsApp in new tab / redirect
      window.open(result.whatsappUrl, "_blank");
      router.push(`/store/${slug}/order-success`);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (loadingRestaurant) {
    return (
      <div className="min-h-screen bg-[#D9BC9E] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#C26B59]" />
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="min-h-screen bg-[#D9BC9E] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <ShoppingBag className="h-12 w-12 text-[#696053]" />
        <h2 className="font-serif font-bold text-xl text-[#29251F]">
          Cart is empty
        </h2>
        <Link
          href={`/store/${slug}`}
          className="text-xs font-bold text-[#C26B59] hover:underline"
        >
          Back to Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#D9BC9E] font-sans text-[#29251F]">
      {/* ── UNIFIED NAVBAR (IDENTICAL ACROSS ALL PAGES) ── */}
      <Header cartCount={totalItems} />

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-6 pb-36 pt-16 sm:pt-20 md:pt-24 space-y-5">
        {/* Back to Cart navigation */}
        <div>
          <Link
            href={`/store/${slug}/cart`}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#29251F] hover:text-[#C26B59] transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F5EBDD] border border-[#91885D]/35 text-[#29251F] shadow-2xs">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span>Back to Cart</span>
          </Link>
        </div>

        <h1 className="font-serif font-bold text-2xl text-[#29251F]">
          Checkout
        </h1>
        {/* Error */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-[#A95145]/15 border border-[#A95145]/30 p-4 text-xs font-medium text-[#A95145]">
            <AlertCircle className="h-4 w-4 text-[#A95145] shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Closed Warning */}
        {isClosed && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-[#A95145]/15 border border-[#A95145]/30 p-4 text-xs font-medium text-[#A95145]">
            <AlertCircle className="h-4 w-4 text-[#A95145] shrink-0 mt-0.5" />
            <span>
              The kitchen is currently closed. Orders cannot be placed at this time.
            </span>
          </div>
        )}

        {/* Below minimum */}
        {isBelowMinimum && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-[#91885D]/20 border border-[#91885D]/40 p-4 text-xs font-medium text-[#29251F]">
            <AlertCircle className="h-4 w-4 text-[#91885D] shrink-0 mt-0.5" />
            <span>
              Minimum order amount is {formatPrice(minimumOrder)}. Add{" "}
              {formatPrice(minimumOrder - subtotal)} more to continue.
            </span>
          </div>
        )}

        {/* Order Type */}
        <div className="rounded-3xl border border-[#91885D]/30 bg-[#F5EBDD] shadow-warm-sm p-5">
          <h2 className="font-serif font-bold text-base text-[#29251F] mb-4">
            Fulfilment Method
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: "delivery" as const,
                label: "Home Delivery",
                icon: Truck,
                sub: `+${formatPrice(restaurant?.delivery_charge ?? 40)}`,
                enabled: restaurant?.delivery_enabled ?? true,
              },
              {
                value: "takeaway" as const,
                label: "Takeaway",
                icon: ShoppingBag,
                sub: "Free",
                enabled: restaurant?.takeaway_enabled ?? true,
              },
            ].map(({ value, label, icon: Icon, sub, enabled }) => (
              <button
                key={value}
                type="button"
                disabled={!enabled}
                onClick={() => setOrderType(value)}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all cursor-pointer ${
                  !enabled
                    ? "opacity-40 cursor-not-allowed border-[#91885D]/20 bg-[#E8D5BC]"
                    : orderType === value
                    ? "border-[#C26B59] bg-[#E8D5BC]"
                    : "border-[#91885D]/30 bg-[#F5EBDD] hover:border-[#C26B59]"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    orderType === value ? "text-[#C26B59]" : "text-[#696053]"
                  }`}
                />
                <span
                  className={`text-xs font-bold ${
                    orderType === value ? "text-[#C26B59]" : "text-[#29251F]"
                  }`}
                >
                  {label}
                </span>
                <span className="text-[10px] font-semibold text-[#696053]">
                  {sub}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Customer Details */}
        <div className="rounded-3xl border border-[#91885D]/30 bg-[#F5EBDD] shadow-warm-sm p-5 space-y-4">
          <h2 className="font-serif font-bold text-base text-[#29251F]">
            Your Details
          </h2>

          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#696053] mb-1.5">
              <User className="h-3 w-3 text-[#C26B59]" />
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Priya Sharma"
              className="w-full rounded-2xl border border-[#91885D]/35 bg-[#F5EBDD] px-4 py-2.5 text-xs text-[#29251F] placeholder:text-[#696053]/60 focus:outline-none focus:ring-2 focus:ring-[#C26B59]/30 transition"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#696053] mb-1.5">
              <Phone className="h-3 w-3 text-[#C26B59]" />
              WhatsApp / Mobile Number *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="e.g. +91 98765 43210"
              className="w-full rounded-2xl border border-[#91885D]/35 bg-[#F5EBDD] px-4 py-2.5 text-xs text-[#29251F] placeholder:text-[#696053]/60 focus:outline-none focus:ring-2 focus:ring-[#C26B59]/30 transition"
            />
          </div>

          {orderType === "delivery" && (
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#696053] mb-1.5">
                <MapPin className="h-3 w-3 text-[#C26B59]" />
                Delivery Address *
              </label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required={orderType === "delivery"}
                placeholder="House No., Street, Area, City — Pincode"
                className="w-full rounded-2xl border border-[#91885D]/35 bg-[#F5EBDD] px-4 py-2.5 text-xs text-[#29251F] placeholder:text-[#696053]/60 focus:outline-none focus:ring-2 focus:ring-[#C26B59]/30 transition resize-none"
              />
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="rounded-3xl border border-[#91885D]/30 bg-[#F5EBDD] shadow-warm-sm p-5 space-y-3">
          <h2 className="font-serif font-bold text-base text-[#29251F]">
            Order Summary
          </h2>
          <div className="space-y-2.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2.5 text-xs"
              >
                {item.product.image_url ? (
                  <div className="relative h-9 w-9 shrink-0 rounded-lg overflow-hidden bg-[#E8D5BC] border border-[#91885D]/20 mt-0.5">
                    <Image
                      src={item.product.image_url}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  </div>
                ) : (
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-[#E8D5BC] flex items-center justify-center mt-0.5">
                    <Utensils className="h-3.5 w-3.5 text-[#696053]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[#29251F] font-semibold leading-tight">
                    {item.product.name}{" "}
                    <span className="text-[#696053] font-normal">× {item.quantity}</span>
                  </p>
                  {item.sizeLabel && (
                    <p className="text-[10px] text-[#7A6B5A]">
                      Size: {item.sizeLabel}
                    </p>
                  )}
                  {item.addons && item.addons.length > 0 && (
                    <p className="text-[10px] text-[#696053]">
                      + {item.addons.map((a) => `${a.label}`).join(", ")}
                    </p>
                  )}
                </div>
                <span className="font-bold text-[#29251F] shrink-0">
                  {formatPrice(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-[#91885D]/25 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-[#696053]">
              <span>Subtotal ({totalItems} items)</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#696053]">
              <span>Delivery fee</span>
              <span>
                {deliveryCharge > 0 ? formatPrice(deliveryCharge) : "Free"}
              </span>
            </div>
            <div className="flex justify-between text-[#696053]">
              <span>Packing &amp; Handling (4%)</span>
              <span>+{formatPrice(packagingFee)}</span>
            </div>
            {hasGiftNote && (
              <div className="flex justify-between text-[#C26B59] font-medium">
                <span>Gift Note &amp; Ribbon</span>
                <span>+{formatPrice(giftNoteFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-serif font-bold text-base text-[#29251F] pt-2 border-t border-[#91885D]/25">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-2xl bg-[#E8D5BC] border border-[#91885D]/30 p-4 text-xs text-[#29251F]/80 space-y-1.5">
          <p className="font-bold text-[#29251F] text-xs">How it works</p>
          <p>1. Tap &ldquo;Place Order via WhatsApp&rdquo; below.</p>
          <p>2. WhatsApp will open with your order pre-filled.</p>
          <p>3. Send the message to notify the kitchen.</p>
          <p>4. Wait for confirmation from The Indulgent Spoon.</p>
        </div>
      </form>

      {/* Bottom Submit */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-[#D9BC9E] via-[#D9BC9E]/90 to-transparent pt-8">
        <div className="max-w-lg mx-auto">
          <button
            type="submit"
            form=""
            onClick={handleSubmit}
            disabled={submitting || !canCheckout}
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-[#C26B59] hover:bg-[#A95145] text-[#F5EBDD] py-4 text-sm font-black shadow-warm-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Placing Order...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span>Place Order via WhatsApp</span>
              </>
            )}
          </button>
          {!isClosed && !isBelowMinimum && (
            <p className="text-center text-[10px] text-[#696053] mt-2">
              Your order will open in WhatsApp for confirmation.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
