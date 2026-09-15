"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useAdmin } from "@/lib/admin/AdminContext";
import {
  getAdminCategories,
  getAdminProductById,
  updateAdminProduct,
  deleteAdminProduct,
} from "@/lib/admin/admin-service";
import { validateImageFile } from "@/lib/supabase/storage";
import type { Category, Product } from "@/types/database";
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
} from "lucide-react";

export default function AdminEditProductPage() {
  const params = useParams();
  const productId = params?.id as string;

  const { restaurant } = useAdmin();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [available, setAvailable] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState("0");

  // Current and New Image State
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
        setPrice(prod.price.toString());
        setCategoryId(prod.category_id || "");
        setAvailable(prod.available);
        setFeatured(prod.featured);
        setSortOrder(prod.sort_order?.toString() || "0");
        setExistingImageUrl(prod.image_url);

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

  const removeSelectedImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const removeExistingImage = () => {
    setExistingImageUrl(null);
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

      const updateData: Partial<Product> = {
        name: name.trim(),
        description: description.trim() || null,
        price: parsedPrice,
        category_id: categoryId || null,
        available,
        featured,
        sort_order: parseInt(sortOrder, 10) || 0,
      };

      // If existing image was cleared and no new file was uploaded, set image_url to null
      if (!existingImageUrl && !imageFile) {
        updateData.image_url = null;
      }

      await updateAdminProduct(
        productId,
        restaurant.id,
        updateData,
        imageFile
      );

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

  const activeImage = imagePreview || existingImageUrl;

  return (
    <div className="max-w-3xl space-y-6">
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
              Edit Product
            </h1>
            <p className="text-xs text-spoon-muted">
              Modify dish title, pricing, photography, and menu availability.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete Dish</span>
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

      {/* Form Card */}
      <div className="rounded-3xl border border-spoon-border bg-white p-6 sm:p-8 shadow-warm-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Image Upload Area with Preview */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-2">
              Food Photography
            </label>

            {activeImage ? (
              <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-spoon-border bg-spoon-sand/30">
                <Image
                  src={activeImage}
                  alt={name || "Product preview"}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <label
                    htmlFor="change-image-input"
                    className="flex cursor-pointer items-center gap-1.5 rounded-full bg-black/75 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-xs hover:bg-black transition-colors shadow-md"
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    <span>Change</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (imagePreview) {
                        removeSelectedImage();
                      } else {
                        removeExistingImage();
                      }
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/75 text-white hover:bg-black transition-colors shadow-md"
                    title="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <input
                  id="change-image-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
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
                <option value="">Uncategorized</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
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
                placeholder="0"
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
                  <span>Saving Updates...</span>
                </>
              ) : (
                <span>Update Dish</span>
              )}
            </Button>
          </div>

        </form>
      </div>

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
