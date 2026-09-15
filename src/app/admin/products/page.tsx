"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAdmin } from "@/lib/admin/AdminContext";
import {
  getAdminProducts,
  getAdminCategories,
  deleteAdminProduct,
  toggleAdminProductAvailability,
} from "@/lib/admin/admin-service";
import type { Product, Category } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Utensils,
  AlertTriangle,
  Star,
  CheckCircle2,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function AdminProductsPage() {
  const { restaurant } = useAdmin();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [deleteModalProduct, setDeleteModalProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = async (restId: string) => {
    try {
      setLoading(true);
      const [prods, cats] = await Promise.all([
        getAdminProducts(restId, selectedCategory, searchQuery),
        getAdminCategories(restId),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err: unknown) {
      console.error("Failed to load products:", err);
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load products",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurant?.id) {
      loadData(restaurant.id);
    } else {
      setLoading(false);
    }
  }, [restaurant?.id, selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (restaurant?.id) {
      loadData(restaurant.id);
    }
  };

  const handleToggleAvailability = async (product: Product) => {
    try {
      const newStatus = !product.available;
      // Optimistic update
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, available: newStatus } : p))
      );

      await toggleAdminProductAvailability(product.id, product.available);
      setFeedback({
        type: "success",
        message: `Updated availability for "${product.name}"`,
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error("Toggle error:", err);
      // Revert on failure
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, available: product.available } : p))
      );
      setFeedback({
        type: "error",
        message: "Failed to update availability status",
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalProduct) return;
    try {
      setIsDeleting(true);
      await deleteAdminProduct(deleteModalProduct.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteModalProduct.id));
      setFeedback({
        type: "success",
        message: `Deleted "${deleteModalProduct.name}" successfully`,
      });
      setDeleteModalProduct(null);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error("Delete error:", err);
      setFeedback({
        type: "error",
        message: "Failed to delete product",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-spoon-border/60">
        <div>
          <h1 className="font-serif text-3xl font-bold text-spoon-dark">
            Product Management
          </h1>
          <p className="text-xs text-spoon-muted mt-1">
            Create, update pricing, upload photography, or toggle availability.
          </p>
        </div>

        <Link href="/admin/products/new">
          <Button size="sm" className="gap-1.5 font-bold text-xs uppercase tracking-wider">
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </Button>
        </Link>
      </div>

      {/* Notifications */}
      {feedback && (
        <div
          className={`flex items-center gap-2.5 rounded-2xl p-4 text-xs font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-spoon-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dishes by title..."
            className="w-full rounded-2xl border border-spoon-border bg-white pl-10 pr-4 py-2 text-xs text-spoon-dark placeholder:text-spoon-muted focus:outline-none focus:ring-2 focus:ring-spoon-caramel/20"
          />
        </form>

        {/* Category dropdown */}
        <div className="w-full sm:w-56 shrink-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-2xl border border-spoon-border bg-white px-3.5 py-2 text-xs font-semibold text-spoon-dark focus:outline-none focus:ring-2 focus:ring-spoon-caramel/20"
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-3xl border border-spoon-border bg-white shadow-warm-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-spoon-caramel" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-spoon-sand text-spoon-caramel">
              <Utensils className="h-7 w-7" />
            </div>
            <h3 className="font-serif text-lg font-bold text-spoon-dark">
              No products found
            </h3>
            <p className="mt-1 text-xs text-spoon-muted max-w-sm mx-auto">
              {searchQuery
                ? `No dishes matched "${searchQuery}". Try changing your search query.`
                : "No dishes added yet in this category. Click 'Add New Product' to create your first dish."}
            </p>
            <div className="mt-6">
              <Link href="/admin/products/new">
                <Button size="sm" className="gap-1.5 font-bold text-xs uppercase tracking-wider">
                  <Plus className="h-4 w-4" />
                  <span>Create First Product</span>
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-spoon-dark">
              <thead className="border-b border-spoon-border bg-spoon-sand/30 font-bold uppercase tracking-wider text-spoon-muted text-[10px]">
                <tr>
                  <th className="px-6 py-4">Item & Photography</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Availability</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-spoon-border/60">
                {products.map((item) => {
                  const categoryName =
                    categories.find((c) => c.id === item.category_id)?.name ||
                    "General";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-spoon-sand/15 transition-colors group"
                    >
                      {/* Product details with image */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-spoon-sand border border-spoon-border/70">
                            {item.image_url ? (
                              <Image
                                src={item.image_url}
                                alt={item.name}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-spoon-muted">
                                <Utensils className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-serif font-bold text-sm text-spoon-dark block group-hover:text-spoon-caramel transition-colors">
                                {item.name}
                              </span>
                              {item.featured && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                                  <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                  <span>Featured</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-spoon-muted line-clamp-1 max-w-sm mt-0.5">
                              {item.description || "No description provided."}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4 font-semibold text-spoon-dark">
                        <span className="rounded-lg bg-spoon-sand/70 px-2.5 py-1 text-[11px] border border-spoon-border/60">
                          {categoryName}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4 font-bold text-sm text-spoon-dark">
                        {formatPrice(item.price)}
                      </td>

                      {/* Availability toggle switch */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            item.available
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                          }`}
                          title="Click to toggle availability"
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              item.available ? "bg-emerald-600" : "bg-rose-600"
                            }`}
                          />
                          <span>{item.available ? "Available" : "Sold Out"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link href={`/admin/products/${item.id}`}>
                            <button
                              className="rounded-lg p-2 text-spoon-muted hover:text-spoon-dark hover:bg-spoon-sand transition-colors"
                              title="Edit product"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </Link>

                          <button
                            onClick={() => setDeleteModalProduct(item)}
                            className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal Before Deletion */}
      {deleteModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-spoon-border bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-spoon-dark">
                Delete Menu Product?
              </h3>
            </div>

            <p className="text-xs text-spoon-muted leading-relaxed">
              Are you sure you want to delete{" "}
              <strong className="text-spoon-dark font-semibold">
                &ldquo;{deleteModalProduct.name}&rdquo;
              </strong>
              ? This action cannot be undone and will permanently remove this item from the live restaurant menu.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-spoon-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalProduct(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold transition-all"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
