"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useAdmin } from "@/lib/admin/AdminContext";
import {
  getAdminCategories,
  reorderAdminCategories,
} from "@/lib/admin/admin-service";
import {
  createCategoryServerAction,
  updateCategoryServerAction,
  deleteCategoryServerAction,
} from "./actions";
import Link from "next/link";
import { uploadCategoryImage } from "@/lib/supabase/storage";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  Check,
  X,
  AlertTriangle,
  Upload,
  ImageIcon,
  CalendarClock,
} from "lucide-react";

interface CategoryWithCount extends Category {
  productCount: number;
}

export default function AdminCategoriesPage() {
  const { restaurant } = useAdmin();

  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Category State
  const [newCatName, setNewCatName] = useState("");
  const [newCatImageFile, setNewCatImageFile] = useState<File | null>(null);
  const [newCatImagePreview, setNewCatImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingImageFile, setEditingImageFile] = useState<File | null>(null);
  const [editingImagePreview, setEditingImagePreview] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Deletion Modal State
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reordering State
  const [reordering, setReordering] = useState(false);

  // Helper to safely resolve restaurant ID from context or DB fallback
  const getActiveRestaurantId = useCallback(async (): Promise<string> => {
    if (restaurant?.id) return restaurant.id;

    const supabase = createClient();
    const { data: defaultRest } = await supabase
      .from("restaurants")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (defaultRest?.id) return defaultRest.id;
    throw new Error("Restaurant record not found in database. Please run database setup.");
  }, [restaurant?.id]);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const restId = await getActiveRestaurantId();
      const supabase = createClient();

      const [cats, productsRes] = await Promise.all([
        getAdminCategories(restId),
        supabase
          .from("products")
          .select("category_id")
          .eq("restaurant_id", restId),
      ]);

      const counts: Record<string, number> = {};
      productsRes.data?.forEach((p) => {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1;
        }
      });

      const enriched: CategoryWithCount[] = cats.map((c) => ({
        ...c,
        productCount: counts[c.id] || 0,
      }));

      setCategories(enriched);
    } catch (err: unknown) {
      console.error("Error fetching categories:", err);
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to load categories"
      );
    } finally {
      setLoading(false);
    }
  }, [getActiveRestaurantId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Image File selection handlers
  const handleNewImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewCatImageFile(file);
      setNewCatImagePreview(URL.createObjectURL(file));
    }
  };

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditingImageFile(file);
      setEditingImagePreview(URL.createObjectURL(file));
    }
  };

  // Create Category
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setErrorMsg("Please type a category name into the input box.");
      return;
    }

    try {
      setCreating(true);
      setErrorMsg(null);
      const categoryName = newCatName.trim();
      let restId = restaurant?.id;
      if (!restId) {
        try {
          restId = await getActiveRestaurantId();
        } catch {
          // ignore
        }
      }

      let uploadedUrl: string | null = null;
      if (newCatImageFile && restId) {
        const uploadRes = await uploadCategoryImage(restId, newCatImageFile);
        if (uploadRes.url) {
          uploadedUrl = uploadRes.url;
        }
      }

      const res = await createCategoryServerAction(restId, categoryName, uploadedUrl);
      if (!res.success) {
        throw new Error(res.error || "Failed to create category");
      }

      setNewCatName("");
      setNewCatImageFile(null);
      setNewCatImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      setSuccessMsg(`Category "${categoryName}" created successfully!`);
      setTimeout(() => setSuccessMsg(null), 3500);
      await fetchCategories();
    } catch (err: unknown) {
      console.error("Create category error:", err);
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to create category"
      );
    } finally {
      setCreating(false);
    }
  };

  // Quick Add Suggestion
  const handleQuickAdd = async (name: string) => {
    try {
      setCreating(true);
      setErrorMsg(null);
      let restId = restaurant?.id;
      if (!restId) {
        try {
          restId = await getActiveRestaurantId();
        } catch {
          // ignore
        }
      }

      const res = await createCategoryServerAction(restId, name);
      if (!res.success) {
        throw new Error(res.error || "Failed to create category");
      }

      setSuccessMsg(`Category "${name}" created!`);
      setTimeout(() => setSuccessMsg(null), 3500);
      await fetchCategories();
    } catch (err: unknown) {
      console.error("Quick add category error:", err);
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to create category"
      );
    } finally {
      setCreating(false);
    }
  };

  // Start Inline Edit
  const startEdit = (cat: CategoryWithCount) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setEditingImageFile(null);
    setEditingImagePreview(cat.image_url || null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingImageFile(null);
    setEditingImagePreview(null);
  };

  // Save Inline Edit
  const saveEdit = async (cat: CategoryWithCount) => {
    if (!editingName.trim()) {
      setErrorMsg("Category name cannot be empty.");
      return;
    }

    try {
      setSavingEdit(true);
      setErrorMsg(null);
      let restId = restaurant?.id;
      if (!restId) {
        try {
          restId = await getActiveRestaurantId();
        } catch {
          // ignore
        }
      }

      let uploadedUrl: string | undefined | null = cat.image_url;
      if (editingImageFile && restId) {
        const uploadRes = await uploadCategoryImage(restId, editingImageFile);
        if (uploadRes.url) {
          uploadedUrl = uploadRes.url;
        }
      }

      const res = await updateCategoryServerAction(cat.id, editingName.trim(), uploadedUrl);
      if (!res.success) {
        throw new Error(res.error || "Failed to update category");
      }

      setEditingId(null);
      setEditingImageFile(null);
      setEditingImagePreview(null);
      setSuccessMsg("Category updated successfully!");
      setTimeout(() => setSuccessMsg(null), 3500);
      await fetchCategories();
    } catch (err: unknown) {
      console.error("Rename error:", err);
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to update category"
      );
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Category
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      setErrorMsg(null);
      const res = await deleteCategoryServerAction(deleteTarget.id);
      if (!res.success) {
        throw new Error(res.error || "Failed to delete category");
      }

      setDeleteTarget(null);
      setSuccessMsg("Category deleted successfully!");
      setTimeout(() => setSuccessMsg(null), 3500);
      await fetchCategories();
    } catch (err: unknown) {
      console.error("Delete error:", err);
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to delete category"
      );
    } finally {
      setDeleting(false);
    }
  };

  // Reorder Category Up or Down
  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const updated = [...categories];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const payload = updated.map((item, idx) => ({
      id: item.id,
      sort_order: idx + 1,
    }));

    try {
      setReordering(true);
      setCategories(
        updated.map((c, idx) => ({ ...c, sort_order: idx + 1 }))
      );
      await reorderAdminCategories(payload);
    } catch (err: unknown) {
      console.error("Reorder failed:", err);
      setErrorMsg("Failed to update sort order");
      await fetchCategories();
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-spoon-border/60">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-spoon-dark">
            Category Management
          </h1>
          <p className="text-xs text-spoon-muted mt-0.5">
            Organize menu categories, cover photos, hierarchy, and customer ordering tabs.
          </p>
        </div>
      </div>

      {/* Add Category Form Box */}
      <form
        onSubmit={handleCreate}
        className="rounded-3xl border border-spoon-border bg-white p-5 sm:p-6 shadow-warm-sm space-y-4"
      >
        <h2 className="font-serif font-bold text-base text-spoon-dark flex items-center gap-2">
          <Plus className="h-4 w-4 text-spoon-caramel" />
          <span>Add New Category</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          {/* Cover Photo Upload Button & Preview */}
          <div className="sm:col-span-4 flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleNewImageSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-2xl border-2 border-dashed border-spoon-border bg-spoon-sand/40 hover:bg-spoon-sand/80 flex flex-col items-center justify-center text-spoon-muted hover:text-spoon-dark transition-colors overflow-hidden group cursor-pointer"
              title="Upload Category Cover Photo"
            >
              {newCatImagePreview ? (
                <Image
                  src={newCatImagePreview}
                  alt="Cover Preview"
                  fill
                  className="object-cover"
                />
              ) : (
                <>
                  <ImageIcon className="h-5 w-5 text-spoon-caramel mb-0.5" />
                  <span className="text-[9px] font-semibold">Photo</span>
                </>
              )}
            </button>
            <div className="text-xs">
              <span className="font-semibold text-spoon-dark block">
                Cover Photo
              </span>
              <span className="text-[11px] text-spoon-muted">
                {newCatImageFile ? newCatImageFile.name : "Optional category banner"}
              </span>
            </div>
          </div>

          {/* Category Name Input */}
          <div className="sm:col-span-5">
            <Input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Enter category name (e.g. Starters, Cakes)..."
              disabled={creating}
              className="h-11 text-xs sm:text-sm bg-white border-spoon-border focus:border-spoon-caramel"
            />
          </div>

          {/* Add Category Submit Button */}
          <div className="sm:col-span-3">
            <Button
              type="submit"
              disabled={creating}
              className="w-full gap-2 font-bold uppercase tracking-wider text-xs h-11 px-4 shadow-warm-xs cursor-pointer"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Add Category</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

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

      {/* Categories List */}
      <div className="rounded-3xl border border-spoon-border bg-white shadow-warm-sm overflow-hidden">
        {loading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-spoon-caramel" />
            <span className="text-xs font-semibold text-spoon-muted">
              Loading menu categories...
            </span>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-spoon-sand text-spoon-caramel mb-4 border border-spoon-border shadow-2xs">
              <FolderOpen className="h-8 w-8" />
            </div>
            <h3 className="font-serif text-xl font-bold text-spoon-dark">
              No categories configured yet
            </h3>
            <p className="text-xs sm:text-sm text-spoon-muted max-w-md mt-1 mb-6 leading-relaxed">
              Create your menu categories above, or click any quick suggestion below to add it immediately.
            </p>

            {/* 1-Click Suggestions */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-spoon-muted uppercase tracking-widest block">
                Quick 1-Click Bakery Suggestions
              </span>
              <div className="flex flex-wrap justify-center items-center gap-2 max-w-lg">
                {[
                  "Popular",
                  "Tea Cake",
                  "Muffins",
                  "Sourdough",
                  "Spreads",
                  "Sugar Free",
                  "Cake Jars",
                  "Gift Boxes",
                ].map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleQuickAdd(name)}
                    disabled={creating}
                    className="inline-flex items-center gap-1.5 rounded-full border border-spoon-border bg-spoon-sand/50 hover:bg-spoon-caramel hover:text-white hover:border-spoon-caramel px-3.5 py-1.5 text-xs font-semibold text-spoon-dark transition-all shadow-2xs hover:shadow-warm-xs active:scale-95 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-spoon-border/60">
            {categories.map((cat, index) => {
              const isEditing = editingId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-spoon-sand/20 transition-colors group"
                >
                  {/* Left: Reorder arrows & Category details */}
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 mr-4 min-w-0">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0 || reordering}
                        className="p-1 rounded text-spoon-muted hover:text-spoon-dark hover:bg-spoon-sand disabled:opacity-25 transition-colors cursor-pointer"
                        title="Move Up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, "down")}
                        disabled={index === categories.length - 1 || reordering}
                        className="p-1 rounded text-spoon-muted hover:text-spoon-dark hover:bg-spoon-sand disabled:opacity-25 transition-colors cursor-pointer"
                        title="Move Down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Category Cover Image Thumbnail */}
                    <div className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-spoon-sand/50 border border-spoon-border/80 flex items-center justify-center">
                      {isEditing && editingImagePreview ? (
                        <Image
                          src={editingImagePreview}
                          alt={cat.name}
                          fill
                          className="object-cover"
                        />
                      ) : cat.image_url ? (
                        <Image
                          src={cat.image_url}
                          alt={cat.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <FolderOpen className="h-5 w-5 text-spoon-muted" />
                      )}
                    </div>

                    {/* Content or Edit Form */}
                    {isEditing ? (
                      <div className="flex flex-wrap items-center gap-2 flex-1 max-w-lg">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(cat);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          autoFocus
                          disabled={savingEdit}
                          className="h-9 text-xs font-semibold w-40 sm:w-56"
                        />

                        {/* Edit Cover Image Button */}
                        <input
                          type="file"
                          ref={editFileInputRef}
                          accept="image/*"
                          onChange={handleEditImageSelect}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => editFileInputRef.current?.click()}
                          className="inline-flex items-center gap-1 h-9 px-2.5 rounded-lg border border-spoon-border bg-spoon-sand/40 hover:bg-spoon-sand text-[11px] font-semibold text-spoon-dark transition-colors cursor-pointer"
                          title="Change Cover Photo"
                        >
                          <Upload className="h-3.5 w-3.5 text-spoon-caramel" />
                          <span>Photo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => saveEdit(cat)}
                          disabled={savingEdit}
                          className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                          title="Save"
                        >
                          {savingEdit ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={savingEdit}
                          className="p-2 rounded-lg border border-spoon-border bg-white text-spoon-muted hover:text-spoon-dark transition-colors cursor-pointer"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif font-bold text-sm sm:text-base text-spoon-dark truncate">
                            {cat.name}
                          </h3>
                          <span className="text-[10px] font-mono text-spoon-muted/80 bg-spoon-sand px-1.5 py-0.5 rounded shrink-0">
                            #{cat.sort_order}
                          </span>
                        </div>
                        <span className="text-[11px] text-spoon-muted block">
                          {cat.productCount} {cat.productCount === 1 ? "menu item" : "menu items"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        href={`/admin/delivery?category=${cat.id}`}
                        className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-spoon-caramel bg-spoon-sand/60 hover:bg-spoon-sand border border-spoon-border/80 transition-colors"
                        title={`Manage Delivery Slots for "${cat.name}"`}
                      >
                        <CalendarClock className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Delivery Slots</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => startEdit(cat)}
                        className="rounded-xl p-2 text-spoon-muted hover:text-spoon-dark hover:bg-spoon-sand transition-colors cursor-pointer"
                        title="Edit Category & Cover Photo"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(cat)}
                        className="rounded-xl p-2 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-spoon-border bg-white p-6 shadow-warm-lg space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-spoon-dark">
                Delete &ldquo;{deleteTarget.name}&rdquo;?
              </h3>
            </div>

            <p className="text-xs text-spoon-muted leading-relaxed">
              Are you sure you want to delete this category?{" "}
              {deleteTarget.productCount > 0 ? (
                <span className="text-rose-700 font-semibold block mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                  Warning: There are {deleteTarget.productCount} active menu items assigned to this category. Their category will be unassigned.
                </span>
              ) : (
                <span>No menu items are currently assigned to this category.</span>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Category</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
