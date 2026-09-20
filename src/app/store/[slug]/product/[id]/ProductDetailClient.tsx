"use client";

import React, { useState, useEffect } from "react";
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
  Star,
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
  recommendedProducts?: Product[];
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
  recommendedProducts = [],
}: Props) {
  const { addItem, totalItems, getProductQuantity } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  // Normalize gallery images so multiple photos always show correctly
  let allGalleryImages: string[] = [];
  if (Array.isArray(product.gallery_images)) {
    allGalleryImages = product.gallery_images.filter(
      (img): img is string => typeof img === "string" && img.trim().length > 0
    );
  } else if (typeof product.gallery_images === "string") {
    try {
      const parsed = JSON.parse(product.gallery_images);
      if (Array.isArray(parsed)) {
        allGalleryImages = parsed.filter(
          (img): img is string => typeof img === "string" && img.trim().length > 0
        );
      }
    } catch {
      allGalleryImages = (product.gallery_images as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  if (product.image_url && !allGalleryImages.includes(product.image_url)) {
    allGalleryImages = [product.image_url, ...allGalleryImages];
  }

  const gallery =
    allGalleryImages.length > 0
      ? allGalleryImages
      : [
          product.image_url ||
          "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80",
        ];

  const currentImage = gallery[activeImageIndex] || gallery[0];

  // Get rich product details (from curated BAKERY_PRODUCTS or fallback)
  const baseDetail: BakeryProductDetail = getBakeryProductDetail(
    product.id,
    product.name,
    product.price,
    gallery[0],
    product.description || undefined,
    categoryName
  );

  // Override with actual DB product fields when available (admin-created products)
  const detail: BakeryProductDetail = {
    ...baseDetail,
    name: product.name || baseDetail.name,
    price: product.price ?? baseDetail.price,
    subtitle: product.description || baseDetail.subtitle,
    mainImage: gallery[0],
    galleryImages: gallery,
    // Use DB sizes/addons if they have entries, otherwise keep fallback
    ...(product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0
      ? { sizes: product.sizes as BakeryProductDetail["sizes"] }
      : {}),
    ...(product.addons && Array.isArray(product.addons) && product.addons.length > 0
      ? { addons: product.addons as BakeryProductDetail["addons"] }
      : {}),
    // Use DB tags if available
    ...(product.tags && product.tags.length > 0
      ? { tags: product.tags }
      : {}),
    // Use DB allergen/storage info strictly
    allergenInfo: Array.isArray(product.allergen_info)
      ? product.allergen_info
      : (product.allergen_info
          ? [product.allergen_info]
          : (baseDetail?.allergenInfo || [])),
    storageCare: Array.isArray(product.storage_care)
      ? product.storage_care
      : (product.storage_care
          ? [product.storage_care]
          : (baseDetail?.storageCare || [])),
    // Use DB story text
    ...(product.story_text
      ? { storyText: product.story_text }
      : {}),
    // Use DB rating
    ...(product.rating != null
      ? { rating: Number(product.rating) }
      : {}),
  };

  const initialSizeId =
    detail.sizes?.find((s) => s.isDefault)?.id || detail.sizes?.[0]?.id || "";
  const [selectedSizeId, setSelectedSizeId] = useState<string>(initialSizeId);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  useEffect(() => {
    if (detail.sizes && detail.sizes.length > 0) {
      const def = detail.sizes.find((s) => s.isDefault)?.id || detail.sizes[0].id;
      setSelectedSizeId(def);
      setSelectedAddonIds([]);
    }
  }, [detail.id]);

  const selectedSizeObj =
    detail.sizes?.find((s) => s.id === selectedSizeId) || detail.sizes?.[0];
  const basePrice = selectedSizeObj?.price ?? detail.price;
  const addonsTotal = (detail.addons || [])
    .filter((a) => selectedAddonIds.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);
  const unitPrice = basePrice + addonsTotal;

  const toggleAddon = (addonId: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId]
    );
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : gallery.length - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev < gallery.length - 1 ? prev + 1 : 0));
  };

  const handleIncrement = () => setQuantity((q) => q + 1);
  const handleDecrement = () => setQuantity((q) => Math.max(1, q - 1));

  const handleAddToCart = () => {
    const selectedSizeLabel = selectedSizeObj?.label;
    const selectedAddonObjects = (detail.addons || []).filter((a) =>
      selectedAddonIds.includes(a.id)
    );

    const variantId = `${product.id}-${selectedSizeId || "default"}-${[...selectedAddonIds].sort().join("-")}`;

    const variantName = selectedSizeLabel
      ? `${detail.name} (${selectedSizeLabel}${
          selectedAddonObjects.length > 0
            ? ` + ${selectedAddonObjects.map((a) => a.label.split("/")[0].trim()).join(", ")}`
            : ""
        })`
      : detail.name;

    const variantDesc = [
      selectedSizeLabel ? `Size: ${selectedSizeLabel}` : null,
      selectedAddonObjects.length > 0
        ? `Add-ons: ${selectedAddonObjects.map((a) => `${a.label} (+₹${a.price})`).join(", ")}`
        : null,
      detail.subtitle || product.description,
    ]
      .filter(Boolean)
      .join(" • ");

    const configuredProduct: Product = {
      ...product,
      id: variantId,
      name: detail.name,
      price: unitPrice,
      description: variantDesc,
    };

    addItem(configuredProduct, quantity, {
      sizeLabel: selectedSizeLabel,
      addons: selectedAddonObjects.map((a) => ({
        id: a.id,
        label: a.label.split("/")[0].trim(),
        price: a.price,
      })),
      unitPrice,
    });

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleAddRecommended = (item: Product) => {
    addItem({
      id: item.id,
      restaurant_id: restaurant.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url || gallery[0],
      available: true,
      featured: true,
      category_id: item.category_id || null,
      sort_order: item.sort_order || 0,
      description: item.description || "",
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
          </div>

          {/* ═══════════════════════════════════════════════════ */}
          {/* ── RIGHT COLUMN: Product Info, Price, Sizes, Addons & Cart ── */}
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

            {/* Product Title & Subtitle */}
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.6rem] font-bold text-[#29251F] leading-[1.12] tracking-tight">
                {detail.name}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-[#695F50] leading-relaxed">
                {detail.subtitle}
              </p>
            </div>

            {/* Star Rating & Reviews & Wishlist Heart */}
            <div className="flex items-center justify-between gap-3 pt-0.5">
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

            {/* Dynamic Price Block */}
            <div className="space-y-0.5 pt-1">
              <div className="flex items-baseline gap-2.5">
                <span className="font-serif text-3xl sm:text-4xl font-bold text-[#29251F]">
                  ₹{unitPrice}
                </span>
                {addonsTotal > 0 && (
                  <span className="text-xs text-[#7A6E5D] font-medium">
                    (₹{basePrice} base + ₹{addonsTotal} add-ons)
                  </span>
                )}
              </div>
              <p className="text-xs text-[#7D7261]">
                (Inclusive of all taxes)
              </p>
            </div>

            {/* ── SIZE / PACK SELECTION ── */}
            {detail.sizes && detail.sizes.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#736754]">
                    {detail.categorySlug === "muffins"
                      ? "Select Pack"
                      : "Portion & Size"}
                  </span>
                  {selectedSizeObj?.label && (
                    <span className="text-xs text-[#A34B3D] font-bold">
                      {selectedSizeObj.label}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {detail.sizes.map((s) => {
                    const isSelected = selectedSizeId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSizeId(s.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer border ${
                          isSelected
                            ? "bg-[#A34B3D] text-[#FAF5ED] border-[#A34B3D] shadow-sm scale-[1.02] ring-1.5 ring-[#A34B3D]/30"
                            : "bg-[#FAF4EB] text-[#3E362A] border-[#D8CABA] hover:border-[#968972] hover:bg-[#FDF8F3]"
                        }`}
                      >
                        <span>{s.label}</span>
                        {s.price !== undefined && (
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-lg font-black transition-colors ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-[#EDE2D1] text-[#7A362B]"
                            }`}
                          >
                            ₹{s.price}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── HANDCRAFTED ADD-ONS SELECTION ── */}
            {detail.addons && detail.addons.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#736754]">
                      Customize & Add-ons
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EADCCB] text-[#554D3F]">
                      Optional
                    </span>
                  </div>
                  {selectedAddonIds.length > 0 && (
                    <span className="text-xs font-bold text-[#A34B3D] animate-in fade-in duration-200">
                      +{selectedAddonIds.length} selected (+₹{addonsTotal})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {detail.addons.map((addon) => {
                    const isSelected = selectedAddonIds.includes(addon.id);
                    const subtitle =
                      addon.id === "wholewheat"
                        ? "100% stoneground whole grain"
                        : addon.id === "birthday"
                        ? "Gold celebration topper"
                        : addon.id === "message-card"
                        ? "Handwritten calligraphy card"
                        : addon.id === "candles" || addon.id === "candle"
                        ? "Celebration taper candle"
                        : addon.id === "gift-box"
                        ? "Ribbon gift packaging"
                        : "Handcrafted addition";

                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => toggleAddon(addon.id)}
                        className={`group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer select-none active:scale-[0.99] ${
                          isSelected
                            ? "bg-[#FFF9F3] border-[#A34B3D] shadow-[0_2px_14px_rgba(163,75,61,0.12)] ring-1.5 ring-[#A34B3D] -translate-y-0.5"
                            : "bg-[#FAF4EB]/90 border-[#D8C9B5] hover:border-[#968972] hover:bg-[#FAF4EB] hover:-translate-y-0.5 shadow-2xs hover:shadow-xs"
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-1.5">
                          {/* Label & Description (Fully visible, no ellipsis) */}
                          <span
                            className={`text-xs sm:text-[13px] font-bold block leading-snug transition-colors ${
                              isSelected ? "text-[#29251F]" : "text-[#3D3529]"
                            }`}
                          >
                            {addon.label}
                          </span>
                          <span className="text-[10.5px] sm:text-[11px] text-[#7A6D5A] mt-0.5 block leading-tight">
                            {subtitle}
                          </span>
                        </div>

                        {/* Price Tag & Checkbox */}
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span
                            className={`text-[11.5px] sm:text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap transition-all ${
                              isSelected
                                ? "bg-[#A34B3D] text-[#FAF5ED]"
                                : "bg-[#EDE2D1] text-[#7A362B] group-hover:bg-[#E3D4BF]"
                            }`}
                          >
                            +₹{addon.price}
                          </span>

                          <div
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-200 shrink-0 ${
                              isSelected
                                ? "bg-[#A34B3D] border-[#A34B3D] text-white shadow-xs scale-105"
                                : "border-[#B5A490] bg-white/80 group-hover:border-[#7A362B]"
                            }`}
                          >
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Already in Basket Banner */}
            {getProductQuantity(product.id) > 0 && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#4D7C47]/10 border border-[#4D7C47]/30 text-[#29251F] text-xs animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#4D7C47] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                  <div>
                    <p className="font-bold text-[#2D5A27]">
                      Already in your basket ({getProductQuantity(product.id)} item{getProductQuantity(product.id) > 1 ? "s" : ""})
                    </p>
                    <p className="text-[11px] text-[#554D3F]">
                      You can add more quantities or select additional toppings below.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/store/${slug}/cart`}
                  className="font-bold text-[#A34B3D] hover:text-[#7A362B] text-xs underline shrink-0 pl-2"
                >
                  View Cart
                </Link>
              </div>
            )}

            {/* Quantity Stepper & Add to Cart */}
            {(() => {
              const isSoldOut =
                !product.available ||
                (product.order_limit != null &&
                  product.order_limit > 0 &&
                  (product.total_ordered || 0) >= product.order_limit);

              if (isSoldOut) {
                return (
                  <div className="w-full py-4 px-6 rounded-xl bg-rose-950/10 border border-rose-900/20 text-rose-900 text-center font-bold text-sm tracking-wider uppercase">
                    Sold Out (Order Limit Reached or Product Unavailable)
                  </div>
                );
              }

              return (
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
                        : getProductQuantity(product.id) > 0
                        ? "bg-[#5D6B3F] hover:bg-[#4E5B33]"
                        : "bg-[#A34B3D] hover:bg-[#8F3F32]"
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-5 h-5 stroke-[2.5]" />
                        <span>Added to Cart!</span>
                      </>
                    ) : getProductQuantity(product.id) > 0 ? (
                      <>
                        <Check className="w-5 h-5 stroke-[2.5]" />
                        <span>
                          In Cart ({getProductQuantity(product.id)}) • Add More (+₹{unitPrice * quantity})
                        </span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        <span>
                          Add to Cart • ₹{unitPrice * quantity}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              );
            })()}

            {/* ── ALLERGEN INFO (Clean, concise card) ── */}
            {detail.allergenInfo && detail.allergenInfo.length > 0 && (
              <div className="rounded-2xl bg-[#EBE0CF] border border-[#D8CABA] p-4 sm:p-5 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#29251F]">
                  <span className="w-2 h-2 rounded-full bg-[#A34B3D]" />
                  <span>Allergen Info</span>
                </div>
                <div className="space-y-1.5 text-xs sm:text-sm text-[#554B3B] leading-relaxed">
                  {detail.allergenInfo.map((info, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-[#A34B3D] mt-0.5 font-bold">•</span>
                      <span>{info}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── STORAGE & CARE (Clean, concise card) ── */}
            {detail.storageCare && detail.storageCare.length > 0 && (
              <div className="rounded-2xl bg-[#EBE0CF] border border-[#D8CABA] p-4 sm:p-5 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#29251F]">
                  <span className="w-2 h-2 rounded-full bg-spoon-caramel" />
                  <span>Storage & Care Instructions</span>
                </div>
                <div className="space-y-1.5 text-xs sm:text-sm text-[#554B3B] leading-relaxed">
                  {detail.storageCare.map((info, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-[#A34B3D] mt-0.5 font-bold">•</span>
                      <span>{info}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ═══ "YOU MAY ALSO LIKE" SECTION ═══ */}
        {/* ══════════════════════════════════════════════════════════ */}
        {recommendedProducts && recommendedProducts.length > 0 && (
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
              {recommendedProducts.map((rec) => (
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
                      src={rec.image_url || gallery[0]}
                      alt={rec.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
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
        )}

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
    </div>
  );
}
