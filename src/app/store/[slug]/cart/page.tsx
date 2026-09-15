"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useCart } from "@/lib/store/CartContext";
import { formatPrice } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Utensils,
  ChevronRight,
} from "lucide-react";

export default function CartPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { items, totalItems, subtotal, increment, decrement, removeItem, clearCart } =
    useCart();

  if (totalItems === 0) {
    return (
      <div className="min-h-screen bg-[#D9BC9E] flex flex-col">
        <Header cartCount={0} />

        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center pb-20 pt-14 sm:pt-16 md:pt-20">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#F5EBDD] border border-[#91885D]/35 text-[#696053]">
            <ShoppingBag className="h-9 w-9 text-[#C26B59]" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-xl text-[#29251F]">
              Your cart is empty
            </h2>
            <p className="text-xs text-[#696053] mt-1">
              Add some delicious dishes to get started.
            </p>
          </div>
          <Link
            href={`/store/${slug}`}
            className="mt-2 flex items-center gap-2 rounded-2xl bg-[#C26B59] hover:bg-[#A95145] text-[#F5EBDD] px-6 py-3 text-sm font-bold shadow-warm-md transition-colors"
          >
            <Utensils className="h-4 w-4" />
            Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#D9BC9E] font-sans text-[#29251F]">
      {/* ── UNIFIED NAVBAR (IDENTICAL ACROSS ALL PAGES) ── */}
      <Header cartCount={totalItems} />

      <div className="max-w-lg mx-auto px-4 py-6 pb-36 pt-16 sm:pt-18 md:pt-24">
        <div className="flex items-center justify-between mb-4">
          <Link
            href={`/store/${slug}`}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#29251F] hover:text-[#C26B59] transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F5EBDD] border border-[#91885D]/35 text-[#29251F] shadow-2xs">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span>Back to Menu</span>
          </Link>
          <button
            onClick={clearCart}
            className="text-xs font-bold text-[#A95145] hover:text-[#C26B59] transition-colors cursor-pointer"
          >
            Clear All
          </button>
        </div>

        <h1 className="font-serif font-bold text-2xl text-[#29251F] mb-4">
          Your Cart
        </h1>

        {/* Cart Items */}
        <div className="rounded-3xl border border-[#91885D]/30 bg-[#F5EBDD] shadow-warm-sm overflow-hidden divide-y divide-[#91885D]/20">
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="flex items-center gap-3 p-4">
              {/* Image */}
              <div className="relative h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-[#E8D5BC] border border-[#91885D]/25">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#696053]">
                    <Utensils className="h-5 w-5" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="font-serif font-bold text-sm text-[#29251F] leading-tight truncate">
                  {product.name}
                </p>
                <p className="text-xs text-[#696053] mt-0.5">
                  {formatPrice(product.price)} each
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="font-serif font-bold text-sm text-[#29251F]">
                  {formatPrice(product.price * quantity)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => decrement(product.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#91885D]/30 bg-[#F5EBDD] text-[#696053] hover:text-[#A95145] hover:border-[#A95145]/40 transition-colors active:scale-90 cursor-pointer"
                  >
                    {quantity === 1 ? (
                      <Trash2 className="h-3.5 w-3.5" />
                    ) : (
                      <Minus className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <span className="min-w-[1.5rem] text-center text-xs font-black text-[#29251F]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => increment(product.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#C26B59] bg-[#F5EBDD] text-[#C26B59] hover:bg-[#C26B59] hover:text-[#F5EBDD] transition-colors active:scale-90 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="mt-4 rounded-3xl border border-[#91885D]/30 bg-[#F5EBDD] shadow-warm-sm p-5 space-y-3">
          <h2 className="font-serif font-bold text-base text-[#29251F]">
            Order Summary
          </h2>
          <div className="space-y-2 text-xs text-[#696053]">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex justify-between">
                <span>
                  {product.name} × {quantity}
                </span>
                <span className="font-semibold text-[#29251F]">
                  {formatPrice(product.price * quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#91885D]/25 pt-3 flex justify-between font-serif font-bold text-base text-[#29251F]">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <p className="text-[10px] text-[#696053]">
            Delivery charge calculated at checkout based on order type.
          </p>
        </div>
      </div>

      {/* Bottom checkout button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-[#D9BC9E] via-[#D9BC9E]/90 to-transparent pt-8">
        <Link
          href={`/store/${slug}/checkout`}
          className="flex items-center justify-between max-w-lg mx-auto bg-[#C26B59] hover:bg-[#A95145] text-[#F5EBDD] rounded-2xl px-5 py-4 shadow-warm-xl transition-all"
        >
          <div>
            <p className="text-sm font-black">Proceed to Checkout</p>
            <p className="text-[11px] text-[#F5EBDD]/80 mt-0.5">
              {totalItems} item{totalItems !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold">{formatPrice(subtotal)}</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
