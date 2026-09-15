"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/lib/admin/AdminContext";
import {
  getAdminCategories,
  createAdminProduct,
} from "@/lib/admin/admin-service";
import { validateImageFile } from "@/lib/supabase/storage";
import type { Category } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
} from "lucide-react";

export default function AdminNewProductPage() {
  const { restaurant } = useAdmin();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [available, setAvailable] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState("0");

  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant?.id) {
      getAdminCategories(restaurant.id)
        .then((cats) => {
          setCategories(cats);
          if (cats.length > 0) {
            setCategoryId(cats[0].id);
          }
        })
        .catch((err) => console.error("Error loading categories:", err))
        .finally(() => setLoadingCategories(false));
    }
  }, [restaurant?.id]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || "Invalid file");
      return;
    }

    setErrorMsg(null);
    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
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

      await createAdminProduct(
        restaurant.id,
        {
          name: name.trim(),
          description: description.trim(),
          price: parsedPrice,
          category_id: categoryId,
          available,
          featured,
          sort_order: parseInt(sortOrder, 10) || 0,
        },
        imageFile
      );

      setSuccessMsg("Product created successfully! Redirecting...");
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
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-spoon-border/60">
        <Link
          href="/admin/products"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-spoon-sand text-spoon-dark hover:bg-spoon-border transition-colors shadow-2xs"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-spoon-dark">
            Add New Menu Product
          </h1>
          <p className="text-xs text-spoon-muted">
            Upload photography and set pricing for your culinary catalog.
          </p>
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

      {/* Form Card */}
      <div className="rounded-3xl border border-spoon-border bg-white p-6 sm:p-8 shadow-warm-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Image Upload Area with Preview */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-2">
              Food Photography
            </label>

            {imagePreview ? (
              <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-spoon-border bg-spoon-sand/30">
                <Image
                  src={imagePreview}
                  alt="Product preview"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black transition-colors shadow-md"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-spoon-border p-8 text-center bg-spoon-cream hover:bg-spoon-sand/40 transition-colors cursor-pointer group">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-spoon-border text-spoon-caramel mb-3 group-hover:scale-105 transition-transform shadow-xs">
                  <ImagePlus className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-spoon-dark">
                  Click or drag photo here to upload
                </p>
                <p className="text-[11px] text-spoon-muted mt-1">
                  JPG, PNG, or WebP up to 5MB. Uploads directly to Supabase Storage.
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Name & Price */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                Product Title *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Royal Chicken Dum Biryani"
                required
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                Price (₹) *
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="349"
                required
                className="text-xs font-semibold"
              />
            </div>
          </div>

          {/* Category & Sort Order */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-2xl border border-spoon-border bg-white px-4 py-2.5 text-xs font-semibold text-spoon-dark focus:outline-none focus:ring-2 focus:ring-spoon-caramel/20"
              >
                {loadingCategories ? (
                  <option>Loading categories...</option>
                ) : categories.length === 0 ? (
                  <option value="">No categories yet</option>
                ) : (
                  categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                Menu Display Order
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

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
              Culinary Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Fragrant basmati rice with tender chicken, brown onions, and aromatic saffron..."
              className="w-full rounded-2xl border border-spoon-border bg-white p-4 text-xs text-spoon-dark placeholder:text-spoon-muted focus:outline-none focus:ring-2 focus:ring-spoon-caramel/20"
            />
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap items-center gap-6 pt-2">
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
              <span>Mark as Chef&apos;s Featured Dish</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-spoon-border/60">
            <Link href="/admin/products">
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              disabled={submitting}
              size="sm"
              className="gap-2 font-bold uppercase tracking-wider text-xs px-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Product...</span>
                </>
              ) : (
                <span>Save to Menu</span>
              )}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
