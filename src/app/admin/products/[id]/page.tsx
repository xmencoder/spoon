"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useAdmin } from "@/lib/admin/AdminContext";
import {
  getAdminCategories,
  createAdminCategory,
  getAdminProductById,
  updateAdminProduct,
  deleteAdminProduct,
  resetProductOrderCount,
} from "@/lib/admin/admin-service";
import { validateImageFile, uploadProductImage } from "@/lib/supabase/storage";
import type {
  Category,
  Product,
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
  Trash2,
  Sparkles,
  Layers,
  ShoppingBag,
  ShieldAlert,
  Plus,
  Star,
  Images,
  RotateCcw,
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

const DEFAULT_STORAGE_PRESETS = [
  "Room Temperature: 3–4 days in airtight container",
  "Refrigerate in airtight container up to 7 days",
  "Microwave 10–15s for warm oven-fresh gooey core",
  "Best served warm with vanilla ice cream",
  "Keep away from direct sunlight & humidity",
  "Do not refrigerate; consume within 48 hours",
];

interface GalleryItem {
  id: string;
  previewUrl: string;
  file?: File;
}

export default function AdminEditProductPage() {
  const params = useParams();
  const productId = params?.id as string;

  const { restaurant } = useAdmin();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State - Basic
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [storyText, setStoryText] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [badge, setBadge] = useState<string>("NONE");
  const [badgeSecondary, setBadgeSecondary] = useState<string>("NONE");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isVeg, setIsVeg] = useState(true);
  const [available, setAvailable] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState("0");
  const [orderLimit, setOrderLimit] = useState("");
  const [totalOrdered, setTotalOrdered] = useState(0);
  const [resettingCount, setResettingCount] = useState(false);

  // Category quick creation state
  const [newCatInput, setNewCatInput] = useState("");
  const [showAddCat, setShowAddCat] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Multi-Image Gallery State
  const [galleryList, setGalleryList] = useState<GalleryItem[]>([]);
  const [urlInput, setUrlInput] = useState("");

  // Sizes & Variants
  const [sizes, setSizes] = useState<ProductSizeOption[]>([]);

  // Add-ons
  const [addons, setAddons] = useState<ProductAddonOption[]>([]);

  // Allergen Info & Presets
  const [allergenInfo, setAllergenInfo] = useState<string[]>([]);
  const [allergenInput, setAllergenInput] = useState("");
  const [customPresets, setCustomPresets] = useState<string[]>([]);

  // Storage & Care Presets
  const [storageCare, setStorageCare] = useState<string[]>([]);
  const [storageInput, setStorageInput] = useState("");
  const [customStoragePresets, setCustomStoragePresets] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("spoon_allergen_presets");
      if (saved) {
        setCustomPresets(JSON.parse(saved));
      }
      const savedStorage = localStorage.getItem("spoon_storage_presets");
      if (savedStorage) {
        setCustomStoragePresets(JSON.parse(savedStorage));
      }
    } catch (e) {
      console.error("Failed to load presets", e);
    }
  }, []);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!productId) return;
      try {
        setLoading(true);
        setErrorMsg(null);

        // Fetch product
        const prod = await getAdminProductById(productId);
        if (!prod) {
          setErrorMsg("Product not found");
          return;
        }

        setName(prod.name);
        setDescription(prod.description || "");
        setStoryText(prod.story_text || "");
        setPrice(prod.price.toString());
        const badges = (prod.badge || "")
          .split(",")
          .map((b: string) => b.trim())
          .filter((b: string) => b && b !== "NONE");
        setBadge(badges[0] || "NONE");
        setBadgeSecondary(badges[1] || "NONE");
        setTags(prod.tags || ["100% Eggless", "Artisan Classic"]);
        setIsVeg(prod.is_veg ?? true);
        setAvailable(prod.available);
        setFeatured(prod.featured);
        setSortOrder(prod.sort_order?.toString() || "0");
        setOrderLimit(prod.order_limit != null ? prod.order_limit.toString() : "");
        setTotalOrdered(prod.total_ordered || 0);

        // Load gallery images
        const existingImages: string[] = [];
        if (prod.gallery_images && prod.gallery_images.length > 0) {
          existingImages.push(...prod.gallery_images);
        } else if (prod.image_url) {
          existingImages.push(prod.image_url);
        }

        setGalleryList(
          existingImages.map((url, i) => ({
            id: `existing-${i}-${Math.random().toString(36).substring(2, 6)}`,
            previewUrl: url,
          }))
        );

        // Sizes & Add-ons
        setSizes(prod.sizes || [{ id: "size-350g", label: "350 gms", isDefault: true }]);
        setAddons(Array.isArray(prod.addons) ? prod.addons : []);
        setAllergenInfo(prod.allergen_info || ["Contains Wheat (Gluten), Dairy (Butter & Milk)"]);
        setStorageCare(prod.storage_care || ["Room Temperature: 3–4 days in airtight container"]);

        // Fetch categories
        if (restaurant?.id) {
          const cats = await getAdminCategories(restaurant.id);
          setCategories(cats);
        }
      } catch (err: unknown) {
        console.error("Error loading product:", err);
        setErrorMsg(err instanceof Error ? err.message : "Failed to load product");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [productId, restaurant?.id]);

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

  // Reset Total Ordered Counter
  const handleResetOrderCount = async () => {
    if (!productId) return;
    try {
      setResettingCount(true);
      await resetProductOrderCount(productId);
      setTotalOrdered(0);
      setSuccessMsg("Order count reset to 0! Product restocked.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      console.error("Failed to reset count:", err);
      setErrorMsg("Failed to reset count");
    } finally {
      setResettingCount(false);
    }
  };

  // Multiple File Selection
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

  // Add Direct URL
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

  // Set Cover Photo
  const handleSetCover = (index: number) => {
    if (index === 0) return;
    setGalleryList((prev) => {
      const updated = [...prev];
      const [chosen] = updated.splice(index, 1);
      return [chosen, ...updated];
    });
  };

  // Remove single image
  const handleRemoveImage = (index: number) => {
    setGalleryList((prev) => {
      const target = prev[index];
      if (target?.file) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Presets
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

  // Allergen Info & Presets
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

  // Add Tag
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  // Add Storage Info
  const handleAddStorage = () => {
    if (storageInput.trim() && !storageCare.includes(storageInput.trim())) {
      setStorageCare([...storageCare, storageInput.trim()]);
      setStorageInput("");
    }
  };

  const handleSaveStoragePreset = (textToSave?: string) => {
    const lineToSave = (
      textToSave ||
      storageInput ||
      (storageCare.length > 0 ? storageCare[storageCare.length - 1] : "")
    ).trim();
    if (!lineToSave) return;
    if (
      !customStoragePresets.includes(lineToSave) &&
      !DEFAULT_STORAGE_PRESETS.includes(lineToSave)
    ) {
      const updated = [...customStoragePresets, lineToSave];
      setCustomStoragePresets(updated);
      try {
        localStorage.setItem("spoon_storage_presets", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save storage preset", e);
      }
    }
    if (storageInput.trim() && !storageCare.includes(storageInput.trim())) {
      setStorageCare([...storageCare, storageInput.trim()]);
      setStorageInput("");
    }
  };

  const handleDeleteCustomStoragePreset = (
    presetToDelete: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const updated = customStoragePresets.filter((p) => p !== presetToDelete);
    setCustomStoragePresets(updated);
    try {
      localStorage.setItem("spoon_storage_presets", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to delete storage preset", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) {
      setErrorMsg("Restaurant not found. Please refresh the page.");
      return;
    }

    if (!name.trim()) {
      setErrorMsg("Product name is required.");
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMsg("Please enter a valid non-negative price.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      // Upload any new local files
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

      const finalBadge =
        [badge, badgeSecondary].filter((b) => b && b !== "NONE").join(",") ||
        null;

      const updateData: Partial<Product> = {
        name: name.trim(),
        description: description.trim() || null,
        story_text: storyText.trim() || null,
        price: parsedPrice,
        category_id: categoryId || null,
        badge: finalBadge,
        order_limit: orderLimit.trim() ? parseInt(orderLimit, 10) : null,
        total_ordered: totalOrdered,
        is_veg: isVeg,
        available,
        featured,
        sort_order: parseInt(sortOrder, 10) || 0,
        sizes,
        addons,
        tags,
        allergen_info: allergenInfo,
        storage_care: storageCare,
        image_url: coverImageUrl,
        gallery_images: finalImageUrls,
      };

      await updateAdminProduct(productId, restaurant.id, updateData);

      setSuccessMsg("Product updated successfully! Redirecting...");
      setTimeout(() => {
        router.push("/admin/products");
      }, 900);
    } catch (err: unknown) {
      console.error("Update product failed:", err);
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to update product"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setErrorMsg(null);
      await deleteAdminProduct(productId);
      setShowDeleteModal(false);
      router.push("/admin/products");
    } catch (err: unknown) {
      console.error("Delete failed:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete product");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-spoon-caramel" />
        <span className="text-xs font-semibold text-spoon-muted">
          Loading product details...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-spoon-border/60">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-spoon-sand text-spoon-dark hover:bg-spoon-border transition-colors shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-spoon-dark">
              Edit Bakery Product
            </h1>
            <p className="text-xs text-spoon-muted">
              Modify dish title, multiple photography gallery, pricing, pack sizes, and add-ons.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete Product</span>
        </button>
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
        {/* 1. BASIC INFO */}
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
              <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-2xl border border-spoon-border bg-white px-3.5 py-2.5 text-xs font-semibold text-spoon-dark focus:outline-none focus:ring-2 focus:ring-spoon-caramel/20"
              >
                <option value="">Uncategorized</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                  Primary Ribbon Badge
                </label>
                <select
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  className="w-full rounded-2xl border border-spoon-border bg-white px-3.5 py-2.5 text-xs font-semibold text-spoon-dark focus:outline-none focus:ring-2 focus:ring-spoon-caramel/20"
                >
                  <option value="NONE">No Primary Badge</option>
                  <option value="POPULAR">POPULAR (Red)</option>
                  <option value="BESTSELLER">BESTSELLER (Maroon)</option>
                  <option value="NEW!">NEW! (Terracotta)</option>
                  <option value="CHEF'S PICK">CHEF&apos;S PICK (Gold)</option>
                  <option value="SUGAR FREE">SUGAR FREE (Teal)</option>
                  <option value="GLUTEN FREE">GLUTEN FREE (Emerald)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                  Secondary Ribbon Badge (Optional)
                </label>
                <select
                  value={badgeSecondary}
                  onChange={(e) => setBadgeSecondary(e.target.value)}
                  className="w-full rounded-2xl border border-spoon-border bg-white px-3.5 py-2.5 text-xs font-semibold text-spoon-dark focus:outline-none focus:ring-2 focus:ring-spoon-caramel/20"
                >
                  <option value="NONE">No Secondary Badge</option>
                  <option value="POPULAR">POPULAR (Red)</option>
                  <option value="BESTSELLER">BESTSELLER (Maroon)</option>
                  <option value="NEW!">NEW! (Terracotta)</option>
                  <option value="CHEF'S PICK">CHEF&apos;S PICK (Gold)</option>
                  <option value="SUGAR FREE">SUGAR FREE (Teal)</option>
                  <option value="GLUTEN FREE">GLUTEN FREE (Emerald)</option>
                </select>
              </div>
            </div>

            {/* Menu Tags */}
            <div className="col-span-full pt-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                Product Tags (e.g. 100% Eggless, Freshly Baked, Artisan Classic)
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Type a tag and press Add..."
                  className="text-xs flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAddTag}
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs gap-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Tag
                </Button>
              </div>

              {/* Active Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-spoon-sand text-spoon-dark text-xs font-medium border border-spoon-border shadow-2xs"
                    >
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                        className="text-spoon-muted hover:text-rose-600 transition-colors"
                        title="Remove tag"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Quick Tag Suggestions */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-spoon-muted tracking-wider mr-1">
                  Suggestions:
                </span>
                {[
                  "100% Eggless",
                  "Freshly Baked",
                  "Artisan Classic",
                  "Chef's Choice",
                  "Zero Sugar",
                  "Pure Butter",
                  "Boutique Pack",
                ].map((suggestion, sIdx) => {
                  const isSelected = tags.includes(suggestion);
                  return (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setTags(tags.filter((t) => t !== suggestion));
                        } else {
                          setTags([...tags, suggestion]);
                        }
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                        isSelected
                          ? "bg-spoon-caramel text-white border-spoon-caramel font-semibold"
                          : "bg-spoon-sand/40 text-spoon-dark/70 border-spoon-border hover:bg-spoon-sand"
                      }`}
                    >
                      {suggestion} {isSelected ? "✓" : "+"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                Display Sort Order
              </label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="0"
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
              Short Description / Subtitle
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Soft, buttery & loaded with choco chips."
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
                Add multiple images. The <strong>first image</strong> serves as the primary Cover Photo on the menu.
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
                Upload More Images
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
              No photos in gallery. Add photos using the controls above.
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
                Variants customers can choose from (e.g. 350 gms, Pack of 4 / 8 / 12).
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
                    Label
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

        {/* 4. CUSTOM ADD-ONS */}
        <div className="rounded-3xl border border-spoon-border bg-white p-6 sm:p-8 shadow-warm-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-spoon-border/50 pb-3">
            <div>
              <h2 className="font-serif text-lg font-bold text-spoon-dark flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-spoon-caramel" />
                <span>4. Custom Add-on Options</span>
              </h2>
              <p className="text-[11px] text-spoon-muted">
                Extras customers can add to this dish.
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

        {/* 5. ALLERGEN & STORAGE INFORMATION */}
        <div className="rounded-3xl border border-spoon-border bg-white p-6 sm:p-8 shadow-warm-sm space-y-7">
          <div className="border-b border-spoon-border/50 pb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-spoon-dark flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-spoon-caramel" />
              <span>5. Allergen & Storage Information</span>
            </h2>
          </div>

          {/* 5.1 ALLERGEN INFORMATION */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark">
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

            {/* Quick Allergen Presets Section */}
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

          {/* 5.2 STORAGE & CARE INSTRUCTIONS */}
          <div className="pt-5 border-t border-spoon-border/60 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark">
              Storage & Care Instructions
            </label>

            {/* Input + Add + Save Preset Button */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <Input
                value={storageInput}
                onChange={(e) => setStorageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddStorage();
                  }
                }}
                placeholder="e.g. Room Temperature: 3–4 days in airtight container"
                className="text-xs flex-1"
              />
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  onClick={handleAddStorage}
                  variant="default"
                  size="sm"
                  className="bg-spoon-dark hover:bg-spoon-mocha text-white text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSaveStoragePreset()}
                  disabled={!storageInput.trim() && storageCare.length === 0}
                  variant="outline"
                  size="sm"
                  className="text-xs border-spoon-border text-spoon-dark hover:bg-spoon-sand gap-1.5"
                  title="Save current storage instruction as a reusable preset"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-spoon-caramel" />
                  Save as Preset
                </Button>
              </div>
            </div>

            {/* Active Storage Lines */}
            {storageCare.length > 0 ? (
              <ul className="space-y-1.5 mb-4">
                {storageCare.map((info, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-spoon-cream text-xs text-spoon-dark border border-spoon-border/70"
                  >
                    <span className="font-medium">• {info}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setStorageCare(storageCare.filter((_, i) => i !== idx))
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
                No storage instructions added yet. Type above or click a preset below.
              </p>
            )}

            {/* Quick Storage Presets Section */}
            <div className="pt-3 border-t border-spoon-border/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-spoon-muted flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-spoon-caramel" />
                  Quick Storage Presets (Click to toggle)
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {/* Built-in Presets */}
                {DEFAULT_STORAGE_PRESETS.map((preset, idx) => {
                  const isSelected = storageCare.includes(preset);
                  return (
                    <button
                      key={`storage-preset-${idx}`}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setStorageCare(storageCare.filter((item) => item !== preset));
                        } else {
                          setStorageCare([...storageCare, preset]);
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
                {customStoragePresets.map((preset, idx) => {
                  const isSelected = storageCare.includes(preset);
                  return (
                    <span
                      key={`custom-storage-${idx}`}
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
                            setStorageCare(storageCare.filter((item) => item !== preset));
                          } else {
                            setStorageCare([...storageCare, preset]);
                          }
                        }}
                        className="flex items-center gap-1.5 text-left"
                      >
                        <span>⭐ {preset}</span>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-amber-600 shrink-0" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomStoragePreset(preset, e)}
                        className="text-amber-500 hover:text-rose-600 ml-1 p-0.5 rounded"
                        title="Delete custom storage preset"
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
                <span>Saving Updates...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </Button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-spoon-border bg-white p-6 shadow-warm-lg space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-spoon-dark">
                Delete Dish Permanently?
              </h3>
            </div>

            <p className="text-xs text-spoon-muted leading-relaxed">
              Are you sure you want to remove{" "}
              <strong className="text-spoon-dark">&quot;{name}&quot;</strong> from
              your catalog? This action will permanently remove it from the menu and
              cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete Dish</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
