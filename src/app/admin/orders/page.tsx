"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAdmin } from "@/lib/admin/AdminContext";
import { getAdminOrders } from "@/lib/admin/admin-service";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderItem, OrderStatus } from "@/types/database";
import { formatPrice } from "@/lib/utils";
import {
  advanceOrderStatusServerAction,
  updateOrderPaymentStatusServerAction,
  getAdminOrdersServerAction,
  getOrderItemsServerAction,
  autoVerifyRazorpayPaymentServerAction,
} from "./actions";
import {
  ShoppingBag,
  Clock,
  MessageCircle,
  Truck,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Phone,
  Search,
  Check,
  CreditCard,
  ShieldCheck,
  FileText,
  SlidersHorizontal,
  Utensils,
  IndianRupee,
  Sparkles,
  Mail,
  Zap,
  Gift,
  Tag,
} from "lucide-react";
import { generateOrderReceiptPdf } from "@/lib/pdf-generator";

// Helper: check if an order is paid via Razorpay / verified
export function isOrderPaid(order: Order): boolean {
  const status = (order.payment_status || "").toLowerCase();
  return (
    status === "paid" ||
    status === "verified" ||
    order.approval_source === "RAZORPAY" ||
    !!order.payment_verified_at
  );
}

// ─── Helper: parse add-on detail string from product_name ─────────────────────
// Product names are saved as: "Cake Name (Size) [Addon (+₹X), Addon2 (+₹Y)]"
function parseOrderItemName(rawName: string): {
  baseName: string;
  sizeLabel: string | null;
  addons: string[];
  isMessageCard: boolean;
} {
  const isMessageCard = rawName.startsWith("💌");
  let name = rawName;
  const addons: string[] = [];
  let sizeLabel: string | null = null;

  // Extract add-ons from [...]
  const addonMatch = name.match(/\[([^\]]+)\]$/);
  if (addonMatch) {
    const addonStr = addonMatch[1];
    addonStr.split(",").forEach((a) => addons.push(a.trim()));
    name = name.replace(/\s*\[[^\]]+\]$/, "").trim();
  }

  // Extract size from (...)
  const sizeMatch = name.match(/\(([^)]+)\)$/);
  if (sizeMatch && !isMessageCard) {
    sizeLabel = sizeMatch[1];
    name = name.replace(/\s*\([^)]+\)$/, "").trim();
  }

  return { baseName: name, sizeLabel, addons, isMessageCard };
}

// ─── Status Configurations ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; dot: string; progress: number }
> = {
  payment_verification_pending: {
    label: "Payment Verification Pending",
    bg: "bg-amber-50",
    text: "text-amber-800 border-amber-200",
    dot: "bg-amber-500",
    progress: 15,
  },
  pending: {
    label: "Order Placed",
    bg: "bg-blue-50",
    text: "text-blue-800 border-blue-200",
    dot: "bg-blue-500",
    progress: 25,
  },
  confirmed: {
    label: "Confirmed",
    bg: "bg-blue-50",
    text: "text-blue-800 border-blue-200",
    dot: "bg-blue-500",
    progress: 50,
  },
  received_in_kitchen: {
    label: "In Kitchen",
    bg: "bg-purple-50",
    text: "text-purple-800 border-purple-200",
    dot: "bg-purple-500",
    progress: 50,
  },
  baking: {
    label: "Baking & Handcrafting",
    bg: "bg-orange-50",
    text: "text-orange-800 border-orange-200",
    dot: "bg-orange-500",
    progress: 70,
  },
  ready: {
    label: "Quality Checked & Ready",
    bg: "bg-teal-50",
    text: "text-teal-800 border-teal-200",
    dot: "bg-teal-500",
    progress: 85,
  },
  ready_for_pickup: {
    label: "Ready for Pickup",
    bg: "bg-emerald-50",
    text: "text-emerald-800 border-emerald-300",
    dot: "bg-emerald-600",
    progress: 85,
  },
  out_for_delivery: {
    label: "Out for Delivery",
    bg: "bg-indigo-50",
    text: "text-indigo-800 border-indigo-200",
    dot: "bg-indigo-500",
    progress: 90,
  },
  delivered: {
    label: "Delivered",
    bg: "bg-emerald-50",
    text: "text-emerald-800 border-emerald-200",
    dot: "bg-emerald-600",
    progress: 100,
  },
  completed: {
    label: "Completed",
    bg: "bg-emerald-50",
    text: "text-emerald-800 border-emerald-200",
    dot: "bg-emerald-600",
    progress: 100,
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-rose-50",
    text: "text-rose-800 border-rose-200",
    dot: "bg-rose-500",
    progress: 0,
  },
};

