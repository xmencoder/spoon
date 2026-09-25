"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/lib/admin/AdminContext";
import {
  getAdminOrders,
  updateAdminOrderStatus,
} from "@/lib/admin/admin-service";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderItem, OrderStatus } from "@/types/database";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
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
  preparing: {
    label: "Preparing in Kitchen",
    bg: "bg-purple-50",
    text: "text-purple-800 border-purple-200",
    dot: "bg-purple-500",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    bg: "bg-indigo-50",
    text: "text-indigo-800 border-indigo-200",
    dot: "bg-indigo-500",
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

export default function AdminOrdersPage() {
  const { restaurant } = useAdmin();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
      setOrders(data);
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

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setUpdatingId(orderId);
      setErrorMsg(null);
      await updateAdminOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      setSuccessMsg(`Order status updated to ${STATUS_CONFIG[newStatus].label}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      console.error("Status update error:", err);
      setErrorMsg("Failed to update status");
    } finally {
      setUpdatingId(null);
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

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === "all") return true;
    return o.status === statusFilter;
  });

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
            Order Records
          </h1>
          <p className="text-xs text-spoon-muted mt-0.5">
            Monitor incoming customer requests initiated via WhatsApp click-to-chat.
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

      {/* Status Messages */}
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

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {["all", "pending", "confirmed", "preparing", "out_for_delivery", "completed", "cancelled"].map(
          (st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold capitalize transition-colors ${
                statusFilter === st
                  ? "bg-spoon-dark text-white shadow-xs"
                  : "bg-white text-spoon-muted border border-spoon-border hover:bg-spoon-sand/50"
              }`}
            >
              {st === "all" ? "All Orders" : st.replace("_", " ")}
              <span className="ml-1.5 opacity-60 text-[10px]">
                (
                {st === "all"
                  ? orders.length
                  : orders.filter((o) => o.status === st).length}
                )
              </span>
            </button>
          )
        )}
      </div>

      {/* Orders Table */}
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
              {statusFilter !== "all"
                ? `No orders currently match status "${statusFilter}".`
                : "Customer orders placed through the website will appear here in real time."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-spoon-dark">
              <thead className="border-b border-spoon-border bg-spoon-sand/30 font-bold uppercase tracking-wider text-spoon-muted text-[10px]">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Fulfillment</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Status & Action</th>
                  <th className="px-6 py-4 text-right">Placed At</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-spoon-border/60">
                {filteredOrders.map((order) => {
                  const statusInfo =
                    STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const isUpdating = updatingId === order.id;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-spoon-sand/15 transition-colors group"
                    >
                      {/* Order ID */}
                      <td className="px-6 py-4 font-mono font-bold text-xs text-spoon-dark">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>

                      {/* Customer */}
                      <td className="px-6 py-4">
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
                          <span>{order.customer_phone}</span>
                        </a>
                      </td>

                      {/* Fulfillment */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-spoon-sand/80 border border-spoon-border/70 px-2.5 py-1 text-[11px] font-semibold text-spoon-dark capitalize">
                            {order.order_type === "delivery" ? (
                              <Truck className="h-3 w-3 text-spoon-caramel" />
                            ) : (
                              <ShoppingBag className="h-3 w-3 text-spoon-caramel" />
                            )}
                            <span>{order.order_type}</span>
                          </span>

                          {order.order_type === "delivery" && (order.delivery_date || order.delivery_time_slot) && (
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

                      {/* Total */}
                      <td className="px-6 py-4 font-bold text-sm text-spoon-dark">
                        {formatPrice(order.total)}
                      </td>

                      {/* Status Selector */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={order.status}
                            disabled={isUpdating}
                            onChange={(e) =>
                              handleStatusChange(
                                order.id,
                                e.target.value as OrderStatus
                              )
                            }
                            className={`rounded-xl border px-3 py-1.5 text-xs font-bold capitalize focus:outline-none ${statusInfo.bg} ${statusInfo.text}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="preparing">Preparing</option>
                            <option value="out_for_delivery">Out for Delivery</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          {isUpdating && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-spoon-caramel" />
                          )}
                        </div>
                      </td>

                      {/* Time */}
                      <td className="px-6 py-4 text-right text-spoon-muted whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 text-[11px]">
                          <Clock className="h-3 w-3" />
                          <span>{formatOrderTime(order.created_at)}</span>
                        </div>
                      </td>

                      {/* Action / View */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openOrderDetails(order)}
                          className="inline-flex items-center gap-1 rounded-xl bg-spoon-sand/70 hover:bg-spoon-sand px-3 py-1.5 text-xs font-bold text-spoon-dark transition-colors border border-spoon-border/60"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
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

      {/* Order Details Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl border border-spoon-border bg-white p-6 shadow-warm-lg space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-spoon-border/60">
              <div>
                <span className="font-mono text-xs font-bold text-spoon-muted block">
                  ORDER #{selectedOrder.id.slice(0, 8).toUpperCase()}
                </span>
                <h3 className="font-serif text-xl font-bold text-spoon-dark">
                  Order Summary
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-spoon-sand text-spoon-dark hover:bg-spoon-border transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
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
                  <span>{selectedOrder.customer_phone}</span>
                </a>
              </div>
              {selectedOrder.delivery_address && (
                <div className="flex justify-between items-start pt-1">
                  <span className="text-spoon-muted font-semibold">Address:</span>
                  <span className="font-medium text-spoon-dark text-right max-w-xs">
                    {selectedOrder.delivery_address}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1">
                <span className="text-spoon-muted font-semibold">Order Type:</span>
                <span className="capitalize font-bold text-spoon-dark">
                  {selectedOrder.order_type}
                </span>
              </div>

              {selectedOrder.order_type === "delivery" && selectedOrder.delivery_date && (
                <div className="flex justify-between items-center pt-1 border-t border-spoon-border/60">
                  <span className="text-spoon-muted font-semibold">Delivery Date:</span>
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

              {selectedOrder.order_type === "delivery" && selectedOrder.delivery_time_slot && (
                <div className="flex justify-between items-center">
                  <span className="text-spoon-muted font-semibold">Time Window:</span>
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
                  Order was initiated via WhatsApp link without individual item line details.
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

            {/* Bill Calculation */}
            <div className="rounded-2xl border border-spoon-border bg-white p-4 space-y-2 text-xs">
              <div className="flex justify-between text-spoon-muted">
                <span>Subtotal</span>
                <span>{formatPrice(selectedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-spoon-muted">
                <span>Delivery Charge</span>
                <span>{formatPrice(selectedOrder.delivery_charge)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-spoon-dark pt-2 border-t border-spoon-border/60">
                <span>Total Amount</span>
                <span>{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>

            {/* Status Update Control */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold text-spoon-dark">
                Update Status:
              </span>
              <select
                value={selectedOrder.status}
                onChange={(e) =>
                  handleStatusChange(
                    selectedOrder.id,
                    e.target.value as OrderStatus
                  )
                }
                className="rounded-xl border border-spoon-border bg-spoon-sand/40 px-3 py-1.5 text-xs font-bold text-spoon-dark focus:outline-none"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="preparing">Preparing</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
