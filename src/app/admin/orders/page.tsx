"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAdmin } from "@/lib/admin/AdminContext";
import { getAdminOrders } from "@/lib/admin/admin-service";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderItem, OrderStatus, PaymentStatus } from "@/types/database";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  approveOrderPaymentServerAction,
  rejectOrderPaymentServerAction,
  advanceOrderStatusServerAction,
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
  Eye,
  X,
  Phone,
  MapPin,
  Calendar,
  Search,
  Check,
  CreditCard,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  FileText,
  Filter,
} from "lucide-react";
import { generateOrderReceiptPdf } from "@/lib/pdf-generator";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  payment_verification_pending: {
    label: "Payment Verification Pending",
    bg: "bg-amber-50",
    text: "text-amber-800 border-amber-300",
    dot: "bg-amber-500",
  },
  pending: {
    label: "Pending",
    bg: "bg-amber-50",
    text: "text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  confirmed: {
    label: "Confirmed",
    bg: "bg-blue-50",
    text: "text-blue-800 border-blue-200",
    dot: "bg-blue-500",
  },
  received_in_kitchen: {
    label: "Received in Kitchen",
    bg: "bg-purple-50",
    text: "text-purple-800 border-purple-200",
    dot: "bg-purple-500",
  },
  baking: {
    label: "Baking & Handcrafting",
    bg: "bg-orange-50",
    text: "text-orange-800 border-orange-200",
    dot: "bg-orange-500",
  },
  ready: {
    label: "Quality Checked & Ready",
    bg: "bg-teal-50",
    text: "text-teal-800 border-teal-200",
    dot: "bg-teal-500",
  },
  ready_for_pickup: {
    label: "Ready for Pickup",
    bg: "bg-emerald-50",
    text: "text-emerald-800 border-emerald-300",
    dot: "bg-emerald-600",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    bg: "bg-indigo-50",
    text: "text-indigo-800 border-indigo-200",
    dot: "bg-indigo-500",
  },
  delivered: {
    label: "Delivered",
    bg: "bg-emerald-50",
    text: "text-emerald-800 border-emerald-200",
    dot: "bg-emerald-600",
  },
  completed: {
    label: "Completed",
    bg: "bg-emerald-50",
    text: "text-emerald-800 border-emerald-200",
    dot: "bg-emerald-600",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-rose-50",
    text: "text-rose-800 border-rose-200",
    dot: "bg-rose-500",
  },
};