export default function AdminOrdersPage() {
  const { restaurant } = useAdmin();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<"all" | "delivery" | "takeaway">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!restaurant?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await getAdminOrdersServerAction(restaurant.id);
      if (res.success && res.data) {
        setOrders(res.data as Order[]);
      } else {
        const data = await getAdminOrders(restaurant.id);
        setOrders(data as Order[]);
      }
    } catch (err: unknown) {
      console.error("Fetch orders error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Status Change in Pipeline
  const handleAdvanceStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setActionInProgressId(orderId);
      setErrorMsg(null);
      const res = await advanceOrderStatusServerAction(orderId, newStatus);
      if (!res.success) throw new Error((res as any)?.error || "Failed to update status");

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );

      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }

      if (newStatus === "completed" || newStatus === "delivered") {
        setSuccessMsg(
          `Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}! Customer has been notified via email.`
        );
      } else {
        setSuccessMsg(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      }
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (err: any) {
      console.error("Status update error:", err);
      setErrorMsg(err.message || "Failed to update status");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Auto-Verify via Razorpay API
  const handleAutoVerify = async (orderId: string) => {
    try {
      setActionInProgressId(orderId);
      setErrorMsg(null);
      const res = await autoVerifyRazorpayPaymentServerAction(orderId);
      if (!res.success) {
        // Fall back to showing the error — let admin use manual Mark as Paid
        setErrorMsg((res as any)?.error || "Auto-verification failed. Use 'Mark as Paid' instead.");
        return;
      }

      // Update local state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                payment_status: "verified",
                status: o.status === "payment_verification_pending" ? "confirmed" : o.status,
                payment_verified_at: new Date().toISOString(),
                approval_source: "RAZORPAY",
              }
            : o
        )
      );

      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                payment_status: "verified",
                status: prev.status === "payment_verification_pending" ? "confirmed" : prev.status,
                payment_verified_at: new Date().toISOString(),
                approval_source: "RAZORPAY",
              }
            : null
        );
      }

      if ((res as any).alreadyVerified) {
        setSuccessMsg("Payment was already verified!");
      } else {
        setSuccessMsg(`✅ Razorpay payment verified automatically! Order confirmed.`);
      }
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (err: any) {
      setErrorMsg(err.message || "Auto-verification error");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Direct Payment Verification
  const handleVerifyPayment = async (orderId: string) => {
    try {
      setActionInProgressId(orderId);
      setErrorMsg(null);
      const res = await updateOrderPaymentStatusServerAction(
        orderId,
        "verified",
        "Direct Payment / Admin Verified"
      );
      if (!res.success) throw new Error((res as any)?.error || "Failed to verify payment");

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                payment_status: "verified",
                status: o.status === "payment_verification_pending" ? "confirmed" : o.status,
                payment_verified_at: new Date().toISOString(),
                approval_source: "DASHBOARD",
              }
            : o
        )
      );

      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                payment_status: "verified",
                status: prev.status === "payment_verification_pending" ? "confirmed" : prev.status,
                payment_verified_at: new Date().toISOString(),
                approval_source: "DASHBOARD",
              }
            : null
        );
      }

      setSuccessMsg("Payment marked as verified! Order is confirmed.");
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error("Payment verify error:", err);
      setErrorMsg(err.message || "Failed to verify payment");
    } finally {
      setActionInProgressId(null);
    }
  };

  const openOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    if (order.order_items && order.order_items.length > 0) {
      setOrderItems(order.order_items);
      return;
    }
    setLoadingItems(true);
    try {
      const res = await getOrderItemsServerAction(order.id);
      if (res.success && res.data && res.data.length > 0) {
        setOrderItems(res.data as OrderItem[]);
      } else {
        setOrderItems([]);
      }
    } catch (err: unknown) {
      console.error("Fetch items error:", err);
      setOrderItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  // Download PDF receipt
  const handleDownloadReceipt = (order: Order) => {
    try {
      const orderNum = order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`;
      const itemsForPdf = (orderItems.length > 0 ? orderItems : order.order_items || []).map((i) => ({
        name: i.product_name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        subtotal: i.subtotal,
      }));

      const pdfDoc = generateOrderReceiptPdf({
        orderNumber: orderNum,
        orderId: order.id,
        createdAt: order.created_at || new Date().toISOString(),
        orderType: order.order_type,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerEmail: order.customer_email || undefined,
        deliveryAddress: order.delivery_address || undefined,
        pickupLocation: order.pickup_location || undefined,
        deliveryDate: order.delivery_date || undefined,
        deliveryTimeSlot: order.delivery_time_slot || undefined,
        items: itemsForPdf,
        subtotal: order.subtotal,
        deliveryCharge: order.delivery_charge,
        total: order.total,
        paymentMethod: "Razorpay Online",
        paymentStatus: "PAID",
        paymentVerifiedAt: order.payment_verified_at || new Date().toISOString(),
        bakeryName: restaurant?.name || "The Indulgent Spoon",
        bakeryPhone: restaurant?.phone || "+91 9717123510",
        bakeryAddress: restaurant?.address || "The Indulgent Spoon, DLF Phase 4, Gurugram",
      });

      pdfDoc.save(`Receipt-${orderNum.replace("#", "")}.pdf`);
    } catch (err) {
      console.error("Receipt generation error:", err);
    }
  };

  // Filtered Orders based on search query, payment filter, fulfillment filter, and status filter
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Payment Status Filter
      const isPaid = isOrderPaid(order);
      if (paymentFilter === "paid" && !isPaid) return false;
      if (paymentFilter === "unpaid" && isPaid) return false;

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = (order.order_number || "").toLowerCase();
        const id = order.id.toLowerCase();
        const name = (order.customer_name || "").toLowerCase();
        const phone = (order.customer_phone || "").toLowerCase();
        const address = (order.delivery_address || "").toLowerCase();
        if (
          !num.includes(q) &&
          !id.includes(q) &&
          !name.includes(q) &&
          !phone.includes(q) &&
          !address.includes(q)
        ) {
          return false;
        }
      }

      // 3. Fulfillment
      if (fulfillmentFilter !== "all" && order.order_type !== fulfillmentFilter) {
        return false;
      }

      // 4. Kitchen / Dispatch Status
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [orders, paymentFilter, searchQuery, fulfillmentFilter, statusFilter]);

  // KPI Metrics (Calculated on All Orders)
  const metrics = useMemo(() => {
    const total = orders.length;
    const paidCount = orders.filter(isOrderPaid).length;
    const pendingCount = total - paidCount;
    const totalRevenue = orders
      .filter(isOrderPaid)
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
    const confirmedCount = orders.filter((o) => o.status === "confirmed").length;
    const completed = orders.filter(
      (o) => o.status === "delivered" || o.status === "completed"
    ).length;
    return {
      total,
      paidCount,
      pendingCount,
      totalRevenue,
      confirmedCount,
      completed,
    };
  }, [orders]);

  return (
    <div className="max-w-7xl space-y-6">
      {/* ── HEADER & QUICK TABS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-spoon-border/60">
        <div>
          <h1 className="font-serif text-3xl font-bold text-spoon-dark flex items-center gap-2.5">
            <span>Orders Management</span>
            <span className="text-xs font-sans font-bold bg-spoon-sand border border-spoon-border text-spoon-dark px-3 py-0.5 rounded-full">
              {filteredOrders.length} {filteredOrders.length === 1 ? "Order" : "Orders"}
            </span>
          </h1>
          <p className="text-xs text-spoon-muted mt-1">
            Real-time bakery order pipeline with live payment verification, preparation tracking & email updates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filter Buttons */}
          <div className="inline-flex rounded-xl bg-spoon-sand/40 border border-spoon-border p-1">
            <button
              onClick={() => setPaymentFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                paymentFilter === "all"
                  ? "bg-white text-spoon-dark shadow-2xs"
                  : "text-spoon-muted hover:text-spoon-dark"
              }`}
            >
              All ({metrics.total})
            </button>
            <button
              onClick={() => setPaymentFilter("paid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                paymentFilter === "paid"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-emerald-800 hover:text-emerald-950"
              }`}
            >
              <Check className="w-3 h-3" />
              <span>Paid ({metrics.paidCount})</span>
            </button>
            <button
              onClick={() => setPaymentFilter("unpaid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                paymentFilter === "unpaid"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-amber-800 hover:text-amber-950"
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Pending ({metrics.pendingCount})</span>
            </button>
          </div>

          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-spoon-border bg-white text-xs font-bold text-spoon-dark hover:bg-spoon-sand transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── ALERTS / FEEDBACK ── */}
      {errorMsg && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── KPI METRICS SUMMARY ROW ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-spoon-border shadow-warm-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted block">
            Total Orders
          </span>
          <span className="font-serif text-xl sm:text-2xl font-bold text-spoon-dark block mt-0.5">
            {metrics.total}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-spoon-border shadow-warm-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
            Paid Revenue
          </span>
          <span className="font-serif text-xl sm:text-2xl font-bold text-emerald-700 block mt-0.5">
            {formatPrice(metrics.totalRevenue)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-spoon-border shadow-warm-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
            Pending Payment
          </span>
          <span className={`font-serif text-xl sm:text-2xl font-bold block mt-0.5 ${metrics.pendingCount > 0 ? "text-amber-700 font-extrabold" : "text-spoon-dark"}`}>
            {metrics.pendingCount}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-spoon-border shadow-warm-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
            Step 1: Confirmed
          </span>
          <span className="font-serif text-xl sm:text-2xl font-bold text-blue-700 block mt-0.5">
            {metrics.confirmedCount}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-white border border-spoon-border shadow-warm-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
            Step 2: Completed
          </span>
          <span className="font-serif text-xl sm:text-2xl font-bold text-emerald-700 block mt-0.5">
            {metrics.completed}
          </span>
        </div>
      </div>

      {/* ── SEARCH & FILTERS CONTROLS ── */}
      <div className="rounded-2xl border border-spoon-border bg-white p-3.5 sm:p-4 shadow-warm-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-spoon-muted">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order #, Customer Name, Phone, or Delivery Address..."
              className="w-full h-10 rounded-xl border border-spoon-border bg-spoon-sand/20 pl-10 pr-4 text-xs text-spoon-dark placeholder:text-spoon-muted focus:outline-none focus:ring-2 focus:ring-spoon-caramel/30 transition-all"
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

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap gap-2">
            {/* Payment Filter Dropdown */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="h-10 rounded-xl border border-spoon-border bg-spoon-sand/20 px-3 text-xs font-bold text-spoon-dark focus:outline-none cursor-pointer"
            >
              <option value="all">Payment: All Orders</option>
              <option value="paid">✓ Paid & Verified</option>
              <option value="unpaid">⏳ Pending Verification</option>
            </select>

            {/* Fulfillment Filter */}
            <select
              value={fulfillmentFilter}
              onChange={(e) => setFulfillmentFilter(e.target.value as any)}
              className="h-10 rounded-xl border border-spoon-border bg-spoon-sand/20 px-3 text-xs font-bold text-spoon-dark focus:outline-none cursor-pointer"
            >
              <option value="all">Fulfillment: All</option>
              <option value="delivery">🛵 Home Delivery</option>
              <option value="takeaway">🛍️ Takeaway / Pickup</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-spoon-border bg-spoon-sand/20 px-3 text-xs font-bold text-spoon-dark focus:outline-none cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="confirmed">✓ Step 1: Confirmed</option>
              <option value="completed">🎉 Step 2: Completed</option>
              <option value="payment_verification_pending">⏳ Payment Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── ORDERS TABULAR VIEW (DIRECTLY SHOWING PAID ORDERS) ── */}
      <div className="overflow-hidden rounded-2xl border border-spoon-border bg-white shadow-warm-sm">
        {loading ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-spoon-caramel" />
            <span className="text-xs font-semibold text-spoon-muted">
              Loading paid orders...
            </span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-spoon-sand text-spoon-muted mb-3 border border-spoon-border">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <h3 className="font-serif text-lg font-bold text-spoon-dark">
              No paid orders found
            </h3>
            <p className="text-xs text-spoon-muted max-w-sm mt-1">
              Only verified paid orders via Razorpay appear here. When customers complete checkout and payment, their orders will automatically show in this section.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-spoon-dark">
              <thead className="border-b border-spoon-border bg-spoon-sand/30 font-bold uppercase tracking-wider text-spoon-muted text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">Order # & Date</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Products / Items</th>
                  <th className="px-4 py-3.5">Fulfillment</th>
                  <th className="px-4 py-3.5">Payment (Razorpay)</th>
                  <th className="px-4 py-3.5">Kitchen Progress</th>
                  <th className="px-4 py-3.5">Total</th>
                  <th className="px-4 py-3.5 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-spoon-border/60">
                {filteredOrders.map((order) => {
                  const statusInfo =
                    STATUS_CONFIG[order.status] || STATUS_CONFIG.confirmed;
                  const orderNum = order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`;
                  const itemsList = order.order_items || [];

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-spoon-sand/20 transition-colors group"
                    >
                      {/* 1. Order Number & Date */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-bold text-xs text-[#A34B3D] block">
                          #{orderNum}
                        </span>
                        <span className="text-[10.5px] text-spoon-muted block mt-0.5">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Recent"}
                        </span>
                      </td>

                      {/* 2. Customer */}
                      <td className="px-4 py-3.5">
                        <span className="font-serif font-bold text-sm block text-spoon-dark leading-tight">
                          {order.customer_name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <a
                            href={`https://wa.me/${order.customer_phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="h-3 w-3 text-emerald-600" />
                            <span>{order.customer_phone}</span>
                          </a>
                        </div>
                      </td>

                      {/* 3. Products Ordered */}
                      <td className="px-4 py-3.5 max-w-[220px]">
                        {itemsList.length > 0 ? (
                          <div className="space-y-1">
                            {itemsList.slice(0, 2).map((item, idx) => (
                              <div
                                key={idx}
                                className="text-[11.5px] text-spoon-dark leading-tight truncate flex items-center gap-1.5"
                              >
                                <span className="font-bold text-spoon-caramel shrink-0">
                                  {item.quantity}×
                                </span>
                                <span className="truncate">{item.product_name}</span>
                              </div>
                            ))}
                            {itemsList.length > 2 && (
                              <span className="text-[10px] font-bold text-spoon-muted block">
                                +{itemsList.length - 2} more item(s)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-spoon-muted italic">
                            Click Manage to view items
                          </span>
                        )}
                      </td>

                      {/* 4. Fulfillment & Slot */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 rounded-md bg-spoon-sand/70 border border-spoon-border/80 px-2 py-0.5 text-[10.5px] font-semibold text-spoon-dark capitalize">
                            {order.order_type === "delivery" ? (
                              <Truck className="h-3 w-3 text-spoon-caramel" />
                            ) : (
                              <ShoppingBag className="h-3 w-3 text-spoon-caramel" />
                            )}
                            <span>{order.order_type === "delivery" ? "Delivery" : "Takeaway"}</span>
                          </span>

                          {(order.delivery_date || order.delivery_time_slot) && (
                            <div className="text-[10px] font-semibold text-spoon-dark">
                              {order.delivery_date && (
                                <span className="block truncate">
                                  📅 {new Date(order.delivery_date + "T00:00:00").toLocaleDateString("en-IN", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              )}
                              {order.delivery_time_slot && (
                                <span className="block truncate text-spoon-caramel font-bold">
                                  ⏰ {order.delivery_time_slot}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. Payment Status */}
                      <td className="px-4 py-3.5">
                        {isOrderPaid(order) ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                              <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                              <span>Paid ({order.payment_method || "Razorpay"})</span>
                            </span>
                            <span className="block text-[9.5px] text-spoon-muted">
                              {order.approval_source === "RAZORPAY" ? "Auto-verified online" : "Verified & Logged"}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Verification Pending</span>
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVerifyPayment(order.id);
                              }}
                              disabled={actionInProgressId === order.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold shadow-2xs transition-all cursor-pointer"
                              title="Confirm you have received customer payment"
                            >
                              <Check className="w-2.5 h-2.5" />
                              <span>Mark as Paid</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 6. Kitchen Progress */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${statusInfo.bg} ${statusInfo.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                            <span>{statusInfo.label}</span>
                          </span>

                          {/* Progress Mini Bar */}
                          <div className="w-20 h-1.5 bg-spoon-sand rounded-full overflow-hidden">
                            <div
                              className="h-full bg-spoon-caramel transition-all duration-300"
                              style={{ width: `${statusInfo.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 7. Total */}
                      <td className="px-4 py-3.5 font-bold text-sm text-spoon-dark whitespace-nowrap">
                        {formatPrice(order.total)}
                      </td>

                      {/* 8. Manage Button */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => openOrderDetails(order)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-spoon-sand/80 hover:bg-spoon-sand px-3 py-1.5 text-xs font-bold text-spoon-dark border border-spoon-border/70 shadow-2xs transition-all hover:scale-105 cursor-pointer"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5 text-spoon-caramel" />
                          <span>Manage</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── MANAGE ORDER MODAL (SHOW ALL DETAILS & ALL OPTIONS) ──── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-spoon-border bg-white shadow-warm-lg max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-spoon-border/70 bg-[#FFFDF9]">
              <div>
                <span className="font-mono text-xs font-bold text-[#A34B3D] block">
                  ORDER #{selectedOrder.order_number || selectedOrder.id.slice(0, 8).toUpperCase()}
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-spoon-dark">
                  Order Details & Management
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-spoon-sand text-spoon-dark hover:bg-spoon-border transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
              {/* ── SECTION 1: PAYMENT STATUS & ACTIONS ── */}
              {isOrderPaid(selectedOrder) ? (
                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
                        <CreditCard className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                          Payment Verified ({selectedOrder.payment_method || "Online"})
                        </span>
                        <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5 mt-0.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Payment Received ({formatPrice(selectedOrder.total)})</span>
                        </h4>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-200/80 text-emerald-900 border border-emerald-300 self-start sm:self-center">
                      <span>✓ PAID</span>
                    </span>
                  </div>

                  <div className="text-[11px] text-emerald-800/80 pt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Method: <strong>{selectedOrder.payment_method || "Razorpay / UPI"}</strong></span>
                    {selectedOrder.payment_verified_at && (
                      <span>
                        Verified:{" "}
                        <strong>
                          {new Date(selectedOrder.payment_verified_at).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                      </span>
                    )}
                    <span>Source: <strong>{selectedOrder.approval_source || "Verified"}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50/80 space-y-3">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                      <Clock className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                        Payment Status: Pending Verification
                      </span>
                      <h4 className="font-bold text-sm text-amber-950 mt-0.5">
                        Awaiting Payment Confirmation ({formatPrice(selectedOrder.total)})
                      </h4>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                    {/* Auto-Verify via Razorpay — shown when payment ID or order ID exists */}
                    {Boolean((selectedOrder as any).razorpay_payment_id || (selectedOrder as any).razorpay_order_id) && (
                      <button
                        type="button"
                        disabled={actionInProgressId === selectedOrder.id}
                        onClick={() => handleAutoVerify(selectedOrder.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                      >
                        {actionInProgressId === selectedOrder.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Zap className="w-3.5 h-3.5" />
                        )}
                        <span>Auto-Verify via Razorpay</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={actionInProgressId === selectedOrder.id}
                      onClick={() => handleVerifyPayment(selectedOrder.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark as Paid (Manual)</span>
                    </button>
                  </div>

                  {!(selectedOrder as any).razorpay_payment_id && (
                    <p className="text-[10.5px] text-amber-700/80">
                      💡 No Razorpay ID — customer may have paid via UPI/cash. Use &quot;Mark as Paid&quot; after confirming.
                    </p>
                  )}
                </div>
              )}

              {/* ── SECTION 2: 2-STEP ORDER PIPELINE (CONFIRMED & COMPLETED) ── */}
              <div className="p-4 rounded-2xl border border-spoon-border bg-[#FFFDF9] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted block">
                      Kitchen Progress & Dispatch (2 Steps)
                    </span>
                    <h4 className="font-serif font-bold text-base text-spoon-dark flex items-center gap-2 mt-0.5">
                      <span>{selectedOrder.status === "completed" || selectedOrder.status === "delivered" ? "Completed" : selectedOrder.status === "confirmed" ? "Confirmed" : STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_CONFIG[selectedOrder.status]?.bg || "bg-blue-50"} ${STATUS_CONFIG[selectedOrder.status]?.text || "text-blue-800 border-blue-200"}`}>
                        {selectedOrder.status === "completed" || selectedOrder.status === "delivered"
                          ? "Step 2/2 Complete (100%)"
                          : selectedOrder.status === "confirmed"
                          ? "Step 1/2 Complete (50%)"
                          : `${STATUS_CONFIG[selectedOrder.status]?.progress || 25}% Complete`}
                      </span>
                    </h4>
                  </div>
                </div>

                {/* 2-Step Progress Stepper Visual */}
                <div className="relative flex items-center justify-between px-4 sm:px-10 py-1">
                  <div className="absolute left-10 right-10 top-5 h-1.5 bg-spoon-sand/50 -z-0 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300"
                      style={{
                        width:
                          selectedOrder.status === "completed" || selectedOrder.status === "delivered"
                            ? "100%"
                            : selectedOrder.status === "confirmed"
                            ? "50%"
                            : "0%",
                      }}
                    />
                  </div>

                  {/* Step 1 Node */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                        selectedOrder.status === "confirmed" ||
                        selectedOrder.status === "completed" ||
                        selectedOrder.status === "delivered"
                          ? "bg-blue-600 text-white ring-4 ring-blue-100"
                          : "bg-white text-spoon-muted border border-spoon-border"
                      }`}
                    >
                      ✓
                    </div>
                    <span className="text-[11px] font-bold text-spoon-dark mt-1.5">Step 1: Confirmed</span>
                  </div>

                  {/* Step 2 Node */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                        selectedOrder.status === "completed" || selectedOrder.status === "delivered"
                          ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                          : "bg-white text-spoon-muted border border-spoon-border"
                      }`}
                    >
                      🎉
                    </div>
                    <span className="text-[11px] font-bold text-spoon-dark mt-1.5">Step 2: Completed</span>
                  </div>
                </div>

                {/* 2 Pipeline Action Buttons */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-spoon-muted block">
                    Advance Order Pipeline:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Step 1: Confirmed */}
                    <button
                      type="button"
                      disabled={actionInProgressId === selectedOrder.id}
                      onClick={() => handleAdvanceStatus(selectedOrder.id, "confirmed")}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        selectedOrder.status === "confirmed"
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300"
                          : "bg-white hover:bg-spoon-sand/20 border-spoon-border text-spoon-dark"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedOrder.status === "confirmed" ? "text-blue-100" : "text-spoon-muted"}`}>
                          Step 1
                        </span>
                        {selectedOrder.status === "confirmed" && (
                          <span className="text-[10px] font-bold bg-blue-500/80 px-2 py-0.5 rounded-full text-white">
                            Current Status
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5">
                        <span className="text-sm font-bold flex items-center gap-1.5">
                          <Check className="w-4 h-4" />
                          <span>✓ Confirmed</span>
                        </span>
                        <span className={`text-[11px] block mt-0.5 ${selectedOrder.status === "confirmed" ? "text-blue-100" : "text-spoon-muted"}`}>
                          Order accepted & payment verified
                        </span>
                      </div>
                    </button>

                    {/* 2. Step 2: Completed (Emails Customer) */}
                    <button
                      type="button"
                      disabled={actionInProgressId === selectedOrder.id}
                      onClick={() => handleAdvanceStatus(selectedOrder.id, "completed")}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        selectedOrder.status === "completed" || selectedOrder.status === "delivered"
                          ? "bg-emerald-700 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-400"
                          : "bg-emerald-50/70 hover:bg-emerald-100 border-emerald-300 text-emerald-950"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedOrder.status === "completed" || selectedOrder.status === "delivered" ? "text-emerald-100" : "text-emerald-700"}`}>
                          Step 2
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full ${selectedOrder.status === "completed" || selectedOrder.status === "delivered" ? "bg-emerald-600 text-white" : "bg-emerald-200/80 text-emerald-800"}`}>
                          <Mail className="w-2.5 h-2.5" />
                          <span>Emails Customer</span>
                        </span>
                      </div>
                      <div className="mt-2.5">
                        <span className="text-sm font-bold flex items-center gap-1.5">
                          <span>🎉 Mark Completed</span>
                        </span>
                        <span className={`text-[11px] block mt-0.5 ${selectedOrder.status === "completed" || selectedOrder.status === "delivered" ? "text-emerald-100" : "text-emerald-700/80"}`}>
                          Dispatches order completed email to customer
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* ── SECTION 3: PRODUCTS & ORDER ITEMS ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-base text-spoon-dark flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-spoon-caramel" />
                    <span>Dishes & Products Ordered</span>
                  </h4>
                  <span className="text-xs font-semibold text-spoon-muted">
                    {orderItems.length} item(s)
                  </span>
                </div>

                {loadingItems ? (
                  <div className="flex h-24 items-center justify-center gap-2 border border-spoon-border rounded-2xl bg-spoon-sand/10">
                    <Loader2 className="h-4 w-4 animate-spin text-spoon-caramel" />
                    <span className="text-xs text-spoon-muted">Loading product details...</span>
                  </div>
                ) : orderItems.length === 0 ? (
                  <div className="p-4 rounded-2xl border border-spoon-border bg-spoon-sand/20 text-center text-xs text-spoon-muted">
                    No separate line items found for this order.
                  </div>
                ) : (
                  <div className="divide-y divide-spoon-border/60 border border-spoon-border rounded-2xl overflow-hidden bg-white">
                    {orderItems.map((item) => {
                      const parsed = parseOrderItemName(item.product_name);
                      return (
                        <div
                          key={item.id}
                          className={`flex items-start justify-between p-3.5 text-xs transition-colors ${
                            parsed.isMessageCard
                              ? "bg-rose-50/60 hover:bg-rose-50"
                              : "hover:bg-spoon-sand/15"
                          }`}
                        >
                          <div className="space-y-1 flex-1 min-w-0">
                            {/* Item icon + base name */}
                            <div className="flex items-center gap-1.5">
                              {parsed.isMessageCard ? (
                                <Gift className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              ) : (
                                <Tag className="w-3 h-3 text-spoon-caramel shrink-0" />
                              )}
                              <span
                                className={`font-bold text-sm block ${
                                  parsed.isMessageCard ? "text-rose-800" : "text-spoon-dark"
                                }`}
                              >
                                {parsed.baseName}
                              </span>
                            </div>

                            {/* Size label */}
                            {parsed.sizeLabel && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-spoon-sand/60 border border-spoon-border text-[10.5px] font-semibold text-spoon-muted ml-5">
                                Size: {parsed.sizeLabel}
                              </span>
                            )}

                            {/* Add-ons */}
                            {parsed.addons.length > 0 && (
                              <div className="ml-5 space-y-0.5">
                                {parsed.addons.map((addon, ai) => (
                                  <span
                                    key={ai}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10.5px] font-semibold text-amber-800 mr-1"
                                  >
                                    <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                                    {addon}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Qty & unit price */}
                            <span className="text-spoon-muted text-[11px] block ml-5">
                              Qty:{" "}
                              <strong className="text-spoon-caramel">{item.quantity}</strong>
                              {" "}×{" "}
                              {formatPrice(item.unit_price)}
                            </span>
                          </div>

                          <span className={`font-bold text-sm shrink-0 ml-3 ${
                            parsed.isMessageCard ? "text-rose-700" : "text-spoon-dark"
                          }`}>
                            {formatPrice(item.subtotal)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Price Summary */}
                <div className="bg-spoon-sand/30 p-3.5 rounded-2xl border border-spoon-border space-y-1.5 text-xs">
                  <div className="flex justify-between text-spoon-muted">
                    <span>Subtotal:</span>
                    <span>{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-spoon-muted">
                    <span>Delivery Fee:</span>
                    <span>{formatPrice(selectedOrder.delivery_charge)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-spoon-dark text-sm pt-1.5 border-t border-spoon-border/60">
                    <span>Grand Total:</span>
                    <span className="text-[#A34B3D]">{formatPrice(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* ── SECTION 4: CUSTOMER & DELIVERY INFO ── */}
              <div className="p-4 rounded-2xl border border-spoon-border bg-spoon-cream/40 space-y-2.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted block">
                  Customer & Delivery Information
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-spoon-muted block text-[11px]">Customer:</span>
                    <span className="font-bold text-spoon-dark text-sm">
                      {selectedOrder.customer_name}
                    </span>
                  </div>

                  <div>
                    <span className="text-spoon-muted block text-[11px]">WhatsApp & Phone:</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <a
                        href={`https://wa.me/${selectedOrder.customer_phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                        <span>+91 {selectedOrder.customer_phone}</span>
                      </a>
                    </div>
                  </div>

                  {selectedOrder.customer_email && (
                    <div>
                      <span className="text-spoon-muted block text-[11px]">Email:</span>
                      <span className="font-medium text-spoon-dark">
                        {selectedOrder.customer_email}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-spoon-muted block text-[11px]">Fulfillment:</span>
                    <span className="capitalize font-bold text-spoon-dark">
                      {selectedOrder.order_type === "delivery" ? "🛵 Home Delivery" : "🛍️ Takeaway / Pickup"}
                    </span>
                  </div>
                </div>

                {/* Delivery Date & Slot */}
                {(selectedOrder.delivery_date || selectedOrder.delivery_time_slot) && (
                  <div className="pt-2 border-t border-spoon-border/60 flex flex-wrap gap-4">
                    {selectedOrder.delivery_date && (
                      <div>
                        <span className="text-spoon-muted block text-[11px]">Scheduled Date:</span>
                        <span className="font-bold text-spoon-dark">
                          📅 {new Date(selectedOrder.delivery_date + "T00:00:00").toLocaleDateString("en-IN", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                    {selectedOrder.delivery_time_slot && (
                      <div>
                        <span className="text-spoon-muted block text-[11px]">Time Window:</span>
                        <span className="font-bold text-spoon-caramel">
                          ⏰ {selectedOrder.delivery_time_slot}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {selectedOrder.delivery_address && (
                  <div className="pt-2 border-t border-spoon-border/60">
                    <span className="text-spoon-muted block text-[11px]">Delivery Address:</span>
                    <span className="font-medium text-spoon-dark block mt-0.5">
                      {selectedOrder.delivery_address}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer: PDF Download */}
            <div className="p-4 sm:p-5 border-t border-spoon-border bg-[#FFFDF9] flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => handleDownloadReceipt(selectedOrder)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-spoon-dark hover:bg-spoon-dark/90 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Download PDF Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
