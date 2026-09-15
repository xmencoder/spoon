"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/store/CartContext";
import { Header } from "@/components/layout/Header";
import {
  Heart,
  ShoppingCart,
  Plus,
  Minus,
  Check,
  ChevronLeft,
  ChevronRight,
  Truck,
  Gift,
  ShieldCheck,
  Box,
  Star,
  Quote,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  getBakeryProductDetail,
  RECOMMENDED_PRODUCTS,
  BakeryProductDetail,
} from "@/lib/bakery-products";
import type { Restaurant, Product } from "@/types/database";

interface Props {
  product: Product;
  restaurant: Restaurant;
  categoryName: string;
  slug: string;
  badge?: string;
}

// Custom feature icons matching the 4 circular badges in the photo
function FeatureIcon({ type }: { type: string }) {
  switch (type) {
    case "leaf":
      return (
        <svg
          className="w-5 h-5 text-[#5B5344]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      );
    case "butter":
      return (
        <svg
          className="w-5 h-5 text-[#5B5344]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="8" width="18" height="10" rx="2" />
          <path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
          <line x1="3" y1="13" x2="21" y2="13" />
        </svg>
      );
    case "chips":
      return (
        <svg
          className="w-5 h-5 text-[#5B5344]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 20h12a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3Z" />
          <circle cx="9" cy="12" r="1" fill="currentColor" />
          <circle cx="15" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="15" r="1" fill="currentColor" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      );
    case "heart":
    default:
      return (
        <svg
          className="w-5 h-5 text-[#5B5344]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      );
  }
}

// Vintage spoon ornament for section dividers
function SpoonDivider() {
  return (
    <div className="flex items-center justify-center gap-3 my-2">
      <div className="h-px w-16 sm:w-28 bg-[#91885D]/40" />
      <svg
        className="w-6 h-6 text-[#78704A] transform -rotate-45"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M19.4 4.6a4.2 4.2 0 0 0-6 0L4.5 13.5a1.5 1.5 0 0 0 0 2.1l3.9 3.9a1.5 1.5 0 0 0 2.1 0l8.9-8.9a4.2 4.2 0 0 0 0-6Zm-1.4 4.6-2.5 2.5-3.2-3.2 2.5-2.5a2.2 2.2 0 0 1 3.2 3.2Z" />
      </svg>
      <div className="h-px w-16 sm:w-28 bg-[#91885D]/40" />
    </div>
  );
}

export default function ProductDetailClient({
  product,
  restaurant,
  categoryName,
  slug,
  badge: badgeProp,
}: Props) {
  const { addItem, totalItems } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"allergen" | "storage">("allergen");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [show3DModal, setShow3DModal] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);

  // Get rich product details (from curated BAKERY_PRODUCTS or fallback)
  const detail: BakeryProductDetail = getBakeryProductDetail(
    product.id,
    product.name,
    product.price,
    product.image_url || undefined,
    product.description || undefined,
    categoryName
  );

  const gallery =
    detail.galleryImages && detail.galleryImages.length > 0
      ? detail.galleryImages
      : [detail.mainImage];

  const currentImage = gallery[activeImageIndex] || detail.mainImage;

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : gallery.length - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev < gallery.length - 1 ? prev + 1 : 0));
  };

  const handleIncrement = () => setQuantity((q) => q + 1);
  const handleDecrement = () => setQuantity((q) => Math.max(1, q - 1));

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem(product);
    }
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleAddRecommended = (item: typeof RECOMMENDED_PRODUCTS[0]) => {
    addItem({
      id: item.id,
      restaurant_id: restaurant.id,
      name: item.name,
      price: item.price,
      image_url: item.image,
      available: true,
      featured: true,
      category_id: null,
      sort_order: 0,
      description: "",
    });
  };

  return (
    <div className="min-h-screen bg-[#F4E9DC] text-[#29251F] font-sans selection:bg-[#C26B59] selection:text-[#F5EBDD]">
      {/* ── UNIFIED NAVBAR ── */}
      <Header cartCount={totalItems} />

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 md:pt-24 pb-16 sm:pb-24">
        {/* ═══ BREADCRUMB ═══ */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs sm:text-sm text-[#736857] mb-6 sm:mb-8 font-medium"
        >
          <Link
            href="/"
            className="hover:text-[#A34B3D] transition-colors"
          >
            Menu
          </Link>
          <span className="text-[#9E917E]">&gt;</span>
          <Link
            href="/#menu"
            className="hover:text-[#A34B3D] transition-colors"
          >
            {detail.category || "Cakes"}
          </Link>
          <span className="text-[#9E917E]">&gt;</span>
          <span className="text-[#29251F] font-semibold truncate max-w-[200px] sm:max-w-none">
            {detail.name}
          </span>
        </nav>

        {/* ═══ 2-COLUMN PRODUCT HERO SECTION ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ═══════════════════════════════════════════════════ */}
          {/* ── LEFT COLUMN: Gallery & "A Little About This Cake" ─ */}
          {/* ═══════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 space-y-6">
            {/* Main Product Image Card */}
            <div className="relative aspect-[1.05/1] sm:aspect-square w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-[#EAE0D1] border border-[#D9CBB7] shadow-[0_4px_20px_rgba(41,37,31,0.06)] group">
              <Image
                src={currentImage}
                alt={detail.name}
                fill
                priority
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />

              {/* Calligraphy doodle overlay on photo (top-left) */}
              {detail.imageScript && (
                <div className="absolute top-4 left-4 z-10 pointer-events-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
                  <span
                    className="text-lg sm:text-2xl text-white/95 leading-tight block whitespace-pre-line -rotate-6"
                    style={{
                      fontFamily: "var(--font-caveat), cursive, Georgia, serif",
                    }}
                  >
                    {detail.imageScript}
                  </span>
                </div>
              )}

              {/* Pure Veg / Eggless green badge icon (top-right) */}
              <div
                className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-xs p-1 rounded-md border border-[#238234] shadow-xs"
                title="100% Vegetarian"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#238234]" />
              </div>

              {/* "View in 3D" interactive button (bottom-left) */}
              <button
                onClick={() => setShow3DModal(true)}
                className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/45 hover:bg-black/60 backdrop-blur-md border border-white/30 text-white text-xs font-medium shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Box className="w-3.5 h-3.5" />
                <span>View in 3D</span>
              </button>
            </div>

            {/* Thumbnail Carousel Row */}
            <div className="flex items-center justify-between gap-2 px-1">
              <button
                onClick={handlePrevImage}
                className="w-8 h-8 rounded-full bg-[#EDE2D3] hover:bg-[#E2D5C3] border border-[#D5C6B1] flex items-center justify-center text-[#554D3F] hover:text-[#29251F] transition-colors cursor-pointer shrink-0 shadow-2xs"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none py-1">
                {gallery.map((imgUrl, index) => {
                  const isActive = index === activeImageIndex;
                  return (
                    <button
                      key={`thumb-${index}`}
                      onClick={() => setActiveImageIndex(index)}
                      className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                        isActive
                          ? "border-[#A34B3D] shadow-md scale-105"
                          : "border-[#D8C9B5] opacity-75 hover:opacity-100 hover:border-[#91885D]"
                      }`}
                    >
                      <Image
                        src={imgUrl}
                        alt={`${detail.name} view ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleNextImage}
                className="w-8 h-8 rounded-full bg-[#EDE2D3] hover:bg-[#E2D5C3] border border-[#D5C6B1] flex items-center justify-center text-[#554D3F] hover:text-[#29251F] transition-colors cursor-pointer shrink-0 shadow-2xs"
                aria-label="Next photo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* ── "A Little About This Cake" Section ── */}
            <div className="pt-4 border-t border-[#DFD3C1] space-y-3.5">
              <h2 className="font-serif text-2xl font-bold text-[#29251F]">
                {detail.storyTitle}
              </h2>
              <p className="text-sm sm:text-base text-[#5F5545] leading-relaxed">
                {detail.storyText}
              </p>

              {/* Quote Card */}
              {detail.quote && (
                <div className="rounded-2xl bg-[#EBE0CF] border border-[#D8CABA] p-4 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <Quote className="w-5 h-5 text-[#A34B3D] shrink-0 fill-[#A34B3D]/20" />
                    <p className="font-serif italic text-sm sm:text-base text-[#463D31]">
                      &ldquo;{detail.quote}&rdquo;
                    </p>
                  </div>
                  <span className="text-lg text-[#A34B3D]/80 font-serif">♡</span>
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════ */}
          {/* ── RIGHT COLUMN: Product Info, Price, Tabs & Cart ── */}
          {/* ═══════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 space-y-5 sm:space-y-6">
            {/* Top Row: Bestseller Badge + Doodle Text */}
            <div className="flex items-center justify-between gap-4">
              <span className="inline-block px-3 py-1 rounded-full bg-[#A34B3D] text-[#F5EBDD] text-[11px] font-bold uppercase tracking-wider shadow-xs">
                {detail.badge || badgeProp || "BESTSELLER"}
              </span>

              {detail.doodleTopRight && (
                <span
                  className="text-lg sm:text-2xl text-[#A34B3D] font-normal italic drop-shadow-2xs text-right"
                  style={{
                    fontFamily: "var(--font-caveat), cursive, Georgia, serif",
                  }}
                >
                  {detail.doodleTopRight}
                </span>
              )}
            </div>

            {/* Product Title */}
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.6rem] font-bold text-[#29251F] leading-[1.12] tracking-tight">
                {detail.name}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-[#695F50] leading-relaxed">
                {detail.subtitle}
              </p>
            </div>

            {/* Star Rating & Reviews & Wishlist Heart */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center text-[#DF9E26]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <span className="text-sm font-bold text-[#29251F]">
                  {detail.rating}
                </span>
                <span className="text-xs text-[#7A6E5D]">
                  ({detail.reviewCount})
                </span>
              </div>

              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className="p-2 rounded-full hover:bg-[#EAE0D1] text-[#695F50] transition-colors cursor-pointer"
                aria-label="Toggle wishlist"
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    isFavorite
                      ? "fill-[#A34B3D] text-[#A34B3D]"
                      : "text-[#695F50] hover:text-[#29251F]"
                  }`}
                />
              </button>
            </div>

            {/* Price Block */}
            <div className="space-y-0.5">
              <div className="font-serif text-3xl sm:text-4xl font-bold text-[#29251F]">
                ₹{detail.price}
              </div>
              <p className="text-xs text-[#7D7261]">
                (Inclusive of all taxes)
              </p>
            </div>

            {/* Quantity Stepper & Add to Cart */}
            <div className="flex items-center gap-3 sm:gap-4 pt-1">
              {/* Stepper */}
              <div className="flex items-center rounded-xl bg-[#EDE3D4] border border-[#D5C6B1] px-2 py-1.5">
                <button
                  onClick={handleDecrement}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#554D3F] hover:text-[#29251F] hover:bg-[#DFD3C0] transition-colors cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-9 text-center font-serif text-base font-bold text-[#29251F]">
                  {quantity}
                </span>
                <button
                  onClick={handleIncrement}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#554D3F] hover:text-[#29251F] hover:bg-[#DFD3C0] transition-colors cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-semibold text-sm sm:text-base text-white shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  isAdded
                    ? "bg-[#4D7C47]"
                    : "bg-[#A34B3D] hover:bg-[#8F3F32]"
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-5 h-5 stroke-[2.5]" />
                    <span>Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>
            </div>

            {/* 4 Feature Badges Row */}
            <div className="grid grid-cols-4 gap-2 pt-3">
              {detail.featureBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex flex-col items-center text-center gap-2"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#EAE0D1] border border-[#D7C9B6] flex items-center justify-center shadow-2xs">
                    <FeatureIcon type={badge.icon} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium text-[#594E3F] leading-tight max-w-[80px]">
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>

            {/* ── TABS CONTAINER (Allergen Info, Storage & Care) ── */}
            <div className="rounded-2xl bg-[#EBE0CF] border border-[#D8CABA] p-4 sm:p-5 shadow-2xs space-y-4">
              {/* Tab Navigation Header */}
              <div className="flex border-b border-[#D5C6B3] gap-6 text-xs sm:text-sm font-semibold text-[#6E6352]">
                <button
                  onClick={() => setActiveTab("allergen")}
                  className={`pb-2 transition-colors relative cursor-pointer ${
                    activeTab === "allergen"
                      ? "text-[#29251F]"
                      : "hover:text-[#29251F]"
                  }`}
                >
                  Allergen Info
                  {activeTab === "allergen" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#A34B3D]" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("storage")}
                  className={`pb-2 transition-colors relative cursor-pointer ${
                    activeTab === "storage"
                      ? "text-[#29251F]"
                      : "hover:text-[#29251F]"
                  }`}
                >
                  Storage & Care
                  {activeTab === "storage" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#A34B3D]" />
                  )}
                </button>
              </div>

              {/* Tab 1: Allergen Info */}
              {activeTab === "allergen" && (
                <div className="space-y-2 text-xs sm:text-sm text-[#554B3B] leading-relaxed pt-1">
                  {detail.allergenInfo.map((info, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-[#A34B3D] mt-1 font-bold">•</span>
                      <span>{info}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 2: Storage & Care */}
              {activeTab === "storage" && (
                <div className="space-y-2 text-xs sm:text-sm text-[#554B3B] leading-relaxed pt-1">
                  {detail.storageCare.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-[#A34B3D] mt-1 font-bold">✓</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── VALUE PROPS / TRUST BAR ── */}
            <div className="rounded-2xl bg-[#EBE0CF] border border-[#D8CABA] p-3.5 sm:p-4 grid grid-cols-3 divide-x divide-[#D5C6B3] text-center shadow-2xs">
              {/* Delivery */}
              <div className="px-2 flex flex-col items-center">
                <Truck className="w-5 h-5 text-[#5F5444] mb-1" />
                <span className="text-xs sm:text-sm font-bold text-[#29251F]">
                  Delivery in 12–24 hours
                </span>
                <span className="text-[10px] text-[#6E6352] mt-0.5">
                  Freshly baked & carefully packed
                </span>
              </div>

              {/* Gifting */}
              <div className="px-2 flex flex-col items-center">
                <Gift className="w-5 h-5 text-[#5F5444] mb-1" />
                <span className="text-xs sm:text-sm font-bold text-[#29251F]">
                  Perfect for gifting
                </span>
                <span className="text-[10px] text-[#6E6352] mt-0.5">
                  Add a personal note
                </span>
              </div>

              {/* Hygienic */}
              <div className="px-2 flex flex-col items-center">
                <ShieldCheck className="w-5 h-5 text-[#5F5444] mb-1" />
                <span className="text-xs sm:text-sm font-bold text-[#29251F]">
                  100% Hygienic
                </span>
                <span className="text-[10px] text-[#6E6352] mt-0.5">
                  Baked with the highest standards
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ═══ "YOU MAY ALSO LIKE" SECTION ═══ */}
        {/* ══════════════════════════════════════════════════════════ */}
        <section className="mt-16 sm:mt-24 pt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#29251F]">
              You May Also Like
            </h2>
            <div className="hidden sm:block">
              <SpoonDivider />
            </div>
            <Link
              href="/#menu"
              className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#29251F] hover:text-[#A34B3D] transition-colors"
            >
              <span>See All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
            {RECOMMENDED_PRODUCTS.map((rec) => (
              <div
                key={rec.id}
                className="group flex flex-col rounded-2xl bg-[#EBE0CF] border border-[#D8CABA] p-2.5 sm:p-3 shadow-2xs hover:shadow-md hover:border-[#91885D]/60 transition-all duration-300"
              >
                {/* Photo */}
                <Link
                  href={`/store/${slug}/product/${rec.id}`}
                  className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#E2D5C3] block cursor-pointer"
                >
                  <Image
                    src={rec.image}
                    alt={rec.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Heart button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-xs flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                    aria-label="Wishlist"
                  >
                    <Heart className="w-3.5 h-3.5 text-white" />
                  </button>
                </Link>

                {/* Details */}
                <div className="flex flex-col flex-1 justify-between pt-2.5">
                  <Link
                    href={`/store/${slug}/product/${rec.id}`}
                    className="font-serif font-bold text-xs sm:text-sm text-[#29251F] line-clamp-2 hover:text-[#A34B3D] transition-colors"
                  >
                    {rec.name}
                  </Link>

                  <div className="flex items-center justify-between pt-2 mt-auto">
                    <span className="font-serif font-bold text-sm text-[#29251F]">
                      ₹{rec.price}
                    </span>
                    <button
                      onClick={() => handleAddRecommended(rec)}
                      className="w-8 h-8 rounded-lg bg-[#A34B3D] hover:bg-[#8F3F32] text-white flex items-center justify-center shadow-xs transition-transform active:scale-90 cursor-pointer"
                      aria-label={`Add ${rec.name} to cart`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ═══ VINTAGE BANNER RIBBON (MATCHING EXACT PHOTO) ═══ */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="mt-16 sm:mt-24 rounded-2xl sm:rounded-3xl border border-[#91885D]/40 p-4 sm:p-6 overflow-hidden relative shadow-sm"
          style={{
            backgroundColor: "#7D8267",
            backgroundImage: `radial-gradient(#A95145 15%, transparent 16%), radial-gradient(#91885D 15%, transparent 16%)`,
            backgroundSize: "28px 28px",
            backgroundPosition: "0 0, 14px 14px",
          }}
        >
          {/* Overlay to give subtle vintage parchment tint */}
          <div className="absolute inset-0 bg-[#747A5F]/75 pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 py-2">
            {/* Left Pill */}
            <div className="rounded-full bg-[#EFE4D3] border border-[#B9AA95] px-4 sm:px-6 py-2 sm:py-2.5 text-center shadow-xs">
              <span className="font-serif text-xs sm:text-sm font-semibold text-[#29251F]">
                Life is sweeter with good desserts. ♥
              </span>
            </div>

            {/* Center Antique Medallion */}
            <div className="flex flex-col items-center justify-center rounded-full bg-[#FAF5ED] border-2 border-[#8A8F76] px-5 sm:px-8 py-3 text-center shadow-md">
              <span className="text-[9px] uppercase tracking-widest text-[#787D64] font-bold">
                — The —
              </span>
              <span className="font-serif font-bold text-sm sm:text-base text-[#29251F] tracking-wide">
                INDULGENT SPOON
              </span>
            </div>

            {/* Right Pill */}
            <div className="rounded-full bg-[#EFE4D3] border border-[#B9AA95] px-4 sm:px-6 py-2 sm:py-2.5 text-center shadow-xs">
              <span className="font-serif text-xs sm:text-sm font-semibold text-[#29251F]">
                Baked with love. Just for you. ♥
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* ═══ INTERACTIVE 3D MODAL ═══ */}
      {show3DModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#FAF5ED] border border-[#D9CBB7] p-6 shadow-2xl space-y-4">
            {/* Close */}
            <button
              onClick={() => setShow3DModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#EDE2D3] hover:bg-[#DFD3C0] text-[#29251F] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h3 className="font-serif text-xl font-bold text-[#29251F]">
                360° Cake Studio
              </h3>
              <p className="text-xs text-[#695F50] mt-0.5">
                Drag slider to rotate and inspect this artisanal creation
              </p>
            </div>

            {/* 3D Viewer Box */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#E6DAC9] border border-[#D2C3AF] flex items-center justify-center shadow-inner">
              <div
                className="relative w-4/5 h-4/5 transition-transform duration-100 ease-out"
                style={{
                  transform: `rotateY(${rotationAngle}deg) scale(1.05)`,
                  perspective: "1000px",
                }}
              >
                <Image
                  src={currentImage}
                  alt={detail.name}
                  fill
                  className="object-cover rounded-2xl shadow-xl"
                />
              </div>

              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 text-white text-[10px] backdrop-blur-xs">
                <Sparkles className="w-3 h-3 text-[#E8D5BC]" />
                <span>Drag to inspect</span>
              </div>
            </div>

            {/* Rotation slider */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs text-[#695F50]">
                <span>Rotate 360°</span>
                <span>{rotationAngle}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={rotationAngle}
                onChange={(e) => setRotationAngle(Number(e.target.value))}
                className="w-full accent-[#A34B3D] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
