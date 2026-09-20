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
  Cake,
  Layers,
  ShoppingBag,
  Sparkles,
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

  const totalCount = products.length;
  const availableCount = products.filter((p) => p.available).length;
  const featuredCount = products.filter((p) => p.featured).length;

  return (
    <div className="max-w-6xl space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-spoon-border/60">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-spoon-dark">
            Product Management
          </h1>
          <p className="text-xs text-spoon-muted mt-1">
            Manage your artisanal bakery catalog, pricing, variants, add-ons, and stock availability.
          </p>
        </div>

        <Link href="/admin/products/new">
          <Button size="sm" className="gap-1.5 font-bold text-xs uppercase tracking-wider h-10 px-5 shadow-warm-xs">
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </Button>
        </Link>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-spoon-border bg-white p-4 shadow-warm-xs">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-spoon-muted block">
            Total Catalog
          </span>
          <span className="font-serif text-2xl font-bold text-spoon-dark mt-0.5 block">
            {totalCount} Items
          </span>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-warm-xs">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-800 block">
            Available Live
          </span>
          <span className="font-serif text-2xl font-bold text-emerald-900 mt-0.5 block">
            {availableCount} Active
          </span>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-warm-xs">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-800 block">
            Chef&apos;s Featured
          </span>
          <span className="font-serif text-2xl font-bold text-amber-900 mt-0.5 block">
            {featuredCount} Starred
          </span>
        </div>
        <div className="rounded-2xl border border-spoon-border bg-white p-4 shadow-warm-xs">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-spoon-muted block">
            Categories
          </span>
          <span className="font-serif text-2xl font-bold text-spoon-dark mt-0.5 block">
            {categories.length} Sections
          </span>
        </div>
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
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-spoon-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by title..."
              className="w-full rounded-2xl border border-spoon-border bg-white pl-10 pr-4 py-2.5 text-xs text-spoon-dark placeholder:text-spoon-muted focus:outline-none focus:ring-2 focus:ring-spoon-caramel/20"
            />
          </form>

          {/* Category selector */}
          <div className="w-full sm:w-60 shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-2xl border border-spoon-border bg-white px-3.5 py-2.5 text-xs font-semibold text-spoon-dark focus:outline-none focus:ring-2 focus:ring-spoon-caramel/20"
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

        {/* Category Pills Slider */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-spoon-dark text-white shadow-xs"
                : "bg-white text-spoon-dark border border-spoon-border hover:bg-spoon-sand/50"
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-spoon-caramel text-white shadow-xs"
                  : "bg-white text-spoon-dark border border-spoon-border hover:bg-spoon-sand/50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-3xl border border-spoon-border bg-white shadow-warm-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-spoon-caramel" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-spoon-sand text-spoon-caramel">
              <Cake className="h-7 w-7" />
            </div>
            <h3 className="font-serif text-lg font-bold text-spoon-dark">
              No products found
            </h3>
            <p className="mt-1 text-xs text-spoon-muted max-w-sm mx-auto">
              {searchQuery
                ? `No dishes matched "${searchQuery}". Try a different keyword.`
                : "No products added in this category yet. Click below to create one or run the seed script."}
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
                  <th className="px-6 py-4">Base Price</th>
                  <th className="px-6 py-4">Variants & Add-ons</th>
                  <th className="px-6 py-4">Availability</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-spoon-border/60">
                {products.map((item) => {
                  const categoryName =
                    categories.find((c) => c.id === item.category_id)?.name ||
                    "General";

                  const sizeCount = item.sizes?.length || 0;
                  const addonCount = item.addons?.length || 0;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-spoon-sand/15 transition-colors group"
                    >
                      {/* Product details with image */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-spoon-sand border border-spoon-border/70 shadow-2xs">
                            {item.image_url ? (
                              <Image
                                src={item.image_url}
                                alt={item.name}
                                fill
                                className="object-cover"
                                sizes="56px"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-spoon-muted">
                                <Cake className="h-6 w-6" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Pure Veg Green Icon */}
                              <div
                                className="w-3.5 h-3.5 border border-[#238234] bg-white flex items-center justify-center p-0.5 rounded-[3px] shrink-0"
                                title={item.is_veg !== false ? "100% Eggless / Veg" : "Contains Egg"}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    item.is_veg !== false ? "bg-[#238234]" : "bg-rose-600"
                                  }`}
                                />
                              </div>

                              <span className="font-serif font-bold text-sm text-spoon-dark block group-hover:text-spoon-caramel transition-colors">
                                {item.name}
                              </span>

                              {item.badge && (
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider text-white shadow-2xs ${
                                    item.badge === "BESTSELLER"
                                      ? "bg-[#8E2822]"
                                      : item.badge === "POPULAR"
                                      ? "bg-[#A33D31]"
                                      : "bg-[#B04336]"
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}

                              {item.featured && (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider">
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

                      {/* Variants & Addons info */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-[11px]">
                          <span className="inline-flex items-center gap-1 text-spoon-dark font-medium">
                            <Layers className="w-3 h-3 text-spoon-caramel" />
                            <span>
                              {sizeCount > 0
                                ? `${sizeCount} Size Options`
                                : "1 Default Size"}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-spoon-muted">
                            <ShoppingBag className="w-3 h-3 text-spoon-muted" />
                            <span>
                              {addonCount > 0
                                ? `${addonCount} Custom Add-ons`
                                : "No Add-ons"}
                            </span>
                          </span>
                        </div>
                      </td>

                      {/* Availability toggle */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            item.available
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                          }`}
                          title="Click to toggle live availability"
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
                              className="rounded-xl p-2 text-spoon-muted hover:text-spoon-dark hover:bg-spoon-sand transition-colors"
                              title="Edit product details"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </Link>

                          <button
                            onClick={() => setDeleteModalProduct(item)}
                            className="rounded-xl p-2 text-rose-600 hover:bg-rose-50 transition-colors"
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

      {/* Confirmation Modal */}
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
