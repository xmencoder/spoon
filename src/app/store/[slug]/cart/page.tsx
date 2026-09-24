"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  useCart,
  DEFAULT_RESTAURANT_SLUG,
  GIFT_NOTE_FEE,
} from "@/lib/store/CartContext";
import { formatPrice } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Product, Category } from "@/types/database";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  X,
  Trash2,
  Gift,
  Heart,
  ShoppingBag,
  Sparkles,
  Check,
  Tag,
  Loader2,
} from "lucide-react";

export default function CartPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || DEFAULT_RESTAURANT_SLUG;

  const {
    items,
    totalItems,
    subtotal,
    packagingFee,
    giftNoteFee,
    total,
    hasGiftNote,
    giftNote,
    setHasGiftNote,
    setGiftNote,
    increment,
    decrement,
    removeItem,
    clearCart,
    addItem,
    getProductQuantity,
  } = useCart();

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [addedRecId, setAddedRecId] = useState<string | null>(null);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("all");

  // Fetch live products & categories from Supabase database
  useEffect(() => {
    async function loadLiveData() {
      try {
        setLoadingDb(true);
        const supabase = createClient();

        const { data: rest } = await supabase
          .from("restaurants")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        const targetRestId = rest?.id;

        const [prodRes, catRes] = await Promise.all([
          targetRestId
            ? supabase
                .from("products")
                .select("*")
                .eq("restaurant_id", targetRestId)
                .eq("available", true)
                .order("sort_order", { ascending: true })
            : supabase
                .from("products")
                .select("*")
                .eq("available", true)
                .order("sort_order", { ascending: true }),
          targetRestId
            ? supabase
                .from("categories")
                .select("*")
                .eq("restaurant_id", targetRestId)
                .order("sort_order", { ascending: true })
            : supabase
                .from("categories")
                .select("*")
                .order("sort_order", { ascending: true }),
        ]);

        if (prodRes.data) setDbProducts(prodRes.data as Product[]);
        if (catRes.data) setDbCategories(catRes.data as Category[]);
      } catch (err) {
        console.error("CartPage: failed to fetch live database products", err);
      } finally {
        setLoadingDb(false);
      }
    }
    loadLiveData();
  }, [slug]);

  // Map category ID to Category Object
  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    dbCategories.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [dbCategories]);

  // Detect which categories are represented in user's cart
  const userCartCategories = useMemo(() => {
    const matchedCategories = new Set<string>();
    items.forEach((item) => {
      if (item.product.category_id) {
        matchedCategories.add(item.product.category_id);
      }
    });
    return Array.from(matchedCategories);
  }, [items]);

  // Filter recommendations based on tab
  const filteredTreats = useMemo(() => {
    if (selectedCategoryTab === "all") {
      return dbProducts;
    }
    return dbProducts.filter((t) => t.category_id === selectedCategoryTab);
  }, [selectedCategoryTab, dbProducts]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddRecommended = (product: Product) => {
    addItem(product, 1);
    setAddedRecId(product.id);
    setTimeout(() => setAddedRecId(null), 1500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5EBDD] text-[#29251F] font-sans selection:bg-[#C26B59] selection:text-[#F5EBDD]">
      {/* ── UNIFIED HEADER ── */}
      <Header cartCount={totalItems} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* ── HEADER BANNER ── */}
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between pb-8 mb-8 border-b border-[#91885D]/20">
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.25em] text-[#91885D] mb-1.5">
              Your Cart
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#29251F] tracking-tight flex items-center gap-2 sm:gap-3">
              <span>Sweet Things Await</span>
              <span
                className="text-[#C26B59] font-normal"
                style={{ fontFamily: "var(--font-caveat)" }}
              >
                ♡
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#696053] mt-2 font-normal">
              Review your treats before they make their way to you.
            </p>
          </div>

          {/* Top Right Stamp */}
          <div className="hidden md:flex items-center gap-3 self-center sm:self-auto mt-4 sm:mt-0">
            <div
              className="text-right select-none transform -rotate-3"
              style={{ fontFamily: "var(--font-caveat)" }}
            >
              <p className="text-xl lg:text-2xl text-[#7A6B5A] leading-tight font-bold">
                Good Food<br />
                <span className="text-[#C26B59]">Happier Days</span>
              </p>
              <p className="text-sm text-[#C26B59] text-right">♡</p>
            </div>
            <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[#D9BC9E] shadow-sm">
              <Image
                src="https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=160&auto=format&fit=crop&q=80"
                alt="Artisanal cookies"
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          /* ── EMPTY CART STATE ── */
          <div className="bg-[#FAF6EF] rounded-3xl border border-[#91885D]/25 p-8 sm:p-14 text-center shadow-xs my-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-[#E8D5BC]/60 flex items-center justify-center text-[#C26B59] mb-4 shadow-2xs">
              <ShoppingBag className="w-10 h-10 opacity-80" strokeWidth={1.5} />
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#29251F]">
              Your Cart is Currently Empty
            </h2>
            <p className="text-xs sm:text-sm text-[#696053] max-w-md mx-auto mt-2 mb-6">
              Looks like you haven&apos;t chosen any fresh treats yet. Browse our
              categories below to fill your basket!
            </p>
            <Link
              href="/#menu"
              className="inline-flex items-center gap-2 rounded-full bg-[#C26B59] hover:bg-[#A95145] text-[#F5EBDD] px-8 py-3.5 text-sm font-bold shadow-md transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Explore Bakery Menu</span>
            </Link>
          </div>
        ) : (
          /* ── MAIN CART GRID (TABLE + SUMMARY) ── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* ── LEFT COLUMN: ITEMS TABLE ── */}
            <div className="lg:col-span-8 bg-[#FAF6EF] rounded-3xl border border-[#91885D]/25 shadow-xs overflow-hidden">
              <div className="p-5 sm:p-7">
                {/* Table Header Row (Desktop) */}
                <div className="hidden sm:grid sm:grid-cols-12 text-[11px] font-bold uppercase tracking-wider text-[#696053] pb-4 border-b border-[#91885D]/20">
                  <div className="col-span-6">Item</div>
                  <div className="col-span-2 text-center">Price</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right pr-6">Total</div>
                </div>

                {/* Items List */}
                <div className="divide-y divide-[#91885D]/15">
                  {items.map((item) => {
                    const lineTotal = item.unitPrice * item.quantity;
                    return (
                      <div
                        key={item.id}
                        className="py-5 first:pt-4 sm:first:pt-5 last:pb-2 flex flex-col sm:grid sm:grid-cols-12 gap-4 sm:gap-2 items-center"
                      >
                        {/* Item Details (Image + Titles + Addons) */}
                        <div className="w-full sm:col-span-6 flex items-center gap-3.5">
                          {/* Thumbnail */}
                          <div className="relative h-18 w-18 sm:h-20 sm:w-20 shrink-0 rounded-2xl overflow-hidden bg-[#E8D5BC] border border-[#91885D]/25 shadow-2xs">
                            {item.product.image_url ? (
                              <Image
                                src={item.product.image_url}
                                alt={item.product.name}
                                fill
                                className="object-cover"
                                sizes="80px"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[#696053]">
                                <ShoppingBag className="h-6 w-6" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="font-serif font-bold text-sm sm:text-base text-[#29251F] leading-tight">
                              {item.product.name}
                            </h3>
                            {item.sizeLabel && (
                              <span className="inline-block text-[11px] font-bold text-[#A34B3D] bg-[#A34B3D]/10 px-2 py-0.5 rounded-md mt-1">
                                Size: {item.sizeLabel}
                              </span>
                            )}
                            {item.addons && item.addons.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {item.addons.map((addon, idx) => (
                                  <p
                                    key={idx}
                                    className="text-[11px] text-[#696053] flex items-center gap-1"
                                  >
                                    <span>+ {addon.label}</span>
                                    <span className="text-[#8B7D6B]">
                                      (+₹{addon.price})
                                    </span>
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Unit Price */}
                        <div className="w-full sm:col-span-2 flex sm:justify-center items-center justify-between sm:text-center text-xs font-semibold text-[#554D3F]">
                          <span className="sm:hidden text-[#8B7D6B]">Unit Price:</span>
                          <span>{formatPrice(item.unitPrice)}</span>
                        </div>

                        {/* Quantity Stepper & Remove */}
                        <div className="w-full sm:col-span-2 flex items-center justify-between sm:justify-center gap-2">
                          <div className="flex items-center rounded-xl bg-[#EDE3D4] border border-[#D5C6B1] px-1.5 py-1">
                            <button
                              onClick={() => decrement(item.id)}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-[#554D3F] hover:text-[#29251F] hover:bg-[#DFD3C0] transition-colors cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-7 text-center font-serif text-sm font-bold text-[#29251F]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => increment(item.id)}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-[#554D3F] hover:text-[#29251F] hover:bg-[#DFD3C0] transition-colors cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Subtotal & Delete Action */}
                        <div className="w-full sm:col-span-2 flex items-center justify-between sm:justify-end gap-3 pr-0 sm:pr-2">
                          <span className="font-serif font-bold text-sm text-[#29251F]">
                            {formatPrice(lineTotal)}
                          </span>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 rounded-lg text-rose-700 hover:text-rose-900 hover:bg-rose-100/50 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Clear Cart Button */}
                <div className="pt-4 mt-4 border-t border-[#91885D]/20 flex justify-between items-center">
                  <Link
                    href="/#menu"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A34B3D] hover:text-[#7A362B] transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Continue Shopping</span>
                  </Link>
                  <button
                    onClick={clearCart}
                    className="text-xs font-semibold text-rose-700 hover:text-rose-900 transition-colors cursor-pointer"
                  >
                    Clear Cart
                  </button>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN: SUMMARY BOX ── */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-[#FAF6EF] rounded-3xl border border-[#91885D]/25 p-6 shadow-xs space-y-5">
                <h2 className="font-serif text-xl font-bold text-[#29251F] border-b border-[#91885D]/20 pb-3">
                  Order Summary
                </h2>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between text-[#554D3F]">
                    <span>Items Subtotal ({totalItems})</span>
                    <span className="font-bold text-[#29251F]">
                      {formatPrice(subtotal)}
                    </span>
                  </div>

                  {packagingFee > 0 && (
                    <div className="flex justify-between text-[#554D3F]">
                      <span>Packing &amp; Handling (4%)</span>
                      <span className="font-bold text-[#29251F]">
                        +{formatPrice(packagingFee)}
                      </span>
                    </div>
                  )}

                  {hasGiftNote && (
                    <div className="flex justify-between text-[#554D3F]">
                      <span>Gift Note</span>
                      <span className="font-bold text-[#29251F]">
                        +{formatPrice(GIFT_NOTE_FEE)}
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-[#91885D]/20 flex justify-between items-baseline">
                    <span className="font-serif text-base font-bold text-[#29251F]">
                      Total
                    </span>
                    <span className="font-serif text-2xl font-bold text-[#A34B3D]">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                {/* ── GIFT NOTE OPTION ── */}
                <div className="pt-3 border-t border-[#91885D]/20 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasGiftNote}
                      onChange={(e) => setHasGiftNote(e.target.checked)}
                      className="rounded border-[#91885D]/40 text-[#C26B59] focus:ring-[#C26B59] h-4 w-4"
                    />
                    <span className="text-xs font-bold text-[#29251F] flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-[#C26B59]" />
                      <span>Add Gift Card Message (+₹40)</span>
                    </span>
                  </label>

                  {hasGiftNote && (
                    <div className="pt-2 animate-in fade-in">
                      <textarea
                        value={giftNote}
                        onChange={(e) => {
                          if (e.target.value.length <= 200) {
                            setGiftNote(e.target.value);
                          }
                        }}
                        placeholder="Write your heartfelt message here..."
                        rows={3}
                        className="w-full text-xs text-[#29251F] placeholder-[#8A7B6B] bg-[#FAF6EF] border border-[#91885D]/35 rounded-xl p-3 focus:outline-none focus:border-[#C26B59] transition-colors resize-none"
                      />
                      <div className="text-right text-[10px] text-[#696053] mt-1">
                        {giftNote.length}/200
                      </div>
                    </div>
                  )}
                </div>

                {/* ── PROCEED TO CHECKOUT BUTTON ── */}
                <Link
                  href={`/store/${slug}/checkout`}
                  className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-[#634832] hover:bg-[#523B28] text-[#F5EBDD] py-4 text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] group"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── BOTTOM RECOMMENDATIONS: "YOU MAY ALSO LIKE" WITH LIVE DATABASE PRODUCTS ── */}
        <section className="mt-16 sm:mt-20 pt-10 border-t border-[#91885D]/25">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-[10.5px] sm:text-xs font-bold uppercase tracking-[0.25em] text-[#91885D] mb-1.5">
                You May Also Like
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#29251F] tracking-tight flex items-center gap-2">
                <span>More Sweetness for You</span>
                <span
                  className="text-[#C26B59] font-normal"
                  style={{ fontFamily: "var(--font-caveat)" }}
                >
                  ♡
                </span>
              </h2>
            </div>

            <Link
              href="/#menu"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#29251F] hover:text-[#C26B59] transition-colors group self-start sm:self-auto"
            >
              <span>View Full Bakery Menu</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* ── Dynamic Category Filter Tabs from DB ── */}
          {dbCategories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
              <button
                onClick={() => setSelectedCategoryTab("all")}
                className={`relative shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none ${
                  selectedCategoryTab === "all"
                    ? "bg-[#634832] text-[#FAF5ED] shadow-xs"
                    : "bg-[#FAF6EF] text-[#554D3F] border border-[#91885D]/30 hover:border-[#634832] hover:bg-[#F4E9DC]"
                }`}
              >
                <span>All Treats</span>
              </button>

              {dbCategories.map((cat) => {
                const isSelected = selectedCategoryTab === cat.id;
                const isUserInCartCat = userCartCategories.includes(cat.id);

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryTab(cat.id)}
                    className={`relative shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none ${
                      isSelected
                        ? "bg-[#634832] text-[#FAF5ED] shadow-xs"
                        : "bg-[#FAF6EF] text-[#554D3F] border border-[#91885D]/30 hover:border-[#634832] hover:bg-[#F4E9DC]"
                    }`}
                  >
                    <span>{cat.name}</span>
                    {isUserInCartCat && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                          isSelected
                            ? "bg-[#FAF5ED]/25 text-white"
                            : "bg-[#4D7C47] text-white"
                        }`}
                        title="You have items from this category in cart"
                      >
                        In Basket
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Filtered Live Database Products Grid ── */}
          {loadingDb ? (
            <div className="flex items-center justify-center py-12 gap-2 text-xs font-semibold text-[#8B7D6B]">
              <Loader2 className="w-5 h-5 animate-spin text-[#C26B59]" />
              <span>Loading bakery recommendations...</span>
            </div>
          ) : filteredTreats.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#8B7D6B]">
              No treats available in this category yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
              {filteredTreats.map((treat) => {
                const isFav = favorites[treat.id];
                const isJustAdded = addedRecId === treat.id;
                const recInCartQty = getProductQuantity(treat.id);
                const isAlreadyInCart = recInCartQty > 0;
                const categoryObj = treat.category_id ? categoryMap[treat.category_id] : null;

                return (
                  <div
                    key={treat.id}
                    className="group bg-[#FAF6EF] rounded-2xl border border-[#91885D]/25 overflow-hidden shadow-2xs hover:shadow-md hover:border-[#91885D]/40 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Image with Heart Favorite Overlay */}
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#E8D5BC]">
                        {treat.image_url ? (
                          <Image
                            src={treat.image_url}
                            alt={treat.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[#696053]">
                            <ShoppingBag className="w-8 h-8" />
                          </div>
                        )}

                        {/* In Cart Indicator Ribbon */}
                        {isAlreadyInCart && (
                          <div className="absolute top-2.5 left-2.5 z-10 animate-in fade-in">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold text-white bg-[#4D7C47] shadow-sm border border-white/20">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                              <span>{recInCartQty} in Cart</span>
                            </span>
                          </div>
                        )}

                        <button
                          onClick={() => toggleFavorite(treat.id)}
                          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-[#FAF6EF]/80 backdrop-blur-xs flex items-center justify-center text-[#696053] hover:text-[#C26B59] transition-colors shadow-2xs cursor-pointer"
                          aria-label="Add to favorites"
                        >
                          <Heart
                            className={`w-3.5 h-3.5 transition-colors ${
                              isFav ? "fill-[#C26B59] text-[#C26B59]" : ""
                            }`}
                          />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-3.5 pb-2">
                        {categoryObj?.name && (
                          <span className="text-[10px] font-semibold text-[#8B7D6B] uppercase tracking-wider block mb-0.5">
                            {categoryObj.name}
                          </span>
                        )}
                        <h4 className="font-serif font-bold text-xs sm:text-sm text-[#29251F] line-clamp-1 group-hover:text-[#C26B59] transition-colors">
                          {treat.name}
                        </h4>
                        {treat.description && (
                          <p className="text-[11px] text-[#696053] line-clamp-1 mt-0.5">
                            {treat.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Price & Add Button */}
                    <div className="p-3.5 pt-0 flex items-center justify-between mt-2">
                      <span className="font-serif font-bold text-xs sm:text-sm text-[#29251F]">
                        {formatPrice(treat.price)}
                      </span>

                      <button
                        onClick={() => handleAddRecommended(treat)}
                        className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold shadow-2xs transition-all active:scale-90 cursor-pointer ${
                          isJustAdded
                            ? "bg-[#4D7C47] text-[#FAF5ED]"
                            : isAlreadyInCart
                            ? "bg-[#5D6B3F] hover:bg-[#4E5B33] text-[#FAF5ED]"
                            : "bg-[#7E5743] hover:bg-[#684433] text-[#FAF5ED]"
                        }`}
                      >
                        {isJustAdded ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Added!</span>
                          </>
                        ) : isAlreadyInCart ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>In Cart ({recInCartQty}) +</span>
                          </>
                        ) : (
                          <>
                            <span>Add</span>
                            <Plus className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
