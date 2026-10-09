"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAdmin } from "@/lib/admin/AdminContext";
import { getAdminOrders } from "@/lib/admin/admin-service";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderItem, OrderStatus } from "@/types/database";
import { formatPrice } from "@/lib/utils";
import { advanceOrderStatusServerAction } from "./actions";
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

// ─── Status Configurations ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; dot: string; progress: number }
> = {
  payment_verification_pending: {
    label: "Payment Verified",
    bg: "bg-blue-50",
    text: "text-blue-800 border-blue-200",
    dot: "bg-blue-500",
    progress: 25,
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
    progress: 35,
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
      const data = await getAdminOrders(restaurant.id);
      setOrders(data as Order[]);
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

      setSuccessMsg(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error("Status update error:", err);
      setErrorMsg(err.message || "Failed to update status");
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
      const supabase = createClient();
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);

      if (error) throw error;
      setOrderItems((data as OrderItem[]) || []);
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
        bakeryPhone: restaurant?.phone || "+91 9691639268",
        bakeryAddress: restaurant?.address || "The Indulgent Spoon, DLF Phase 4, Gurugram",
      });

      pdfDoc.save(`Receipt-${orderNum.replace("#", "")}.pdf`);
    } catch (err) {
      console.error("Receipt generation error:", err);
    }
  };

  // ONLY SHOW PAID ORDERS: Filter out unpaid/unverified orders
  const paidOrders = useMemo(() => {
    return orders.filter(isOrderPaid);
  }, [orders]);

  // Filtered Paid Orders based on user search & status/fulfillment filter
  const filteredOrders = useMemo(() => {
    return paidOrders.filter((order) => {
      // 1. Search Query
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

      // 2. Fulfillment
      if (fulfillmentFilter !== "all" && order.order_type !== fulfillmentFilter) {
        return false;
      }

      // 3. Order Status
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [paidOrders, searchQuery, fulfillmentFilter, statusFilter]);

  // KPI Metrics (Calculated on Paid Orders)
  const metrics = useMemo(() => {
    const total = paidOrders.length;
    const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const inKitchen = paidOrders.filter(
      (o) => o.status === "received_in_kitchen" || o.status === "baking"
    ).length;
    const readyOrDelivering = paidOrders.filter(
      (o) =>
        o.status === "ready" ||
        o.status === "ready_for_pickup" ||
        o.status === "out_for_delivery"
    ).length;
    const completed = paidOrders.filter(
      (o) => o.status === "delivered" || o.status === "completed"
    ).length;
    return { total, totalRevenue, inKitchen, readyOrDelivering, completed };
  }, [paidOrders]);

  return (
    <div className="max-w-7xl space-y-6">
      {/* ── HEADER & REFRESH ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-spoon-border/60">
        <div>
          <h1 className="font-serif text-3xl font-bold text-spoon-dark flex items-center gap-2.5">
            <span>Orders</span>
            <span className="text-xs font-sans font-bold bg-emerald-100 border border-emerald-300 text-emerald-800 px-3 py-0.5 rounded-full">
              {filteredOrders.length} Paid {filteredOrders.length === 1 ? "Order" : "Orders"}
            </span>
          </h1>
          <p className="text-xs text-spoon-muted mt-1">
            Showing only paid orders verified automatically via Razorpay.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-spoon-border bg-white text-xs font-bold text-spoon-dark hover:bg-spoon-sand transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Orders</span>
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
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
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
            Paid Orders
          </span>
          <span className="font-serif text-xl sm:text-2xl font-bold text-spoon-dark block mt-0.5">
            {metrics.total}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-spoon-border shadow-warm-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted block">
            Total Revenue
          </span>
          <span className="font-serif text-xl sm:text-2xl font-bold text-emerald-700 block mt-0.5">
            {formatPrice(metrics.totalRevenue)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-spoon-border shadow-warm-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted block">
            In Kitchen / Baking
          </span>
          <span className="font-serif text-xl sm:text-2xl font-bold text-purple-700 block mt-0.5">
            {metrics.inKitchen}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-spoon-border shadow-warm-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted block">
            Ready / Out For Delivery
          </span>
          <span className="font-serif text-xl sm:text-2xl font-bold text-indigo-700 block mt-0.5">
            {metrics.readyOrDelivering}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-white border border-spoon-border shadow-warm-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted block">
            Completed / Delivered
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
              placeholder="Search paid orders by Order #, Customer Name, Phone, or Delivery Address..."
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
              <option value="all">Kitchen Status: All</option>
              <option value="confirmed">✓ Confirmed</option>
              <option value="received_in_kitchen">👩‍🍳 In Kitchen</option>
              <option value="baking">🍰 Baking</option>
              <option value="ready">🔍 Quality Checked</option>
              <option value="out_for_delivery">🚚 Out for Delivery</option>
              <option value="delivered">🎉 Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
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

                      {/* 5. Payment via Razorpay (Auto-Verified) */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                            <span>Paid via Razorpay</span>
                          </span>

                          <span className="block text-[9.5px] text-spoon-muted">
                            Auto-verified online
                          </span>
                        </div>
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
              {/* ── SECTION 1: RAZORPAY PAYMENT (AUTOMATICALLY VERIFIED) ── */}
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
                      <CreditCard className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                        Payment Automatically Verified via Razorpay
                      </span>
                      <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Payment Completed ({formatPrice(selectedOrder.total)})</span>
                      </h4>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-200/80 text-emerald-900 border border-emerald-300 self-start sm:self-center">
                    <span>✓ PAID</span>
                  </span>
                </div>

                <div className="text-[11px] text-emerald-800/80 pt-1 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Gateway: <strong>Razorpay Online</strong></span>
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
                  <span>Status: <strong>Confirmed & Logged</strong></span>
                </div>
              </div>

              {/* ── SECTION 2: ORDER DISPATCH / OUT FOR DELIVERY ── */}
              <div className="p-4 rounded-2xl border border-spoon-border bg-[#FFFDF9] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted block">
                      Order Dispatch Status
                    </span>
                    <h4 className="font-serif font-bold text-base text-spoon-dark flex items-center gap-2 mt-0.5">
                      <span>{STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_CONFIG[selectedOrder.status]?.bg} ${STATUS_CONFIG[selectedOrder.status]?.text}`}>
                        {STATUS_CONFIG[selectedOrder.status]?.progress}% Complete
                      </span>
                    </h4>
                  </div>

                  {selectedOrder.status === "out_for_delivery" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                      <Truck className="w-3.5 h-3.5 text-indigo-700" />
                      <span>On The Way</span>
                    </span>
                  )}
                </div>

                {/* Visual Stepper */}
                <div className="w-full bg-spoon-sand/60 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-spoon-caramel h-full transition-all duration-300"
                    style={{ width: `${STATUS_CONFIG[selectedOrder.status]?.progress || 35}%` }}
                  />
                </div>

                {/* Only Option: Out for Delivery */}
                <div className="pt-1">
                  <button
                    type="button"
                    disabled={actionInProgressId === selectedOrder.id}
                    onClick={() => handleAdvanceStatus(selectedOrder.id, "out_for_delivery")}
                    className={`w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs ${
                      selectedOrder.status === "out_for_delivery"
                        ? "bg-indigo-700 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400/40"
                        : "bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200 active:scale-[0.99]"
                    }`}
                  >
                    <Truck className={`w-4 h-4 ${selectedOrder.status === "out_for_delivery" ? "text-white" : "text-indigo-700"}`} />
                    <span>
                      {selectedOrder.status === "out_for_delivery"
                        ? "✓ Order is Out for Delivery"
                        : "🚚 Out for Delivery"}
                    </span>
                  </button>
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
                    {orderItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3.5 text-xs hover:bg-spoon-sand/15 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-spoon-dark text-sm block">
                            {item.product_name}
                          </span>
                          <span className="text-spoon-muted text-[11px] block">
                            Qty: <strong className="text-spoon-caramel">{item.quantity}</strong> × {formatPrice(item.unit_price)}
                          </span>
                        </div>
                        <span className="font-bold text-spoon-dark text-sm">
                          {formatPrice(item.subtotal)}
                        </span>
                      </div>
                    ))}
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
