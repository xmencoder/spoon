"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/lib/admin/AdminContext";
import {
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  reorderAdminCategories,
} from "@/lib/admin/admin-service";
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
  const [creating, setCreating] = useState(false);

  // Inline Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Deletion Modal State
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reordering State
  const [reordering, setReordering] = useState(false);

  const fetchCategories = useCallback(async () => {
    if (!restaurant?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setErrorMsg(null);

      const supabase = createClient();
      const [cats, productsRes] = await Promise.all([
        getAdminCategories(restaurant.id),
        supabase
          .from("products")
          .select("category_id")
          .eq("restaurant_id", restaurant.id),
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
  }, [restaurant?.id]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Create Category
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) return;
    if (!newCatName.trim()) {
      setErrorMsg("Category name cannot be empty.");
      return;
    }

    try {
      setCreating(true);
      setErrorMsg(null);
      await createAdminCategory(restaurant.id, newCatName.trim());
      setNewCatName("");
      setSuccessMsg("Category created successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
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
    if (!restaurant?.id) return;
    try {
      setCreating(true);
      setErrorMsg(null);
      await createAdminCategory(restaurant.id, name);
      setSuccessMsg(`Category "${name}" created!`);
      setTimeout(() => setSuccessMsg(null), 3000);
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
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  // Save Inline Edit
  const saveEdit = async (catId: string) => {
    if (!editingName.trim()) {
      setErrorMsg("Category name cannot be empty.");
      return;
    }

    try {
      setSavingEdit(true);
      setErrorMsg(null);
      await updateAdminCategory(catId, { name: editingName.trim() });
      setEditingId(null);
      setSuccessMsg("Category renamed!");
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchCategories();
    } catch (err: unknown) {
      console.error("Rename error:", err);
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to rename category"
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
      await deleteAdminCategory(deleteTarget.id);
      setDeleteTarget(null);
      setSuccessMsg("Category deleted successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
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

    // Reassign sort orders
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
            Organize the menu structure, hierarchy, and customer ordering tabs.
          </p>
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <Input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Enter category name..."
            disabled={creating}
            className="w-52 sm:w-64 h-10 text-xs sm:text-sm bg-white"
          />
          <Button
            type="submit"
            size="sm"
            disabled={creating || !newCatName.trim()}
            className="gap-1.5 shrink-0 font-bold uppercase tracking-wider text-xs h-10 px-4 shadow-warm-xs"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span>Add Category</span>
          </Button>
        </form>
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

      {/* Categories List */}
      <div className="rounded-3xl border border-spoon-border bg-white shadow-warm-sm overflow-hidden">
        {loading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-spoon-caramel" />
            <span className="text-xs font-semibold text-spoon-muted">
              Loading menu categories...
            </span>
          </div>
        ) : !restaurant?.id ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3 border border-amber-200">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h3 className="font-serif text-lg font-bold text-spoon-dark">
              Database Setup Required
            </h3>
            <p className="text-xs text-spoon-muted max-w-sm mt-1">
              Your Supabase database tables have not been created yet. Please run the SQL schema migration in Supabase to load your restaurant and categories.
            </p>
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
              Create your menu categories below (e.g. Starters, Main Course, Biryani), or click any suggestion to add it immediately.
            </p>

            {/* Direct Category Creation Form Inside Empty State */}
            <form
              onSubmit={handleCreate}
              className="w-full max-w-md flex flex-col sm:flex-row items-center gap-2 mb-6"
            >
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name (e.g. Starters, Biryani)..."
                disabled={creating}
                className="h-11 text-xs sm:text-sm bg-white w-full"
                autoFocus
              />
              <Button
                type="submit"
                disabled={creating || !newCatName.trim()}
                className="gap-2 h-11 px-6 font-bold uppercase tracking-wider text-xs shrink-0 w-full sm:w-auto shadow-warm-xs"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>Create Category</span>
              </Button>
            </form>

            {/* 1-Click Suggestions */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-spoon-muted uppercase tracking-widest block">
                Quick 1-Click Suggestions
              </span>
              <div className="flex flex-wrap justify-center items-center gap-2 max-w-lg">
                {["Starters", "Main Course", "Biryani", "Bakery", "Desserts", "Beverages"].map(
                  (name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleQuickAdd(name)}
                      disabled={creating}
                      className="inline-flex items-center gap-1.5 rounded-full border border-spoon-border bg-spoon-sand/50 hover:bg-spoon-caramel hover:text-white hover:border-spoon-caramel px-3.5 py-1.5 text-xs font-semibold text-spoon-dark transition-all shadow-2xs hover:shadow-warm-xs active:scale-95"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{name}</span>
                    </button>
                  )
                )}
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
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 mr-4">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0 || reordering}
                        className="p-1 rounded text-spoon-muted hover:text-spoon-dark hover:bg-spoon-sand disabled:opacity-25 transition-colors"
                        title="Move Up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, "down")}
                        disabled={index === categories.length - 1 || reordering}
                        className="p-1 rounded text-spoon-muted hover:text-spoon-dark hover:bg-spoon-sand disabled:opacity-25 transition-colors"
                        title="Move Down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Content or Edit Input */}
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 max-w-md">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(cat.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          autoFocus
                          disabled={savingEdit}
                          className="h-8 text-xs font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => saveEdit(cat.id)}
                          disabled={savingEdit}
                          className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                          title="Save"
                        >
                          {savingEdit ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={savingEdit}
                          className="p-1.5 rounded-lg border border-spoon-border bg-white text-spoon-muted hover:text-spoon-dark transition-colors"
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif font-bold text-sm text-spoon-dark">
                            {cat.name}
                          </h3>
                          <span className="text-[10px] font-mono text-spoon-muted/80 bg-spoon-sand px-1.5 py-0.5 rounded">
                            #{cat.sort_order}
                          </span>
                        </div>
                        <span className="text-[11px] text-spoon-muted">
                          {cat.productCount} {cat.productCount === 1 ? "menu item" : "menu items"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(cat)}
                        className="rounded-xl p-2 text-spoon-muted hover:text-spoon-dark hover:bg-spoon-sand transition-colors"
                        title="Rename Category"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(cat)}
                        className="rounded-xl p-2 text-rose-600 hover:bg-rose-50 transition-colors"
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
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
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
