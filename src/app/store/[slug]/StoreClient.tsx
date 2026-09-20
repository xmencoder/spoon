"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/store/CartContext";
import { formatPrice } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import type { Restaurant, Category, Product } from "@/types/database";
import {
  ShoppingBag,
  Plus,
  Minus,
  Clock,
  MapPin,
  Phone,
  ChevronRight,
  Star,
  Utensils,
  Store,
  AlertTriangle,
} from "lucide-react";

interface Props {
  restaurant: Restaurant;
  categories: Category[];
  products: Product[];
  slug: string;
  initialCategory?: string;
}

export default function StoreClient({
  restaurant,
  categories,
  products,
  slug,
  initialCategory,
}: Props) {
  const { items, totalItems, subtotal, addItem, increment, decrement, getQuantity } =
    useCart();

  // Resolve default category: URL param → "Bestseller" category → first category
  const resolveDefaultCategory = (): string => {
    if (initialCategory) return initialCategory;
    const bestseller = categories.find(
      (c) => c.name.toLowerCase() === "bestseller"
    );
    if (bestseller) return bestseller.id;
    return categories.length > 0 ? categories[0].id : "";
  };

  const [activeCategory, setActiveCategory] = useState<string>(
    resolveDefaultCategory()
  );
  const categoryBarRef = useRef<HTMLDivElement>(null);

  const filtered = activeCategory
    ? products.filter((p) => p.category_id === activeCategory)
    : products;

  const featured = products.filter((p) => p.featured && p.available).slice(0, 3);

  // Scroll active category chip into view
  useEffect(() => {
    const bar = categoryBarRef.current;
    if (!bar) return;
    const active = bar.querySelector("[data-active='true']") as HTMLElement;
    if (active) {
      active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeCategory]);

  const getCategoryName = (id: string | null) => {
    if (!id) return "";
    return categories.find((c) => c.id === id)?.name || "";
  };

  return (
    <div className="min-h-screen bg-[#D9BC9E] text-[#29251F] font-sans">
      {/* ── UNIFIED NAVBAR (IDENTICAL ACROSS ALL PAGES) ── */}
      <Header cartCount={totalItems} />

      {/* ── HERO / RESTAURANT INFO ── */}
      <section className="relative bg-gradient-to-br from-[#29251F] via-[#38322A] to-[#29251F] overflow-hidden border-b border-[#91885D]/30 pt-14 sm:pt-16 md:pt-20">
        <div className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2391885D' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-end gap-6">
            <div className="flex-1">
              {restaurant.description && (
                <p className="text-[#E8D5BC]/85 text-sm mb-3 font-medium italic">
                  {restaurant.description}
                </p>
              )}
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#F5EBDD] leading-tight mb-4">
                {restaurant.name}
              </h2>
              <div className="flex flex-wrap gap-3 text-xs text-[#E8D5BC]/80">
                {restaurant.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#C26B59]" />
                    {restaurant.address}
                  </span>
                )}
                {restaurant.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-[#C26B59]" />
                    {restaurant.phone}
                  </span>
                )}
                {restaurant.opening_hours && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#C26B59]" />
                    {restaurant.opening_hours}
                  </span>
                )}
              </div>
            </div>

            {/* Info pills */}
            <div className="flex gap-2 flex-wrap">
              {restaurant.delivery_enabled && (
                <div className="rounded-2xl bg-[#F5EBDD]/10 border border-[#F5EBDD]/20 px-4 py-2 text-center">
                  <div className="text-[#F5EBDD] font-bold text-sm">
                    ₹{restaurant.delivery_charge}
                  </div>
                  <div className="text-[#E8D5BC]/80 text-[10px] font-semibold uppercase tracking-wider">
                    Delivery
                  </div>
                </div>
              )}
              {restaurant.minimum_order > 0 && (
                <div className="rounded-2xl bg-[#F5EBDD]/10 border border-[#F5EBDD]/20 px-4 py-2 text-center">
                  <div className="text-[#F5EBDD] font-bold text-sm">
                    ₹{restaurant.minimum_order}
                  </div>
                  <div className="text-[#E8D5BC]/80 text-[10px] font-semibold uppercase tracking-wider">
                    Min. Order
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── CLOSED BANNER ── */}
      {!restaurant.is_open && (
        <div className="bg-[#A95145]/15 border-b border-[#A95145]/30 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center gap-2.5 text-[#A95145]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-xs font-semibold">
              The kitchen is currently closed. You can browse the menu but checkout is unavailable.
            </p>
          </div>
        </div>
      )}

      {/* ── FEATURED DISHES ── */}
      {featured.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pt-8">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-4 w-4 text-[#C26B59] fill-[#C26B59]" />
            <h2 className="font-serif font-bold text-lg text-[#29251F]">
              Chef&apos;s Picks
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {featured.map((product) => (
              <FeaturedCard
                key={product.id}
                product={product}
                slug={slug}
                onAdd={() => addItem(product)}
                quantity={getQuantity(product.id)}
                onIncrement={() => increment(product.id)}
                onDecrement={() => decrement(product.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── CATEGORY FILTER (Soft Pastry #E8D5BC) ── */}
      <div
        ref={categoryBarRef}
        className="sticky top-14 sm:top-16 md:top-20 z-30 bg-[#E8D5BC]/95 backdrop-blur-sm border-y border-[#91885D]/30"
      >
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none no-scrollbar">
            {categories.map((cat) => (
              <CategoryChip
                key={cat.id}
                label={cat.name}
                imageUrl={cat.image_url}
                active={activeCategory === cat.id}
                onClick={() => setActiveCategory(cat.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── PRODUCT GRID ── */}
      <main className="max-w-5xl mx-auto px-4 py-6 pb-32">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Utensils className="h-10 w-10 text-[#696053] mb-3" />
            <p className="font-serif font-bold text-[#29251F] text-lg">
              No items in this category
            </p>
            <p className="text-xs text-[#696053] mt-1">
              Try selecting a different category above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                slug={slug}
                categoryName={getCategoryName(product.category_id)}
                onAdd={() => addItem(product)}
                quantity={getQuantity(product.id)}
                onIncrement={() => increment(product.id)}
                onDecrement={() => decrement(product.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── STICKY BOTTOM CART BAR (Rose #C26B59) ── */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
          <Link
            href={`/store/${slug}/cart`}
            className="flex items-center justify-between max-w-lg mx-auto bg-[#C26B59] hover:bg-[#A95145] text-[#F5EBDD] rounded-2xl px-5 py-4 shadow-warm-xl transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#F5EBDD]/25 text-sm font-black text-[#F5EBDD]">
                {totalItems}
              </span>
              <span className="text-sm font-bold">View Cart</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{formatPrice(subtotal)}</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

// ── FEATURED CARD (Off-White #F5EBDD, Thin Olive Border) ──
function FeaturedCard({
  product,
  slug,
  onAdd,
  quantity,
  onIncrement,
  onDecrement,
}: {
  product: Product;
  slug: string;
  onAdd: () => void;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#91885D]/30 bg-[#F5EBDD] shadow-warm-sm group hover:border-[#91885D]/60 transition-all">
      <Link href={`/store/${slug}/product/${product.id}`} className="block relative h-40 bg-[#E8D5BC] cursor-pointer">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#696053]">
            <Utensils className="h-8 w-8" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-[#F5EBDD] font-serif font-bold text-sm leading-tight line-clamp-1">
            {product.name}
          </p>
          <p className="text-[#F5EBDD]/90 text-xs font-semibold mt-0.5">
            {formatPrice(product.price)}
          </p>
        </div>
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center gap-1 bg-[#91885D] text-[#F5EBDD] text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs">
            <Star className="h-2.5 w-2.5 fill-[#F5EBDD]" />
            Featured
          </span>
        </div>
      </Link>
      <div className="p-3 flex items-center justify-between">
        {!product.available ? (
          <span className="text-[10px] font-bold text-[#A95145] uppercase tracking-wider">
            Sold Out
          </span>
        ) : quantity > 0 ? (
          <QuantityControl
            quantity={quantity}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
          />
        ) : (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 rounded-xl bg-[#C26B59] hover:bg-[#A95145] text-[#F5EBDD] px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-warm-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        )}
      </div>
    </div>
  );
}

// ── PRODUCT CARD (Off-White #F5EBDD, Thin Olive Border) ──
function ProductCard({
  product,
  slug,
  categoryName,
  onAdd,
  quantity,
  onIncrement,
  onDecrement,
}: {
  product: Product;
  slug: string;
  categoryName: string;
  onAdd: () => void;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const isSoldOut =
    !product.available ||
    (product.order_limit != null &&
      product.order_limit > 0 &&
      (product.total_ordered || 0) >= product.order_limit);

  return (
    <div
      className={`flex gap-3 rounded-2xl border bg-[#F5EBDD] p-3 shadow-warm-sm transition-all ${
        !isSoldOut
          ? "border-[#91885D]/30 hover:border-[#91885D]/60 hover:shadow-warm-md"
          : "border-[#91885D]/20 opacity-60"
      }`}
    >
      {/* Image */}
      <Link
        href={`/store/${slug}/product/${product.id}`}
        className="relative h-24 w-24 shrink-0 rounded-xl overflow-hidden bg-[#E8D5BC] border border-[#91885D]/25 block cursor-pointer"
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover hover:scale-105 transition-transform duration-300"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#696053]">
            <Utensils className="h-6 w-6" />
          </div>
        )}
        {isSoldOut && (
          <div className="absolute inset-0 bg-[#29251F]/60 flex items-center justify-center">
            <span className="text-[9px] font-bold text-[#F5EBDD] uppercase tracking-wider">
              Sold Out
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1 min-w-0 justify-between">
        <div>
          {categoryName && (
            <span className="text-[10px] font-bold text-[#C26B59] uppercase tracking-wider">
              {categoryName}
            </span>
          )}
          <Link
            href={`/store/${slug}/product/${product.id}`}
            className="hover:text-[#C26B59] transition-colors block"
          >
            <h3 className="font-serif font-bold text-sm text-[#29251F] leading-tight mt-0.5">
              {product.name}
            </h3>
          </Link>
          {product.description && (
            <p className="text-[11px] text-[#696053] line-clamp-2 mt-0.5 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="font-serif font-bold text-sm text-[#29251F]">
            {formatPrice(product.price)}
          </span>
          {!isSoldOut ? (
            quantity > 0 ? (
              <QuantityControl
                quantity={quantity}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
              />
            ) : (
              <button
                onClick={onAdd}
                className="flex items-center gap-1 rounded-xl border border-[#C26B59] bg-[#F5EBDD] text-[#C26B59] px-2.5 py-1 text-xs font-bold hover:bg-[#C26B59] hover:text-[#F5EBDD] transition-colors active:scale-95 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            )
          ) : (
            <span className="text-[10px] font-bold text-[#A95145] bg-[#A95145]/10 px-2.5 py-1 rounded-full border border-[#A95145]/20 uppercase tracking-wider">
              Sold Out
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── QUANTITY CONTROL ──
function QuantityControl({
  quantity,
  onIncrement,
  onDecrement,
}: {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-[#C26B59] bg-[#F5EBDD] overflow-hidden shadow-2xs">
      <button
        onClick={onDecrement}
        className="flex h-7 w-7 items-center justify-center text-[#C26B59] hover:bg-[#C26B59] hover:text-[#F5EBDD] transition-colors active:scale-90 cursor-pointer"
        aria-label="Decrease quantity"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[1.5rem] text-center text-xs font-bold text-[#29251F]">
        {quantity}
      </span>
      <button
        onClick={onIncrement}
        className="flex h-7 w-7 items-center justify-center text-[#C26B59] hover:bg-[#C26B59] hover:text-[#F5EBDD] transition-colors active:scale-90 cursor-pointer"
        aria-label="Increase quantity"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── CATEGORY CHIP ──
function CategoryChip({
  label,
  imageUrl,
  active,
  onClick,
}: {
  label: string;
  imageUrl?: string | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-active={active}
      className={`shrink-0 flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
        active
          ? "bg-[#C26B59] text-[#F5EBDD] shadow-warm-sm"
          : "bg-[#F5EBDD] border border-[#91885D]/30 text-[#29251F] hover:border-[#C26B59]"
      }`}
    >
      {imageUrl && (
        <span className="relative h-5 w-5 rounded-full overflow-hidden shrink-0 border border-current/20 inline-block">
          <Image src={imageUrl} alt={label} fill className="object-cover" />
        </span>
      )}
      <span>{label}</span>
    </button>
  );
}
