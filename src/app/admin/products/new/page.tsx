"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/lib/admin/AdminContext";
import {
  getAdminCategories,
  createAdminCategory,
  createAdminProduct,
} from "@/lib/admin/admin-service";
import { validateImageFile, uploadProductImage } from "@/lib/supabase/storage";
import type {
  Category,
  ProductSizeOption,
  ProductAddonOption,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
  Plus,
  Trash2,
  Sparkles,
  ShieldAlert,
  Layers,
  ShoppingBag,
  Star,
  Images,
  BookmarkPlus,
} from "lucide-react";

const DEFAULT_ALLERGEN_PRESETS = [
  "Contains Wheat (Gluten), Dairy (Butter & Milk)",
  "Contains Tree Nuts (Almonds, Pistachios) & Dairy",
  "100% Eggless & Gelatin-Free",
  "Contains Soy & Wheat (Gluten)",
  "Gluten-Free & Dairy-Free",
  "Nut-Free Facility",
];

interface GalleryItem {
  id: string;
  previewUrl: string;
  file?: File;
  isCover?: boolean;
}

export default function AdminNewProductPage() {
  const { restaurant } = useAdmin();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Form State - Basic
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [storyText, setStoryText] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [badge, setBadge] = useState<string>("POPULAR");
  const [isVeg, setIsVeg] = useState(true);
  const [available, setAvailable] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState("0");
  const [orderLimit, setOrderLimit] = useState("");

  // Multi-Image Gallery State
  const [galleryList, setGalleryList] = useState<GalleryItem[]>([]);
  const [urlInput, setUrlInput] = useState("");

  // Sizes & Variants
  const [sizes, setSizes] = useState<ProductSizeOption[]>([
    { id: "size-350g", label: "350 gms", isDefault: true },
  ]);

  // Add-ons
  const [addons, setAddons] = useState<ProductAddonOption[]>([
    { id: "birthday", label: "Birthday Tag", price: 40, icon: "🎂" },
    { id: "message-card", label: "Message Card", price: 20, icon: "💌" },
    { id: "candle", label: "Celebration Candle", price: 40, icon: "🕯️" },
  ]);

  // Allergen Info & Presets
  const [allergenInfo, setAllergenInfo] = useState<string[]>([
    "Contains Wheat (Gluten), Dairy (Butter & Milk)",
  ]);
  const [allergenInput, setAllergenInput] = useState("");
  const [customPresets, setCustomPresets] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("spoon_allergen_presets");
      if (saved) {
        setCustomPresets(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load allergen presets", e);
    }
  }, []);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [newCatInput, setNewCatInput] = useState("");
  const [showAddCat, setShowAddCat] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    if (restaurant?.id) {
      getAdminCategories(restaurant.id)
        .then((cats) => {
          setCategories(cats);
          if (cats.length > 0) {
            setCategoryId((prev) => prev || cats[0].id);
          }
        })
        .catch((err) => console.error("Error loading categories:", err))
        .finally(() => setLoadingCategories(false));
    }
  }, [restaurant?.id]);

  // Inline Category Creator
  const handleQuickCreateCategory = async () => {
    if (!newCatInput.trim() || !restaurant?.id) return;
    try {
      setCreatingCategory(true);
      setErrorMsg(null);
      const newCat = await createAdminCategory(restaurant.id, newCatInput.trim());
      setCategories((prev) => [...prev, newCat]);
      setCategoryId(newCat.id);
      setNewCatInput("");
      setShowAddCat(false);
      setSuccessMsg(`Category "${newCat.name}" added and selected!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      console.error("Failed to create category:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  };

  // Multi-Image File Selection Handler
  const handleMultipleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg(null);
    const newItems: GalleryItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setErrorMsg(`File ${file.name}: ${validation.error || "Invalid file"}`);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        previewUrl,
        file,
      });
    }

    if (newItems.length > 0) {
      setGalleryList((prev) => [...prev, ...newItems]);
    }
    e.target.value = "";
  };

  // Add Direct Image URL
  const handleAddImageUrl = () => {
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    setGalleryList((prev) => [
      ...prev,
      {
        id: `url-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        previewUrl: url,
      },
    ]);
    setUrlInput("");
  };

  // Make an image the primary cover photo
  const handleSetCover = (index: number) => {
    if (index === 0) return;
    setGalleryList((prev) => {
      const updated = [...prev];
      const [chosen] = updated.splice(index, 1);
      return [chosen, ...updated];
    });
  };

  // Remove single image from gallery
  const handleRemoveImage = (index: number) => {
    setGalleryList((prev) => {
      const target = prev[index];
      if (target?.file) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Preset Handlers
  const applyTeaCakePreset = () => {
    setSizes([{ id: "size-350g", label: "350 gms", isDefault: true }]);
    setAddons([
      { id: "birthday", label: "Birthday Tag", price: 40, icon: "🎂" },
      { id: "message-card", label: "Message Card", price: 20, icon: "💌" },
      { id: "candle", label: "Celebration Candle", price: 40, icon: "🕯️" },
    ]);
  };

  const applyMuffinPreset = () => {
    setSizes([
      { id: "pack-4", label: "Pack of 4", price: 500, isDefault: true },
      { id: "pack-8", label: "Pack of 8", price: 1000 },
      { id: "pack-12", label: "Pack of 12", price: 1500 },
    ]);
    setAddons([
      { id: "birthday", label: "Birthday Tag", price: 40, icon: "🎂" },
      { id: "message-card", label: "Message Card", price: 20, icon: "💌" },
      { id: "candles", label: "Celebration Candles", price: 40, icon: "🕯️" },
      { id: "gift-box", label: "Gift Box", price: 40, icon: "🎁" },
    ]);
  };

  const applySourdoughPreset = () => {
    setSizes([
      { id: "loaf-500g", label: "Artisanal Loaf (500g)", isDefault: true },
    ]);
    setAddons([
      { id: "wholewheat", label: "Wholewheat Upgrade", price: 100, icon: "🌾" },
    ]);
  };

  const applySpreadPreset = () => {
    setSizes([{ id: "size-240g", label: "240 gm Jar", isDefault: true }]);
    setAddons([
      { id: "birthday", label: "Birthday Tag", price: 40, icon: "🎂" },
      { id: "message-card", label: "Message Card", price: 20, icon: "💌" },
      { id: "candle", label: "Celebration Candle", price: 40, icon: "🕯️" },
    ]);
  };

  // Add/Remove Size item
  const addSizeItem = () => {
    const id = `size-${Date.now()}`;
    setSizes([...sizes, { id, label: "500 gms", price: undefined }]);
  };

  const updateSizeItem = (
    index: number,
    field: keyof ProductSizeOption,
    value: any
  ) => {
    const updated = [...sizes];
    updated[index] = { ...updated[index], [field]: value };
    setSizes(updated);
  };

  const removeSizeItem = (index: number) => {
    setSizes(sizes.filter((_, i) => i !== index));
  };

  // Add/Remove Addon item
  const addAddonItem = () => {
    const id = `addon-${Date.now()}`;
    setAddons([...addons, { id, label: "Extra Luxury Topping", price: 50, icon: "✨" }]);
  };

  const updateAddonItem = (
    index: number,
    field: keyof ProductAddonOption,
    value: any
  ) => {
    const updated = [...addons];
    updated[index] = { ...updated[index], [field]: value };
    setAddons(updated);
  };

  const removeAddonItem = (index: number) => {
    setAddons(addons.filter((_, i) => i !== index));
  };

  // Add Allergen Info
  const handleAddAllergen = () => {
    if (allergenInput.trim() && !allergenInfo.includes(allergenInput.trim())) {
      setAllergenInfo([...allergenInfo, allergenInput.trim()]);
      setAllergenInput("");
    }
  };

  const handleSavePreset = (textToSave?: string) => {
    const lineToSave = (
      textToSave ||
      allergenInput ||
      (allergenInfo.length > 0 ? allergenInfo[allergenInfo.length - 1] : "")
    ).trim();
    if (!lineToSave) return;
    if (
      !customPresets.includes(lineToSave) &&
      !DEFAULT_ALLERGEN_PRESETS.includes(lineToSave)
    ) {
      const updated = [...customPresets, lineToSave];
      setCustomPresets(updated);
      try {
        localStorage.setItem("spoon_allergen_presets", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save preset", e);
      }
    }
    if (allergenInput.trim() && !allergenInfo.includes(allergenInput.trim())) {
      setAllergenInfo([...allergenInfo, allergenInput.trim()]);
      setAllergenInput("");
    }
  };

  const handleDeleteCustomPreset = (
    presetToDelete: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const updated = customPresets.filter((p) => p !== presetToDelete);
    setCustomPresets(updated);
    try {
      localStorage.setItem("spoon_allergen_presets", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to delete preset", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) {
      setErrorMsg("Restaurant not found. Please refresh the page.");
      return;
    }

    if (!name.trim()) {
      setErrorMsg("Product title is required.");
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMsg("Please enter a valid base price.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      // Process all images (Supabase storage with automatic Data URL fallback)
      const finalImageUrls: string[] = [];
      for (const item of galleryList) {
        if (item.file) {
          const uploadRes = await uploadProductImage(restaurant.id, item.file);
          if (uploadRes.url) {
            finalImageUrls.push(uploadRes.url);
          } else if (uploadRes.error) {
            console.warn("Image upload warning:", uploadRes.error);
          }
        } else if (item.previewUrl) {
          finalImageUrls.push(item.previewUrl);
        }
      }

      const coverImageUrl = finalImageUrls[0] || null;

      await createAdminProduct(restaurant.id, {
        name: name.trim(),
        description: description.trim(),
        story_text: storyText.trim(),
        price: parsedPrice,
        category_id: categoryId || null,
        badge: badge === "NONE" ? null : badge,
        order_limit: orderLimit.trim() ? parseInt(orderLimit, 10) : null,
        total_ordered: 0,
        is_veg: isVeg,
        available,
        featured,
        sort_order: parseInt(sortOrder, 10) || 0,
        sizes,
        addons,
        tags: [],
        allergen_info: allergenInfo,
        storage_care: [],
        image_url: coverImageUrl,
        gallery_images: finalImageUrls,
      });

      setSuccessMsg("Product created successfully with all photos & options! Redirecting...");
      setTimeout(() => {
        router.push("/admin/products");
      }, 1000);
    } catch (err: unknown) {
      console.error("Create product failed:", err);
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to create product"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-spoon-border/60">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-spoon-sand text-spoon-dark hover:bg-spoon-border transition-colors shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-spoon-dark">
              Add New Bakery Item
            </h1>
            <p className="text-xs text-spoon-muted">
              Configure product details, multiple gallery images, pack sizes, and custom add-ons.
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-medium text-rose-900">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-medium text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. BASIC INFORMATION CARD */}
        <div className="rounded-3xl border border-spoon-border bg-white p-6 sm:p-8 shadow-warm-sm space-y-5">
          <div className="flex items-center justify-between border-b border-spoon-border/50 pb-3">
            <h2 className="font-serif text-lg font-bold text-spoon-dark flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-spoon-caramel" />
              <span>1. Basic Information</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-spoon-muted">Dietary:</span>
              <button
                type="button"
                onClick={() => setIsVeg(!isVeg)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  isVeg
                    ? "bg-[#238234]/15 text-[#238234] border border-[#238234]/30"
                    : "bg-rose-100 text-rose-800 border border-rose-200"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isVeg ? "bg-[#238234]" : "bg-rose-600"
                  }`}
                />
                <span>{isVeg ? "100% Pure Veg / Eggless" : "Contains Egg"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                Product Title *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. OG Choco Chip Butter Cake"
                required
                className="text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                Base Price (₹) *
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="900"
                required
                className="text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark">
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddCat(!showAddCat)}
                  className="text-[11px] font-bold text-spoon-caramel hover:text-spoon-dark transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{showAddCat ? "Select Existing" : "+ New Category"}</span>
                </button>
              </div>

              {showAddCat ? (
                <div className="flex gap-1.5">
                  <Input
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    placeholder="Category name..."
                    className="text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleQuickCreateCategory();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleQuickCreateCategory}
                    disabled={creatingCategory || !newCatInput.trim()}
                    className="shrink-0 bg-spoon-caramel hover:bg-spoon-dark text-white text-xs px-3 h-9"
                  >
                    {creatingCategory ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
                  </Button>
                </div>
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-2xl border border-spoon-border bg-white px-3.5 py-2.5 text-xs font-semibold text-spoon-dark focus:outline-none focus:ring-2 focus:ring-spoon-caramel/20"
                >
                  {loadingCategories ? (
                    <option>Loading categories...</option>
                  ) : categories.length === 0 ? (
                    <option value="">No categories (Click + New Category above)</option>
                  ) : (
                    categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                Ribbon Badge
              </label>
              <select
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="w-full rounded-2xl border border-spoon-border bg-white px-3.5 py-2.5 text-xs font-semibold text-spoon-dark focus:outline-none focus:ring-2 focus:ring-spoon-caramel/20"
              >
                <option value="NONE">No Badge</option>
                <option value="POPULAR">POPULAR (Red)</option>
                <option value="BESTSELLER">BESTSELLER (Maroon)</option>
                <option value="NEW!">NEW! (Terracotta)</option>
                <option value="CHEF'S PICK">CHEF&apos;S PICK (Gold)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                Display Sort Order
              </label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="1"
                className="text-xs"
              />
            </div>
          </div>

          {/* Daily Order / Stock Limit */}
          <div className="rounded-2xl bg-spoon-sand/50 border border-spoon-border/80 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark">
                  Daily Order Limit / Batch Size
                </label>
                <p className="text-[11px] text-spoon-muted mt-0.5">
                  Set the maximum number of orders for this item. Once orders reach this number, it automatically marks as <strong className="text-[#A34B3D]">SOLD OUT</strong> on the website!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Input
                type="number"
                min="1"
                step="1"
                value={orderLimit}
                onChange={(e) => setOrderLimit(e.target.value)}
                placeholder="e.g. 10 (Leave blank for Unlimited orders)"
                className="max-w-xs text-xs font-bold bg-white"
              />
              <span className="text-xs font-medium text-spoon-muted">
                {orderLimit ? `Max ${orderLimit} orders per day` : "Unlimited daily orders"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
              Short Description / Subtitle
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Soft, buttery & loaded with choco chips. The Nanz Original."
              className="text-xs"
            />
          </div>
        </div>

        {/* 2. MULTIPLE FOOD PHOTOGRAPHY & GALLERY */}
        <div className="rounded-3xl border border-spoon-border bg-white p-6 sm:p-8 shadow-warm-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-spoon-border/50 pb-3">
            <div>
              <h2 className="font-serif text-lg font-bold text-spoon-dark flex items-center gap-2">
                <Images className="w-4 h-4 text-spoon-caramel" />
                <span>2. Product Photography & Gallery ({galleryList.length} photos)</span>
              </h2>
              <p className="text-[11px] text-spoon-muted">
                Add multiple angles and showcase images. The <strong>first image</strong> serves as the main Cover Photo.
              </p>
            </div>
          </div>

          {/* Add Photos Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Multi-file Upload Box */}
            <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-spoon-border p-5 text-center bg-spoon-cream hover:bg-spoon-sand/40 transition-colors cursor-pointer group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-spoon-border text-spoon-caramel mb-2 group-hover:scale-105 transition-transform shadow-xs">
                <ImagePlus className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-spoon-dark">
                Upload Multiple Images
              </p>
              <p className="text-[10.5px] text-spoon-muted mt-0.5">
                Select one or multiple JPG, PNG, WebP files
              </p>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleMultipleFiles}
                className="hidden"
              />
            </label>

            {/* Direct URL Add Box */}
            <div className="flex flex-col justify-center rounded-2xl border border-spoon-border bg-spoon-sand/30 p-4 space-y-2">
              <label className="text-xs font-bold text-spoon-dark">
                Add Image from URL
              </label>
              <div className="flex gap-2">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddImageUrl();
                    }
                  }}
                  placeholder="https://images.unsplash.com/..."
                  className="text-xs bg-white"
                />
                <Button
                  type="button"
                  onClick={handleAddImageUrl}
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs font-bold"
                >
                  Add
                </Button>
              </div>
              <span className="text-[10px] text-spoon-muted">
                Paste any high-res photo URL and click Add.
              </span>
            </div>
          </div>

          {/* Gallery Preview Grid */}
          {galleryList.length > 0 ? (
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-spoon-muted block">
                Gallery Photos (Click &ldquo;Make Cover&rdquo; to set primary image)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {galleryList.map((item, index) => {
                  const isCover = index === 0;

                  return (
                    <div
                      key={item.id}
                      className={`group relative aspect-4/3 rounded-2xl overflow-hidden border transition-all ${
                        isCover
                          ? "border-2 border-spoon-caramel shadow-warm-sm ring-2 ring-spoon-caramel/20"
                          : "border-spoon-border bg-spoon-sand/30"
                      }`}
                    >
                      <Image
                        src={item.previewUrl}
                        alt={`Product image ${index + 1}`}
                        fill
                        className="object-cover"
                      />

                      {/* Cover Badge */}
                      {isCover && (
                        <div className="absolute top-2 left-2 z-10">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider text-white bg-spoon-caramel shadow-sm">
                            <Star className="w-2.5 h-2.5 fill-white" />
                            <span>Cover</span>
                          </span>
                        </div>
                      )}

                      {/* Overlay Controls */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="h-7 w-7 rounded-full bg-black/75 text-white hover:bg-rose-600 transition-colors flex items-center justify-center shadow-sm"
                            title="Remove photo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {!isCover && (
                          <button
                            type="button"
                            onClick={() => handleSetCover(index)}
                            className="w-full py-1 rounded-lg bg-white text-spoon-dark hover:bg-spoon-caramel hover:text-white text-[10px] font-bold transition-all shadow-sm"
                          >
                            Make Cover
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-spoon-sand/20 border border-spoon-border/60 text-center text-xs text-spoon-muted">
              No photos uploaded yet. Upload your first product photography above.
            </div>
          )}
        </div>

        {/* 3. SIZES & PACK VARIANTS */}
        <div className="rounded-3xl border border-spoon-border bg-white p-6 sm:p-8 shadow-warm-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-spoon-border/50 pb-3">
            <div>
              <h2 className="font-serif text-lg font-bold text-spoon-dark flex items-center gap-2">
                <Layers className="w-4 h-4 text-spoon-caramel" />
                <span>3. Sizes & Pack Options</span>
              </h2>
              <p className="text-[11px] text-spoon-muted">
                Allow customers to choose size weights or pack counts (e.g. 350g, Pack of 4/8/12).
              </p>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase text-spoon-muted mr-1">Presets:</span>
              <button
                type="button"
                onClick={applyTeaCakePreset}
                className="text-[10.5px] font-semibold bg-spoon-sand/70 hover:bg-spoon-caramel hover:text-white px-2.5 py-1 rounded-lg border border-spoon-border transition-colors"
              >
                Tea Cake (350g)
              </button>
              <button
                type="button"
                onClick={applyMuffinPreset}
                className="text-[10.5px] font-semibold bg-spoon-sand/70 hover:bg-spoon-caramel hover:text-white px-2.5 py-1 rounded-lg border border-spoon-border transition-colors"
              >
                Muffins (4/8/12)
              </button>
              <button
                type="button"
                onClick={applySourdoughPreset}
                className="text-[10.5px] font-semibold bg-spoon-sand/70 hover:bg-spoon-caramel hover:text-white px-2.5 py-1 rounded-lg border border-spoon-border transition-colors"
              >
                Sourdough (500g)
              </button>
              <button
                type="button"
                onClick={applySpreadPreset}
                className="text-[10.5px] font-semibold bg-spoon-sand/70 hover:bg-spoon-caramel hover:text-white px-2.5 py-1 rounded-lg border border-spoon-border transition-colors"
              >
                Spread (240g)
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {sizes.map((sz, idx) => (
              <div
                key={sz.id || idx}
                className="flex items-center gap-3 p-3 rounded-2xl bg-spoon-cream/60 border border-spoon-border"
              >
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-spoon-muted uppercase block mb-1">
                    Label (e.g. Pack of 4 or 350 gms)
                  </label>
                  <Input
                    value={sz.label}
                    onChange={(e) => updateSizeItem(idx, "label", e.target.value)}
                    placeholder="e.g. 350 gms"
                    className="text-xs bg-white"
                  />
                </div>

                <div className="w-32">
                  <label className="text-[10px] font-bold text-spoon-muted uppercase block mb-1">
                    Specific Price (₹)
                  </label>
                  <Input
                    type="number"
                    value={sz.price !== undefined ? sz.price : ""}
                    onChange={(e) =>
                      updateSizeItem(
                        idx,
                        "price",
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="Base Price"
                    className="text-xs bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-spoon-dark cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!sz.isDefault}
                      onChange={(e) => updateSizeItem(idx, "isDefault", e.target.checked)}
                      className="rounded border-spoon-border text-spoon-caramel"
                    />
                    <span className="text-[11px]">Default</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => removeSizeItem(idx)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Remove size"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addSizeItem}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-spoon-caramel hover:text-spoon-dark transition-colors py-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Size / Pack</span>
            </button>
          </div>
        </div>

        {/* 4. CUSTOM ADD-ON OPTIONS */}
        <div className="rounded-3xl border border-spoon-border bg-white p-6 sm:p-8 shadow-warm-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-spoon-border/50 pb-3">
            <div>
              <h2 className="font-serif text-lg font-bold text-spoon-dark flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-spoon-caramel" />
                <span>4. Custom Add-on Options</span>
              </h2>
              <p className="text-[11px] text-spoon-muted">
                Extras customers can add to this dish (e.g. Birthday Tag +₹40, Candles +₹40, Gift Box +₹40).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={applyTeaCakePreset}
                className="text-[10.5px] font-semibold bg-spoon-sand/70 hover:bg-spoon-caramel hover:text-white px-2.5 py-1 rounded-lg border border-spoon-border transition-colors"
              >
                + Birthday & Cards
              </button>
              <button
                type="button"
                onClick={applySourdoughPreset}
                className="text-[10.5px] font-semibold bg-spoon-sand/70 hover:bg-spoon-caramel hover:text-white px-2.5 py-1 rounded-lg border border-spoon-border transition-colors"
              >
                + Wholewheat Sourdough
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {addons.map((add, idx) => (
              <div
                key={add.id || idx}
                className="flex items-center gap-3 p-3 rounded-2xl bg-spoon-cream/60 border border-spoon-border"
              >
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-spoon-muted uppercase block mb-1">
                    Add-on Title
                  </label>
                  <Input
                    value={add.label}
                    onChange={(e) => updateAddonItem(idx, "label", e.target.value)}
                    placeholder="e.g. Birthday Tag"
                    className="text-xs bg-white"
                  />
                </div>

                <div className="w-28">
                  <label className="text-[10px] font-bold text-spoon-muted uppercase block mb-1">
                    Extra Price (+₹)
                  </label>
                  <Input
                    type="number"
                    value={add.price}
                    onChange={(e) =>
                      updateAddonItem(idx, "price", parseFloat(e.target.value) || 0)
                    }
                    placeholder="40"
                    className="text-xs bg-white font-semibold"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => removeAddonItem(idx)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Remove addon"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addAddonItem}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-spoon-caramel hover:text-spoon-dark transition-colors py-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Add-on Option</span>
            </button>
          </div>
        </div>

        {/* 5. ALLERGEN INFORMATION */}
        <div className="rounded-3xl border border-spoon-border bg-white p-6 sm:p-8 shadow-warm-sm space-y-5">
          <div className="border-b border-spoon-border/50 pb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-spoon-dark flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-spoon-caramel" />
              <span>5. Allergen Information</span>
            </h2>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
              Allergen Information Lines
            </label>

            {/* Input + Add + Save Preset Button */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <Input
                value={allergenInput}
                onChange={(e) => setAllergenInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddAllergen();
                  }
                }}
                placeholder="e.g. Contains Wheat (Gluten), Dairy (Butter & Milk)"
                className="text-xs flex-1"
              />
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  onClick={handleAddAllergen}
                  variant="default"
                  size="sm"
                  className="bg-spoon-dark hover:bg-spoon-mocha text-white text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSavePreset()}
                  disabled={!allergenInput.trim() && allergenInfo.length === 0}
                  variant="outline"
                  size="sm"
                  className="text-xs border-spoon-border text-spoon-dark hover:bg-spoon-sand gap-1.5"
                  title="Save current allergen line as a reusable preset"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-spoon-caramel" />
                  Save as Preset
                </Button>
              </div>
            </div>

            {/* Active Allergen Lines */}
            {allergenInfo.length > 0 ? (
              <ul className="space-y-1.5 mb-4">
                {allergenInfo.map((info, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-spoon-cream text-xs text-spoon-dark border border-spoon-border/70"
                  >
                    <span className="font-medium">• {info}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAllergenInfo(allergenInfo.filter((_, i) => i !== idx))
                      }
                      className="text-spoon-muted hover:text-rose-600 p-1 rounded-md transition-colors"
                      title="Remove line"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-spoon-muted mb-4 italic">
                No allergen lines added yet. Type above or click a preset below.
              </p>
            )}

            {/* Quick Presets Section */}
            <div className="pt-3 border-t border-spoon-border/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-spoon-muted flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-spoon-caramel" />
                  Quick Allergen Presets (Click to toggle)
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {/* Built-in Presets */}
                {DEFAULT_ALLERGEN_PRESETS.map((preset, idx) => {
                  const isSelected = allergenInfo.includes(preset);
                  return (
                    <button
                      key={`preset-${idx}`}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setAllergenInfo(allergenInfo.filter((item) => item !== preset));
                        } else {
                          setAllergenInfo([...allergenInfo, preset]);
                        }
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all text-left flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-spoon-caramel/15 border-spoon-caramel text-spoon-dark font-medium"
                          : "bg-spoon-sand/50 hover:bg-spoon-sand border-spoon-border text-spoon-dark/80"
                      }`}
                    >
                      <span>{preset}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-3 h-3 text-spoon-caramel shrink-0" />
                      ) : (
                        <Plus className="w-3 h-3 text-spoon-muted shrink-0" />
                      )}
                    </button>
                  );
                })}

                {/* Custom Saved Presets */}
                {customPresets.map((preset, idx) => {
                  const isSelected = allergenInfo.includes(preset);
                  return (
                    <span
                      key={`custom-${idx}`}
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        isSelected
                          ? "bg-amber-100/70 border-amber-400 text-amber-950 font-medium"
                          : "bg-amber-50/50 hover:bg-amber-100/50 border-amber-200 text-amber-900"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setAllergenInfo(allergenInfo.filter((item) => item !== preset));
                          } else {
                            setAllergenInfo([...allergenInfo, preset]);
                          }
                        }}
                        className="flex items-center gap-1.5 text-left"
                      >
                        <span>⭐ {preset}</span>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-amber-600 shrink-0" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomPreset(preset, e)}
                        className="text-amber-500 hover:text-rose-600 ml-1 p-0.5 rounded"
                        title="Delete custom preset"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 6. AVAILABILITY & FEATURED TOGGLES */}
        <div className="rounded-3xl border border-spoon-border bg-white p-6 shadow-warm-sm flex flex-wrap items-center justify-between gap-6">
          <label className="flex items-center gap-2.5 text-xs font-semibold text-spoon-dark cursor-pointer select-none">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
              className="h-4 w-4 rounded border-spoon-border text-spoon-caramel focus:ring-spoon-caramel"
            />
            <span>Available for Live Ordering</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs font-semibold text-spoon-dark cursor-pointer select-none">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="h-4 w-4 rounded border-spoon-border text-spoon-caramel focus:ring-spoon-caramel"
            />
            <span>Mark as Chef&apos;s Featured Recommendation</span>
          </label>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link href="/admin/products">
            <Button type="button" variant="outline" size="sm">
              Cancel
            </Button>
          </Link>

          <Button
            type="submit"
            disabled={submitting}
            size="sm"
            className="gap-2 font-bold uppercase tracking-wider text-xs px-8 h-11"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Publishing to Catalog...</span>
              </>
            ) : (
              <span>Save & Publish Product</span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
