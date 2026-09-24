"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart, DEFAULT_RESTAURANT_SLUG } from "@/lib/store/CartContext";
import { formatPrice } from "@/lib/utils";
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Sparkles,
  Gift,
  Check,
} from "lucide-react";

export function CartDrawer() {
  const {
    items,
    totalItems,
    subtotal,
    deliveryFee,
    packagingFee,
    giftNoteFee,
    total,
    isDrawerOpen,
    lastAddedItem,
    closeCartDrawer,
    increment,
    decrement,
    removeItem,
    restaurantSlug,
  } = useCart();

  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        closeCartDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, closeCartDrawer]);

  // Prevent background body scroll when open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isDrawerOpen]);

  if (!isDrawerOpen) return null;

  const activeSlug = restaurantSlug || DEFAULT_RESTAURANT_SLUG;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={closeCartDrawer}
        className="fixed inset-0 bg-[#29251F]/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className="relative z-10 w-full max-w-md bg-[#FAF5ED] text-[#29251F] shadow-2xl flex flex-col h-full border-l border-[#91885D]/30 transition-transform duration-300 animate-in slide-in-from-right"
      >
        {/* ── Top Header ── */}
        <div className="px-5 py-4 border-b border-[#91885D]/20 bg-[#F4E9DC] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8D5BC] border border-[#91885D]/30 text-[#C26B59]">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base sm:text-lg font-bold text-[#29251F]">
                  Sweet Basket
                </h3>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#C26B59] text-white">
                  {totalItems}
                </span>
              </div>
              <p className="text-[11px] text-[#696053]">
                Handcrafted &amp; made on order
              </p>
            </div>
          </div>

          <button
            onClick={closeCartDrawer}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8D5BC]/60 hover:bg-[#E8D5BC] text-[#29251F] transition-colors cursor-pointer"
            aria-label="Close cart drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Newly Added Flash Notification ── */}
        {lastAddedItem && (
          <div className="bg-[#EFE3D3] px-4 py-2.5 border-b border-[#91885D]/20 flex items-center justify-between text-xs text-[#29251F] animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-1.5 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-[#C26B59]" />
              <span>Added to basket:</span>
              <strong className="font-bold text-[#C26B59] truncate max-w-[170px]">
                {lastAddedItem.product.name}
              </strong>
            </div>
            <span className="text-[10px] font-bold text-[#7A774D] uppercase tracking-wider">
              Updated
            </span>
          </div>
        )}

        {/* ── Cart Items List / Empty State ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4 space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#E8D5BC]/60 flex items-center justify-center text-[#C26B59]">
                <ShoppingBag className="w-8 h-8 opacity-80" />
              </div>
              <h4 className="font-serif text-lg font-bold text-[#29251F]">
                Your basket is empty
              </h4>
              <p className="text-xs text-[#696053] max-w-xs">
                Explore our fresh sourdough, tea cakes, and spreads to fill it up!
              </p>
              <button
                onClick={closeCartDrawer}
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#C26B59] text-[#F5EBDD] px-5 py-2.5 text-xs font-bold shadow-md hover:bg-[#A95145] transition-colors"
              >
                Browse Our Menu
              </button>
            </div>
          ) : (
            <div className="space-y-3 divide-y divide-[#91885D]/15">
              {items.map((item) => (
                <div key={item.id} className="pt-3 first:pt-0 flex gap-3">
                  {/* Item Image */}
                  <div className="relative h-18 w-18 shrink-0 rounded-xl overflow-hidden bg-[#E8D5BC] border border-[#91885D]/25">
                    {item.product.image_url ? (
                      <Image
                        src={item.product.image_url}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        sizes="72px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#696053]">
                        <ShoppingBag className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  {/* Item Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h5 className="font-serif font-bold text-sm text-[#29251F] leading-snug line-clamp-1">
                          {item.product.name}
                        </h5>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-[#A95145] hover:text-[#C26B59] p-0.5 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Size pill if available */}
                      {item.sizeLabel && (
                        <span className="inline-block mt-0.5 text-[10px] font-semibold bg-[#E8D5BC]/70 text-[#54483B] px-2 py-0.5 rounded-md border border-[#91885D]/20">
                          Size: {item.sizeLabel}
                        </span>
                      )}

                      {/* Add-on chips */}
                      {item.addons && item.addons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.addons.map((addon) => (
                            <span
                              key={addon.id}
                              className="text-[9.5px] font-medium bg-[#F5EBDD] text-[#696053] px-1.5 py-0.5 rounded border border-[#91885D]/20"
                            >
                              + {addon.label} (₹{addon.price})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Price and Quantity Controls */}
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#91885D]/10">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => decrement(item.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-[#91885D]/30 bg-[#F5EBDD] text-[#696053] hover:text-[#A95145] transition-colors active:scale-95 cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[1.25rem] text-center text-xs font-bold text-[#29251F]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => increment(item.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-[#C26B59] bg-[#F5EBDD] text-[#C26B59] hover:bg-[#C26B59] hover:text-[#F5EBDD] transition-colors active:scale-95 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="font-serif font-bold text-sm text-[#29251F]">
                          {formatPrice(item.unitPrice * item.quantity)}
                        </span>
                        {item.quantity > 1 && (
                          <span className="block text-[10px] text-[#696053]">
                            ({formatPrice(item.unitPrice)} each)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer Summary & Checkout Actions ── */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-[#91885D]/20 bg-[#F4E9DC]/90 space-y-3 shadow-inner">
            {/* Breakdown */}
            <div className="space-y-1.5 text-xs text-[#696053]">
              <div className="flex justify-between">
                <span>Subtotal ({totalItems} items)</span>
                <span className="font-semibold text-[#29251F]">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Packing &amp; Handling (4%)</span>
                <span className="font-semibold text-[#29251F]">
                  +{formatPrice(packagingFee)}
                </span>
              </div>
              {giftNoteFee > 0 && (
                <div className="flex justify-between text-[#C26B59]">
                  <span>Gift Note &amp; Ribbon</span>
                  <span className="font-semibold">+{formatPrice(giftNoteFee)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-[#91885D]/20 pt-2 flex justify-between items-baseline">
              <div>
                <span className="font-serif font-bold text-base text-[#29251F]">
                  Estimated Total
                </span>
                <p className="text-[10px] text-[#696053]">
                  Inclusive of all taxes
                </p>
              </div>
              <span className="font-serif font-extrabold text-lg text-[#C26B59]">
                {formatPrice(total)}
              </span>
            </div>

            {/* CTAs */}
            <div className="space-y-2 pt-1">
              <Link
                href={`/store/${activeSlug}/cart`}
                onClick={closeCartDrawer}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FAF5ED] border border-[#91885D]/40 hover:border-[#C26B59] text-[#29251F] hover:text-[#C26B59] py-2.5 text-xs font-bold transition-all shadow-xs"
              >
                <span>View Full Cart Page &amp; Customize</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              <Link
                href={`/store/${activeSlug}/checkout`}
                onClick={closeCartDrawer}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#C26B59] hover:bg-[#A95145] text-[#F5EBDD] py-3 text-sm font-bold shadow-md transition-all active:scale-[0.99]"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
