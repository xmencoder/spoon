"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
  Sparkles,
  Copy,
  Percent,
  ShoppingBag,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAdminCouponsAction,
  saveAdminCouponAction,
  toggleAdminCouponAction,
  deleteAdminCouponAction,
} from "../coupons-actions";
import type { Coupon } from "@/lib/coupons";
import { formatPrice } from "@/lib/utils";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formPercent, setFormPercent] = useState<number | string>(10);
  const [formMinAmount, setFormMinAmount] = useState<number | string>(499);
  const [formDescription, setFormDescription] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Status Notification
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Copied code feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminCouponsAction();
      setCoupons(data || []);
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to load coupons.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setFormCode("");
    setFormPercent(10);
    setFormMinAmount(499);
    setFormDescription("");
    setFormIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (c: Coupon) => {
    setEditingCoupon(c);
    setFormCode(c.code);
    setFormPercent(c.discountPercent);
    setFormMinAmount(c.minOrderAmount || 0);
    setFormDescription(c.description || "");
    setFormIsActive(c.isActive);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = formCode.trim().toUpperCase();
    if (!cleanCode) {
      setFormError("Please enter a coupon code.");
      return;
    }

    const percent = Number(formPercent);
    if (isNaN(percent) || percent <= 0 || percent > 100) {
      setFormError("Discount percentage must be between 1% and 100%.");
      return;
    }

    const minAmount = Number(formMinAmount) || 0;
    if (minAmount < 0) {
      setFormError("Minimum order amount cannot be negative.");
      return;
    }

    try {
      setSaving(true);
      const res = await saveAdminCouponAction({
        id: editingCoupon ? editingCoupon.id : undefined,
        code: cleanCode,
        discountPercent: percent,
        minOrderAmount: minAmount,
        description: formDescription,
        isActive: formIsActive,
      });

      if (!res.success) {
        setFormError(res.error || "Failed to save coupon.");
        return;
      }

      showNotification(
        "success",
        editingCoupon
          ? `Coupon "${cleanCode}" updated successfully!`
          : `Coupon "${cleanCode}" created successfully!`
      );
      setModalOpen(false);
      loadCoupons();
    } catch (err: any) {
      setFormError(err?.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: Coupon) => {
    try {
      const newStatus = !c.isActive;
      // Optimistic update
      setCoupons((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, isActive: newStatus } : item))
      );

      const res = await toggleAdminCouponAction(c.id, newStatus);
      if (!res.success) {
        showNotification("error", res.error || "Failed to update status.");
        loadCoupons();
      } else {
        showNotification(
          "success",
          `Coupon "${c.code}" is now ${newStatus ? "Active" : "Paused"}.`
        );
      }
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to toggle status.");
      loadCoupons();
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete coupon "${code}"? This cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(id);
      const res = await deleteAdminCouponAction(id);
      if (!res.success) {
        showNotification("error", res.error || "Failed to delete coupon.");
      } else {
        showNotification("success", `Coupon "${code}" deleted successfully.`);
        loadCoupons();
      }
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to delete coupon.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filtered coupons
  const filteredCoupons = coupons.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === "active") return c.isActive;
    if (statusFilter === "inactive") return !c.isActive;
    return true;
  });

  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => c.isActive).length;
  const avgDiscount =
    totalCoupons > 0
      ? Math.round(
          coupons.reduce((sum, c) => sum + (Number(c.discountPercent) || 0), 0) / totalCoupons
        )
      : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* ── Top Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-spoon-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF2ED] text-[#A03B2A] border border-[#E8D2C5]">
              <Tag className="w-3 h-3" />
              Promotion Management
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-spoon-dark tracking-tight">
            Coupon Codes & Discounts
          </h1>
          <p className="text-xs text-spoon-muted mt-1">
            Create percentage discounts and set minimum order thresholds for customer checkout.
          </p>
        </div>

        <Button
          onClick={handleOpenCreateModal}
          className="rounded-2xl bg-spoon-caramel hover:bg-spoon-caramel/90 text-white font-bold text-xs px-5 py-2.5 shadow-warm-sm flex items-center gap-2 cursor-pointer transition-all self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Coupon</span>
        </Button>
      </div>

      {/* ── Global Notification Banner ── */}
      {notification && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-semibold animate-in fade-in duration-200 ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-stone-400 hover:text-stone-700 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Stat Badges Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-2xl border border-spoon-border bg-white p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-spoon-muted">
              Total Coupons
            </p>
            <p className="font-serif text-2xl font-bold text-spoon-dark mt-0.5">{totalCoupons}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-spoon-sand text-spoon-caramel flex items-center justify-center border border-spoon-border/60">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-spoon-border bg-white p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-spoon-muted">
              Active in Checkout
            </p>
            <p className="font-serif text-2xl font-bold text-emerald-700 mt-0.5">{activeCoupons}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-spoon-border bg-white p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-spoon-muted">
              Average Discount
            </p>
            <p className="font-serif text-2xl font-bold text-spoon-caramel mt-0.5">
              {avgDiscount}%
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-spoon-caramel flex items-center justify-center border border-amber-200">
            <Percent className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="rounded-3xl border border-spoon-border bg-white p-4 sm:p-5 shadow-warm-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-spoon-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search coupon code or description..."
              className="w-full rounded-2xl border border-spoon-border bg-spoon-cream/40 pl-10 pr-4 py-2.5 text-xs text-spoon-dark placeholder:text-spoon-muted focus:outline-none focus:ring-2 focus:ring-spoon-caramel/30 focus:border-spoon-caramel transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-spoon-muted hover:text-spoon-dark"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-spoon-sand/70 border border-spoon-border/60 self-start sm:self-auto">
            {(
              [
                { id: "all", label: `All (${totalCoupons})` },
                { id: "active", label: `Active (${activeCoupons})` },
                { id: "inactive", label: `Paused (${totalCoupons - activeCoupons})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-white text-spoon-dark shadow-2xs"
                    : "text-spoon-muted hover:text-spoon-dark"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Coupons List ── */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-spoon-muted gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-spoon-caramel" />
            <p className="text-xs">Loading coupon codes...</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-spoon-border bg-spoon-cream/20">
            <Tag className="w-8 h-8 text-spoon-muted mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-spoon-dark">No coupons found</p>
            <p className="text-xs text-spoon-muted mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No coupon matches "${searchQuery}". Try a different keyword.`
                : "No coupons created yet. Click 'Add New Coupon' to get started."}
            </p>
            {!searchQuery && (
              <Button
                onClick={handleOpenCreateModal}
                className="mt-4 rounded-xl bg-spoon-caramel hover:bg-spoon-caramel/90 text-white text-xs font-bold px-4 py-2"
              >
                Create First Coupon
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredCoupons.map((coupon) => (
              <div
                key={coupon.id}
                className={`rounded-2xl border transition-all p-4 flex flex-col justify-between gap-4 ${
                  coupon.isActive
                    ? "bg-[#FFFDFB] border-spoon-border hover:border-spoon-caramel/50 shadow-2xs"
                    : "bg-stone-50 border-stone-200 opacity-70"
                }`}
              >
                {/* Header: Code + Badge */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-base font-extrabold tracking-wider text-spoon-dark px-2.5 py-1 rounded-xl bg-[#FAF2ED] border border-[#E8D2C5]">
                        {coupon.code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(coupon.code)}
                        className="p-1.5 rounded-lg text-spoon-muted hover:text-spoon-dark hover:bg-spoon-sand/60 transition-colors"
                        title="Copy code"
                      >
                        {copiedCode === coupon.code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => handleToggleActive(coupon)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-all border ${
                        coupon.isActive
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                          : "bg-stone-200 text-stone-600 border-stone-300 hover:bg-stone-300"
                      }`}
                    >
                      {coupon.isActive ? "● Active" : "○ Paused"}
                    </button>
                  </div>

                  {/* Discount & Min Amount Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#C26B59] text-white">
                      <Percent className="w-3 h-3" />
                      {coupon.discountPercent}% OFF
                    </span>

                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EDE3D4] text-[#4A4031] border border-[#D5C6B1]">
                      <ShoppingBag className="w-3 h-3 text-[#A03B2A]" />
                      {coupon.minOrderAmount > 0
                        ? `Min Order ${formatPrice(coupon.minOrderAmount)}`
                        : "No Min Order"}
                    </span>
                  </div>

                  {/* Description / Customer Prompt info */}
                  <p className="text-xs text-spoon-muted line-clamp-2 leading-relaxed pt-1">
                    {coupon.description ||
                      `${coupon.discountPercent}% discount on cart subtotal${
                        coupon.minOrderAmount > 0
                          ? ` (requires minimum order of ${formatPrice(coupon.minOrderAmount)})`
                          : ""
                      }.`}
                  </p>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between border-t border-spoon-border/50 pt-3 text-xs">
                  <span className="text-[10px] text-spoon-muted">
                    {coupon.minOrderAmount > 0 ? (
                      <span className="text-amber-800 font-medium">
                        Prompts user if under {formatPrice(coupon.minOrderAmount)}
                      </span>
                    ) : (
                      "Applies to any amount"
                    )}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(coupon)}
                      className="p-1.5 rounded-lg text-spoon-dark hover:bg-spoon-sand/70 transition-colors"
                      title="Edit Coupon"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                      disabled={deletingId === coupon.id}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                      title="Delete Coupon"
                    >
                      {deletingId === coupon.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-spoon-border bg-white p-6 sm:p-7 shadow-warm-lg animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-spoon-border/60 pb-3.5 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-spoon-sand text-spoon-caramel flex items-center justify-center border border-spoon-border/60">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-spoon-dark">
                    {editingCoupon ? `Edit Coupon "${editingCoupon.code}"` : "Create New Coupon"}
                  </h2>
                  <p className="text-[11px] text-spoon-muted">
                    Configure code, percentage & order threshold
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-spoon-muted hover:text-spoon-dark p-1 rounded-lg hover:bg-spoon-sand transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error in Form */}
            {formError && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCoupon} className="space-y-4">
              {/* Coupon Code */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                  Coupon Code *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                    placeholder="e.g. WELCOME10, SPOON5, DIWALI20"
                    required
                    className="w-full rounded-2xl border border-spoon-border bg-spoon-cream/40 px-4 py-2.5 text-sm font-mono font-bold text-spoon-dark uppercase placeholder:normal-case placeholder:font-sans placeholder:text-spoon-muted focus:outline-none focus:ring-2 focus:ring-spoon-caramel/30 focus:border-spoon-caramel"
                  />
                </div>
                <p className="text-[11px] text-spoon-muted mt-1">
                  Customer enters this code at checkout (case-insensitive).
                </p>
              </div>

              {/* Discount Percentage */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark">
                    Discount Percentage (%) *
                  </label>
                  <span className="text-[11px] font-bold text-spoon-caramel">
                    {formPercent}% OFF
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={formPercent}
                    onChange={(e) => setFormPercent(e.target.value)}
                    required
                    placeholder="10"
                    className="w-full rounded-2xl border border-spoon-border bg-spoon-cream/40 px-4 py-2.5 text-sm font-bold text-spoon-dark focus:outline-none focus:ring-2 focus:ring-spoon-caramel/30 focus:border-spoon-caramel"
                  />
                  <Percent className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-spoon-muted" />
                </div>

                {/* Quick percentage chips */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-spoon-muted">Quick select:</span>
                  {[5, 10, 15, 20, 25].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setFormPercent(pct)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        Number(formPercent) === pct
                          ? "bg-spoon-caramel text-white"
                          : "bg-spoon-sand text-spoon-dark hover:bg-spoon-sand/80"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Minimum Order Amount */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                  Minimum Order Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-spoon-muted">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={formMinAmount}
                    onChange={(e) => setFormMinAmount(e.target.value)}
                    placeholder="499 (0 for no minimum)"
                    className="w-full rounded-2xl border border-spoon-border bg-spoon-cream/40 pl-8 pr-4 py-2.5 text-sm font-bold text-spoon-dark focus:outline-none focus:ring-2 focus:ring-spoon-caramel/30 focus:border-spoon-caramel"
                  />
                </div>
                <div className="flex items-start gap-1.5 mt-1 text-[11px] text-spoon-muted leading-snug">
                  <Info className="w-3.5 h-3.5 text-spoon-caramel shrink-0 mt-0.5" />
                  <span>
                    If the cart subtotal is less than this, checkout shows:{" "}
                    <span className="font-semibold text-amber-900">
                      &quot;Add ₹X more to avail this coupon!&quot;
                    </span>
                  </span>
                </div>
              </div>

              {/* Description / Note */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-spoon-dark mb-1.5">
                  Description / Note (Optional)
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Special festive 10% discount on orders above ₹499"
                  className="w-full rounded-2xl border border-spoon-border bg-spoon-cream/40 px-4 py-2.5 text-xs text-spoon-dark placeholder:text-spoon-muted focus:outline-none focus:ring-2 focus:ring-spoon-caramel/30 focus:border-spoon-caramel"
                />
              </div>

              {/* Active Toggle Checkbox */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-spoon-sand/40 border border-spoon-border/60">
                <div>
                  <p className="text-xs font-bold text-spoon-dark">Enable Immediately</p>
                  <p className="text-[10px] text-spoon-muted">
                    Active coupons can be entered by customers at checkout
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-spoon-caramel accent-[#C26B59] cursor-pointer"
                />
              </div>

              {/* Live Preview Card */}
              <div className="p-3.5 rounded-2xl bg-[#FFF8F5] border border-[#A03B2A]/20 text-xs space-y-1">
                <p className="text-[10px] uppercase font-bold text-[#A03B2A]">Checkout Preview:</p>
                <p className="text-xs font-semibold text-spoon-dark">
                  🎟️ Code: <span className="font-mono font-bold">{formCode || "COUPON"}</span>{" "}
                  gives <span className="text-emerald-700 font-bold">{formPercent || 0}% OFF</span>
                </p>
                <p className="text-[11px] text-[#7A6E5D]">
                  {Number(formMinAmount) > 0
                    ? `Requires minimum order of ${formatPrice(Number(formMinAmount))}. Prompts customer if cart is below this.`
                    : "Valid on all order amounts without minimum requirement."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border-spoon-border text-xs font-bold px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-spoon-caramel hover:bg-spoon-caramel/90 text-white text-xs font-bold px-5 py-2 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingCoupon ? "Save Changes" : "Create Coupon"}</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