const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; bg: string; text: string }
> = {
  unpaid: {
    label: "Unpaid",
    bg: "bg-gray-100",
    text: "text-gray-700 border-gray-200",
  },
  verification_pending: {
    label: "Verification Pending (I PAID)",
    bg: "bg-amber-100",
    text: "text-amber-900 border-amber-300",
  },
  verified: {
    label: "✓ Verified / Paid",
    bg: "bg-emerald-100",
    text: "text-emerald-900 border-emerald-300",
  },
  not_received: {
    label: "❌ Money Not Received",
    bg: "bg-rose-100",
    text: "text-rose-900 border-rose-300",
  },
  refunded: {
    label: "Refunded",
    bg: "bg-purple-100",
    text: "text-purple-900 border-purple-300",
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
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

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

  // Payment Verification Actions
  const handleApprovePayment = async (orderId: string) => {
    try {
      setActionInProgressId(orderId);
      setErrorMsg(null);
      const res = await approveOrderPaymentServerAction(orderId);
      if (!res.success) throw new Error((res as any)?.error || "Failed to approve payment");

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                payment_status: "verified" as PaymentStatus,
                status: "confirmed" as OrderStatus,
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
                payment_status: "verified" as PaymentStatus,
                status: "confirmed" as OrderStatus,
                payment_verified_at: new Date().toISOString(),
                approval_source: "DASHBOARD",
              }
            : null
        );
      }

      const approvedOrderNum = (res as any)?.orderNumber || orderId.slice(0, 8);
      setSuccessMsg(`✓ Payment approved for Order #${approvedOrderNum}. Confirmation & PDF receipt dispatched.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Payment approval error:", err);
      setErrorMsg(err.message || "Failed to approve payment");
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleRejectPayment = async (orderId: string) => {
    const reason = prompt("Enter rejection reason (optional):", "Payment not reflected in bank account");
    if (reason === null) return; // User cancelled prompt

    try {
      setActionInProgressId(orderId);
      setErrorMsg(null);
      const res = await rejectOrderPaymentServerAction(orderId, reason);
      if (!res.success) throw new Error((res as any)?.error || "Failed to reject payment");

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                payment_status: "not_received" as PaymentStatus,
                status: "pending" as OrderStatus,
              }
            : o
        )
      );

      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                payment_status: "not_received" as PaymentStatus,
                status: "pending" as OrderStatus,
              }
            : null
        );
      }

      setSuccessMsg("Payment marked as Not Received. Customer notified.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Payment rejection error:", err);
      setErrorMsg(err.message || "Failed to reject payment");
    } finally {
      setActionInProgressId(null);
    }
  };

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
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error("Status update error:", err);
      setErrorMsg(err.message || "Failed to update status");
    } finally {
      setActionInProgressId(null);
    }
  };

  const openOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
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

  const handleDownloadReceipt = (order: Order) => {
    try {
      const trackingUrl = `${window.location.origin}/track-order/${order.tracking_token}`;
      const pdf = generateOrderReceiptPdf({
        orderNumber: order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`,
        orderId: order.id,
        createdAt: order.created_at || new Date().toISOString(),
        orderType: order.order_type,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerEmail: order.customer_email,
        deliveryAddress: order.delivery_address,
        pickupLocation: order.pickup_location,
        deliveryDate: order.delivery_date,
        deliveryTimeSlot: order.delivery_time_slot,
        items: orderItems.map((i) => ({
          name: i.product_name,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          subtotal: i.subtotal,
        })),
        subtotal: order.subtotal,
        deliveryCharge: order.delivery_charge,
        total: order.total,
        paymentMethod: "UPI",
        paymentStatus: (order.payment_status || "UNPAID").toUpperCase(),
        paymentVerifiedAt: order.payment_verified_at,
        trackingUrl,
        bakeryName: "The Indulgent Spoon",
        bakeryPhone: "+91 9691639268",
        bakeryAddress: "The Indulgent Spoon, DLF Phase 4, Gurugram",
      });

      pdf.save(`Receipt-${order.order_number || order.id.slice(0, 8)}.pdf`);
    } catch (e) {
      console.error("PDF generation error:", e);
    }
  };

  // Pending verification cards
  const pendingVerificationOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.payment_status === "verification_pending" ||
        o.status === "payment_verification_pending"
    );
  }, [orders]);

  // Filtered orders for main table
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNum = (o.order_number || "").toLowerCase().includes(q);
        const matchesId = o.id.toLowerCase().includes(q);
        const matchesName = o.customer_name.toLowerCase().includes(q);
        const matchesPhone = o.customer_phone.toLowerCase().includes(q);
        if (!matchesNum && !matchesId && !matchesName && !matchesPhone) return false;
      }

      // Fulfillment
      if (fulfillmentFilter !== "all" && o.order_type !== fulfillmentFilter) {
        return false;
      }

      // Payment
      if (paymentFilter !== "all" && o.payment_status !== paymentFilter) {
        return false;
      }

      // Order Status
      if (statusFilter !== "all" && o.status !== statusFilter) {
        return false;
      }

      // Delivery Date
      if (dateFilter && o.delivery_date !== dateFilter) {
        return false;
      }

      return true;
    });
  }, [orders, searchQuery, fulfillmentFilter, paymentFilter, statusFilter, dateFilter]);

  const formatOrderTime = (iso?: string) => {
    if (!iso) return "N/A";
    const date = new Date(iso);
    return date.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-spoon-border/60">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-spoon-dark">
            Order &amp; Payment Management
          </h1>
          <p className="text-xs text-spoon-muted mt-0.5">
            Verify customer UPI payments, manage kitchen preparation pipeline, and track deliveries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            disabled={loading}
            className="gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-medium text-rose-900 animate-in fade-in">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-medium text-emerald-900 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── 1. PROMINENT PAYMENT VERIFICATION SECTION (SECTION 8) ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {pendingVerificationOrders.length > 0 && (
        <div className="rounded-3xl border-2 border-amber-300 bg-amber-50/70 p-5 sm:p-6 space-y-4 shadow-warm-sm animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-200 text-amber-900 animate-pulse">
                🔔
              </span>
              <div>
                <h2 className="font-serif text-base sm:text-lg font-bold text-amber-950">
                  Payment Verification Required ({pendingVerificationOrders.length})
                </h2>
                <p className="text-[11px] text-amber-800/80">
                  Customers have clicked &ldquo;I PAID&rdquo;. Please verify your bank/UPI account before approving.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingVerificationOrders.map((order) => {
              const isProcessing = actionInProgressId === order.id;
              const orderNum = order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`;

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-amber-200/90 bg-white p-4.5 shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start border-b border-amber-100 pb-2.5">
                    <div>
                      <span className="font-mono text-xs font-black text-[#A34B3D] block">
                        Order #{orderNum}
                      </span>
                      <h4 className="font-serif font-bold text-sm text-spoon-dark">
                        {order.customer_name}
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="font-serif font-extrabold text-base text-[#A34B3D] block">
                        {formatPrice(order.total)}
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        UPI • I PAID
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-spoon-dark">
                    <div className="flex items-center gap-2 text-spoon-muted">
                      <Phone className="w-3.5 h-3.5 text-[#C26B59]" />
                      <span className="font-medium">+91 {order.customer_phone}</span>
                    </div>

                    <div className="flex items-center gap-2 text-spoon-muted">
                      {order.order_type === "delivery" ? (
                        <Truck className="w-3.5 h-3.5 text-[#C26B59]" />
                      ) : (
                        <ShoppingBag className="w-3.5 h-3.5 text-[#C26B59]" />
                      )}
                      <span className="font-medium capitalize">
                        {order.order_type === "delivery" ? "Home Delivery" : "Takeaway / Store Pickup"}
                      </span>
                      {order.delivery_date && (
                        <span className="text-[11px] text-spoon-dark font-bold">
                          • {new Date(order.delivery_date + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" })} ({order.delivery_time_slot || "Scheduled"})
                        </span>
                      )}
                    </div>

                    {order.payment_submitted_at && (
                      <p className="text-[10.5px] text-amber-900 font-semibold pt-0.5">
                        Submitted: {new Date(order.payment_submitted_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>

                  {/* Approve / Reject Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-100">
                    <button
                      onClick={() => handleApprovePayment(order.id)}
                      disabled={isProcessing}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-[#3e683f] hover:bg-[#325633] text-white py-2.5 px-3 text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                      <span>💰 MONEY RECEIVED</span>
                    </button>

                    <button
                      onClick={() => handleRejectPayment(order.id)}
                      disabled={isProcessing}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 py-2.5 px-3 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span>❌ NOT RECEIVED</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── 2. SEARCH & ADVANCED FILTERS ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="rounded-3xl border border-spoon-border bg-white p-4.5 shadow-warm-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-spoon-muted">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order #, Customer Name, or Phone..."
              className="w-full h-10 rounded-2xl border border-spoon-border bg-spoon-sand/20 pl-10 pr-4 text-xs text-spoon-dark placeholder:text-spoon-muted focus:outline-none focus:ring-2 focus:ring-spoon-caramel/30"
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

          {/* Fulfillment Filter */}
          <div className="flex items-center gap-2">
            <select
              value={fulfillmentFilter}
              onChange={(e) => setFulfillmentFilter(e.target.value as any)}
              className="h-10 rounded-2xl border border-spoon-border bg-spoon-sand/20 px-3 text-xs font-bold text-spoon-dark focus:outline-none cursor-pointer"
            >
              <option value="all">Fulfillment: All</option>
              <option value="delivery">🛵 Delivery</option>
              <option value="takeaway">🛍️ Takeaway / Pickup</option>
            </select>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-10 rounded-2xl border border-spoon-border bg-spoon-sand/20 px-3 text-xs font-bold text-spoon-dark focus:outline-none cursor-pointer"
            >
              <option value="all">Payment: All</option>
              <option value="verification_pending">⏳ Verification Pending</option>
              <option value="verified">✓ Verified / Paid</option>
              <option value="not_received">❌ Not Received</option>
              <option value="unpaid">Unpaid</option>
            </select>

            {/* Order Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-2xl border border-spoon-border bg-spoon-sand/20 px-3 text-xs font-bold text-spoon-dark focus:outline-none cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="confirmed">Confirmed</option>
              <option value="received_in_kitchen">Received in Kitchen</option>
              <option value="baking">Baking</option>
              <option value="ready">Ready (Delivery)</option>
              <option value="ready_for_pickup">Ready for Pickup</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── 3. ORDERS TABLE ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="overflow-hidden rounded-3xl border border-spoon-border bg-white shadow-warm-sm">
        {loading ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-spoon-caramel" />
            <span className="text-xs font-semibold text-spoon-muted">
              Loading order history...
            </span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-spoon-sand text-spoon-muted mb-3 border border-spoon-border">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <h3 className="font-serif text-lg font-bold text-spoon-dark">
              No orders found
            </h3>
            <p className="text-xs text-spoon-muted max-w-sm mt-1">
              No orders currently match the selected filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-spoon-dark">
              <thead className="border-b border-spoon-border bg-spoon-sand/30 font-bold uppercase tracking-wider text-spoon-muted text-[10px]">
                <tr>
                  <th className="px-5 py-4">Order #</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Fulfillment</th>
                  <th className="px-5 py-4">Payment</th>
                  <th className="px-5 py-4">Kitchen Status</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-spoon-border/60">
                {filteredOrders.map((order) => {
                  const statusInfo =
                    STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const paymentInfo =
                    PAYMENT_STATUS_CONFIG[order.payment_status] || PAYMENT_STATUS_CONFIG.unpaid;
                  const orderNum = order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-spoon-sand/15 transition-colors group"
                    >
                      {/* Order Number */}
                      <td className="px-5 py-4 font-mono font-bold text-xs text-[#A34B3D]">
                        #{orderNum}
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <span className="font-serif font-bold text-sm block text-spoon-dark">
                          {order.customer_name}
                        </span>
                        <a
                          href={`https://wa.me/${order.customer_phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline mt-0.5"
                        >
                          <MessageCircle className="h-3 w-3" />
                          <span>+91 {order.customer_phone}</span>
                        </a>
                      </td>

                      {/* Fulfillment */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-spoon-sand/80 border border-spoon-border/70 px-2.5 py-1 text-[11px] font-semibold text-spoon-dark capitalize">
                            {order.order_type === "delivery" ? (
                              <Truck className="h-3 w-3 text-spoon-caramel" />
                            ) : (
                              <ShoppingBag className="h-3 w-3 text-spoon-caramel" />
                            )}
                            <span>{order.order_type}</span>
                          </span>

                          {(order.delivery_date || order.delivery_time_slot) && (
                            <div className="text-[10px] font-semibold text-spoon-dark bg-spoon-sand/40 rounded-md px-2 py-0.5 border border-spoon-border/60 max-w-[160px]">
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

                      {/* Payment Status */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${paymentInfo.bg} ${paymentInfo.text}`}>
                          {paymentInfo.label}
                        </span>
                        {order.approval_source && (
                          <span className="block text-[9.5px] text-spoon-muted mt-0.5">
                            via {order.approval_source}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusInfo.bg} ${statusInfo.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>

                      {/* Total */}
                      <td className="px-5 py-4 font-bold text-sm text-spoon-dark">
                        {formatPrice(order.total)}
                      </td>

                      {/* Action / View */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {order.payment_status === "verification_pending" && (
                            <button
                              onClick={() => handleApprovePayment(order.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-[#3e683f] hover:bg-[#325633] text-white font-bold text-xs transition-colors cursor-pointer"
                              title="Approve Payment"
                            >
                              Approve
                            </button>
                          )}

                          <button
                            onClick={() => openOrderDetails(order)}
                            className="inline-flex items-center gap-1 rounded-xl bg-spoon-sand/70 hover:bg-spoon-sand px-3 py-1.5 text-xs font-bold text-spoon-dark transition-colors border border-spoon-border/60 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Manage</span>
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

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── 4. ORDER DETAILS & STATUS MANAGEMENT MODAL ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-3xl border border-spoon-border bg-white p-6 shadow-warm-lg space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-spoon-border/60">
              <div>
                <span className="font-mono text-xs font-bold text-[#A34B3D] block">
                  ORDER #{selectedOrder.order_number || selectedOrder.id.slice(0, 8).toUpperCase()}
                </span>
                <h3 className="font-serif text-xl font-bold text-spoon-dark">
                  Order Management
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-spoon-sand text-spoon-dark hover:bg-spoon-border transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Payment Status Card */}
            <div className={`p-4 rounded-2xl border ${selectedOrder.payment_status === "verified" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block">
                    Payment Verification Status
                  </span>
                  <h4 className="font-bold text-sm flex items-center gap-1.5 mt-0.5">
                    {selectedOrder.payment_status === "verified" ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>✓ PAYMENT VERIFIED</span>
                      </>
                    ) : selectedOrder.payment_status === "verification_pending" ? (
                      <>
                        <Clock className="w-4 h-4 text-amber-700" />
                        <span>VERIFICATION PENDING (I PAID)</span>
                      </>
                    ) : (
                      <span>{selectedOrder.payment_status?.toUpperCase() || "UNPAID"}</span>
                    )}
                  </h4>
                </div>

                <span className="font-serif font-bold text-base text-[#A34B3D]">
                  {formatPrice(selectedOrder.total)}
                </span>
              </div>

              {selectedOrder.payment_verified_at && (
                <p className="text-[11px] text-emerald-800 mt-1">
                  Approved by {selectedOrder.payment_verified_by || "Admin"} via {selectedOrder.approval_source || "Dashboard"} on{" "}
                  {new Date(selectedOrder.payment_verified_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}

              {/* Approve / Reject buttons if pending */}
              {selectedOrder.payment_status !== "verified" && (
                <div className="flex gap-2 pt-3 mt-2 border-t border-amber-200">
                  <button
                    onClick={() => handleApprovePayment(selectedOrder.id)}
                    className="flex-1 rounded-xl bg-[#3e683f] hover:bg-[#325633] text-white py-2 text-xs font-bold transition-colors cursor-pointer"
                  >
                    💰 Money Received (Approve)
                  </button>
                  <button
                    onClick={() => handleRejectPayment(selectedOrder.id)}
                    className="rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 px-3 py-2 text-xs font-bold transition-colors cursor-pointer"
                  >
                    ❌ Not Received
                  </button>
                </div>
              )}
            </div>

            {/* Customer Details Card */}
            <div className="rounded-2xl border border-spoon-border bg-spoon-cream/40 p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-spoon-muted font-semibold">Customer:</span>
                <span className="font-bold text-spoon-dark">
                  {selectedOrder.customer_name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-spoon-muted font-semibold">Phone:</span>
                <a
                  href={`https://wa.me/${selectedOrder.customer_phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>+91 {selectedOrder.customer_phone}</span>
                </a>
              </div>
              {selectedOrder.customer_email && (
                <div className="flex justify-between items-center">
                  <span className="text-spoon-muted font-semibold">Email:</span>
                  <span className="font-medium text-spoon-dark">{selectedOrder.customer_email}</span>
                </div>
              )}
              {selectedOrder.delivery_address && (
                <div className="flex justify-between items-start pt-1">
                  <span className="text-spoon-muted font-semibold">Delivery Address:</span>
                  <span className="font-medium text-spoon-dark text-right max-w-xs">
                    {selectedOrder.delivery_address}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1">
                <span className="text-spoon-muted font-semibold">Fulfillment Type:</span>
                <span className="capitalize font-bold text-spoon-dark">
                  {selectedOrder.order_type === "delivery" ? "Home Delivery" : "Takeaway / Store Pickup"}
                </span>
              </div>

              {selectedOrder.delivery_date && (
                <div className="flex justify-between items-center pt-1 border-t border-spoon-border/60">
                  <span className="text-spoon-muted font-semibold">
                    {selectedOrder.order_type === "delivery" ? "Delivery Date:" : "Pickup Date:"}
                  </span>
                  <span className="font-bold text-spoon-dark">
                    {new Date(selectedOrder.delivery_date + "T00:00:00").toLocaleDateString("en-IN", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}

              {selectedOrder.delivery_time_slot && (
                <div className="flex justify-between items-center">
                  <span className="text-spoon-muted font-semibold">
                    {selectedOrder.order_type === "delivery" ? "Delivery Window:" : "Pickup Window:"}
                  </span>
                  <span className="font-bold text-spoon-caramel">
                    ⏰ {selectedOrder.delivery_time_slot}
                  </span>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="space-y-3">
              <h4 className="font-serif font-bold text-sm text-spoon-dark">
                Dishes Ordered
              </h4>

              {loadingItems ? (
                <div className="flex h-20 items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-spoon-caramel" />
                  <span className="text-xs text-spoon-muted">
                    Loading order items...
                  </span>
                </div>
              ) : orderItems.length === 0 ? (
                <div className="p-4 rounded-xl border border-spoon-border bg-spoon-sand/20 text-center text-xs text-spoon-muted">
                  No separate line items found.
                </div>
              ) : (
                <div className="divide-y divide-spoon-border/60 border border-spoon-border rounded-2xl overflow-hidden">
                  {orderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-spoon-dark">
                          {item.product_name}
                        </span>
                        <span className="text-spoon-muted text-[11px] block">
                          Qty: {item.quantity} × {formatPrice(item.unit_price)}
                        </span>
                      </div>
                      <span className="font-bold text-spoon-dark">
                        {formatPrice(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* ── KITCHEN & FULFILLMENT STATUS STEPPER ── */}
            {/* ══════════════════════════════════════════════════════════ */}
            <div className="space-y-2 pt-2 border-t border-spoon-border/60">
              <span className="text-xs font-bold text-spoon-dark block">
                Update Order Status:
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { status: "received_in_kitchen" as OrderStatus, label: "👩‍🍳 Received in Kitchen" },
                  { status: "baking" as OrderStatus, label: "🍰 Baking in Oven" },
                  ...(selectedOrder.order_type === "delivery"
                    ? [
                        { status: "ready" as OrderStatus, label: "✓ Quality Checked" },
                        { status: "out_for_delivery" as OrderStatus, label: "🚚 Out for Delivery" },
                        { status: "delivered" as OrderStatus, label: "🎉 Delivered" },
                      ]
                    : [
                        { status: "ready_for_pickup" as OrderStatus, label: "🛍️ Ready for Pickup" },
                        { status: "completed" as OrderStatus, label: "✓ Completed" },
                      ]),
                ].map((item) => {
                  const isCurrent = selectedOrder.status === item.status;
                  return (
                    <button
                      key={item.status}
                      type="button"
                      onClick={() => handleAdvanceStatus(selectedOrder.id, item.status)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-spoon-dark text-white border-spoon-dark shadow-xs"
                          : "bg-spoon-sand/40 hover:bg-spoon-sand text-spoon-dark border-spoon-border/70"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions: Live Tracking Link & Download PDF Receipt */}
            <div className="flex gap-2 pt-3 border-t border-spoon-border/60">
              <a
                href={`/track-order/${selectedOrder.tracking_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-spoon-sand/70 hover:bg-spoon-sand border border-spoon-border py-2.5 text-xs font-bold text-spoon-dark transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Tracking Page</span>
              </a>

              <button
                type="button"
                onClick={() => handleDownloadReceipt(selectedOrder)}
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-spoon-dark hover:bg-spoon-dark/90 text-white px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
