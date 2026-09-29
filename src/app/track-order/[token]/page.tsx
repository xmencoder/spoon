"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { formatPrice } from "@/lib/utils";
import type { Order, OrderItem, OrderStatus, OrderStatusHistory } from "@/types/database";
import {
  CheckCircle2,
  Clock,
  Truck,
  ShoppingBag,
  Sparkles,
  Utensils,
  MapPin,
  Phone,
  Calendar,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { generateOrderReceiptPdf } from "@/lib/pdf-generator";

interface TrackingData {
  order: Order;
  items: OrderItem[];
  history: OrderStatusHistory[];
  adminApprovalUrl?: string | null;
}

interface StepConfig {
  key: OrderStatus;
  label: string;
  sublabel: string;
  icon: any;
}

const DELIVERY_STEPS: StepConfig[] = [
  {
    key: "confirmed",
    label: "Order Confirmed",
    sublabel: "Payment verified successfully",
    icon: CheckCircle2,
  },
  {
    key: "received_in_kitchen",
    label: "Received in Kitchen",
    sublabel: "Ingredients gathered & recipe prepped",
    icon: Utensils,
  },
  {
    key: "baking",
    label: "Baking & Handcrafting",
    sublabel: "Freshly baking in our artisanal oven",
    icon: Sparkles,
  },
  {
    key: "ready",
    label: "Quality Checked & Packed",
    sublabel: "Sealed with signature ribbon & care",
    icon: ShoppingBag,
  },
  {
    key: "out_for_delivery",
    label: "Out for Delivery",
    sublabel: "On the way to your doorstep",
    icon: Truck,
  },
  {
    key: "delivered",
    label: "Delivered",
    sublabel: "Enjoy every fresh bite!",
    icon: CheckCircle2,
  },
];

const TAKEAWAY_STEPS: StepConfig[] = [
  {
    key: "confirmed",
    label: "Order Confirmed",
    sublabel: "Payment verified successfully",
    icon: CheckCircle2,
  },
  {
    key: "received_in_kitchen",
    label: "Received in Kitchen",
    sublabel: "Kitchen team has queued your order",
    icon: Utensils,
  },
  {
    key: "baking",
    label: "Baking & Handcrafting",
    sublabel: "Freshly preparing your artisan treats",
    icon: Sparkles,
  },
  {
    key: "ready_for_pickup",
    label: "Ready for Pickup",
    sublabel: "Packed & waiting at the bakery counter",
    icon: ShoppingBag,
  },
  {
    key: "completed",
    label: "Picked Up",
    sublabel: "Order completed. Thank you!",
    icon: CheckCircle2,
  },
];

export default function OrderTrackingPage() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const fetchTracking = useCallback(
    async (isBackground = false) => {
      if (!token) return;
      try {
        if (!isBackground) setLoading(true);
        else setIsRefreshing(true);

        const res = await fetch(`/api/track-order/${encodeURIComponent(token)}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Order not found");
        }
        const result: TrackingData = await res.json();
        setData(result);
        setErrorMsg(null);
      } catch (err: any) {
        if (!data) {
          setErrorMsg(err.message || "Failed to load order tracking details.");
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, data]
  );

  useEffect(() => {
    fetchTracking();
  }, [token]);

  // Periodic polling every 12 seconds while order is active
  useEffect(() => {
    if (!data) return;
    const terminalStatuses: OrderStatus[] = ["delivered", "completed", "cancelled"];
    if (terminalStatuses.includes(data.order.status)) {
      return; // Stop polling once delivered/completed
    }

    const interval = setInterval(() => {
      fetchTracking(true);
    }, 12000);

    return () => clearInterval(interval);
  }, [data, fetchTracking]);

  const order = data?.order;
  const items = data?.items || [];
  const history = data?.history || [];

  const isDelivery = order?.order_type === "delivery";
  const steps = isDelivery ? DELIVERY_STEPS : TAKEAWAY_STEPS;

  // Compute status index
  const currentStepIndex = useMemo(() => {
    if (!order) return 0;
    if (order.status === "payment_verification_pending" || order.status === "pending") {
      return -1;
    }
    const idx = steps.findIndex((s) => s.key === order.status);
    if (idx !== -1) return idx;
    if (order.status === "completed" && isDelivery) return steps.length - 1;
    return 0;
  }, [order, steps, isDelivery]);

  const historyTimeMap = useMemo(() => {
    const map: Record<string, string> = {};
    history.forEach((h) => {
      const date = new Date(h.created_at);
      map[h.status] = date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    });
    return map;
  }, [history]);

  const handleDownloadPdf = () => {
    if (!order) return;
    try {
      setDownloadingPdf(true);
      const trackingUrl = typeof window !== "undefined" ? window.location.href : "";
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
        items: items.map((i) => ({
          name: i.product_name,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          subtotal: i.subtotal,
        })),
        subtotal: order.subtotal,
        deliveryCharge: order.delivery_charge,
        total: order.total,
        paymentMethod: "UPI",
        paymentStatus: order.payment_status.toUpperCase(),
        paymentVerifiedAt: order.payment_verified_at,
        trackingUrl,
        bakeryName: "The Indulgent Spoon",
        bakeryPhone: "+91 9691639268",
        bakeryAddress: "The Indulgent Spoon, DLF Phase 4, Gurugram",
      });

      pdf.save(`Receipt-${order.order_number || order.id.slice(0, 8)}.pdf`);
    } catch (e) {
      console.error("PDF generation failed:", e);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#D9BC9E] flex flex-col items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-[#C26B59]" />
        <p className="mt-3 text-xs font-bold text-[#29251F]">Loading live order status...</p>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="min-h-screen bg-[#D9BC9E] font-sans text-[#29251F]">
        <Header cartCount={0} />
        <main className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#F5EBDD] border border-[#91885D]/30 flex items-center justify-center mx-auto text-[#A95145]">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="font-serif font-bold text-2xl text-[#29251F]">Order Not Found</h1>
          <p className="text-xs text-[#696053]">{errorMsg || "Invalid tracking link or expired session."}</p>
          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl bg-[#C26B59] hover:bg-[#A95145] text-[#F5EBDD] px-6 py-3 text-xs font-bold shadow-md transition-colors"
            >
              Return to Bakery
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const orderNum = order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`;
  const dateFormatted = order.delivery_date
    ? new Date(order.delivery_date + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "Scheduled";

  return (
    <div className="min-h-screen bg-[#D9BC9E] font-sans text-[#29251F]">
      <Header cartCount={0} />

      <main className="max-w-lg mx-auto px-4 py-6 pb-28 pt-16 sm:pt-20 md:pt-24 space-y-5">
        {/* Top Tracking Card */}
        <div className="rounded-3xl border border-[#91885D]/35 bg-[#FAF6EF] shadow-warm-lg p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#91885D]/20 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#696053] block">
                Track Order
              </span>
              <h1 className="font-mono text-lg font-black text-[#A34B3D]">{orderNum}</h1>
            </div>

            <button
              onClick={() => fetchTracking(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#91885D]/30 bg-[#F5EBDD] text-xs font-bold text-[#29251F] hover:bg-[#E8D5BC] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#C26B59]" : "text-[#696053]"}`} />
              <span>{isRefreshing ? "Updating..." : "Refresh"}</span>
            </button>
          </div>

          {/* Current Status Highlight Banner */}
          <div className="rounded-2xl bg-[#634832] text-[#F5EBDD] p-4 sm:p-5 text-center space-y-2 shadow-sm">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8D5BC]">
              <Sparkles className="w-3.5 h-3.5 text-[#E8D5BC]" />
              <span>Current Status</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-wide text-white">
              {order.status === "payment_verification_pending"
                ? "⏳ Order Processing — Verification Pending"
                : order.status === "confirmed"
                ? "✓ Order Confirmed"
                : order.status === "received_in_kitchen"
                ? "Received in Kitchen"
                : order.status === "baking"
                ? "🍰 Freshly Baking in Oven"
                : order.status === "ready"
                ? "✓ Packed & Ready"
                : order.status === "ready_for_pickup"
                ? "🛍️ Ready for Pickup at Bakery"
                : order.status === "out_for_delivery"
                ? "🚚 Out for Delivery"
                : order.status === "delivered"
                ? "🎉 Order Delivered"
                : order.status === "completed"
                ? "✓ Order Completed"
                : "Order Processing"}
            </h2>
            <p className="text-xs text-[#E8D5BC]/90 font-medium">
              {order.status === "payment_verification_pending"
                ? "We received your payment submission. The bakery team is verifying the transaction."
                : `Estimated: ${dateFormatted} (${order.delivery_time_slot || "Scheduled window"})`}
            </p>
          </div>

          {/* Pending verification alert banner */}
          {order.status === "payment_verification_pending" && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-950">Waiting for Bakery Payment Verification</p>
                  <p className="text-amber-800 text-[11.5px] leading-relaxed">
                    Our bakery manager (+91 9691639268) has been notified. As soon as payment is confirmed, this page will automatically update to <strong>Order Confirmed</strong> and start baking!
                  </p>
                </div>
              </div>
              <a
                href={`https://wa.me/919691639268?text=${encodeURIComponent(
                  `🍰 *PAYMENT VERIFICATION REQUEST*\n` +
                  `━━━━━━━━━━━━━━\n` +
                  `*Order:* ${orderNum}\n` +
                  `*Customer:* ${order.customer_name}\n` +
                  `*Phone:* +91 ${order.customer_phone}\n` +
                  `*Amount Paid:* ₹${order.total} (UPI)\n` +
                  `*Fulfillment:* ${isDelivery ? "🚚 Delivery" : "🛍️ Store Pickup"}\n` +
                  `*Scheduled:* ${dateFormatted} (${order.delivery_time_slot || "Scheduled"})\n` +
                  `━━━━━━━━━━━━━━\n` +
                  (data?.adminApprovalUrl
                    ? `*ADMIN 1-CLICK APPROVAL:*\n✅ *Approve Payment:*\n${data.adminApprovalUrl}\n\n`
                    : "") +
                  `_Please confirm my order._`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white py-2.5 text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <span>💬 Ping Bakery on WhatsApp (+91 9691639268)</span>
              </a>
            </div>
          )}

          {/* Fulfillment details chip */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-[#F5EBDD] p-3 border border-[#91885D]/25">
              <span className="text-[10px] font-bold uppercase text-[#696053] block">Fulfillment</span>
              <p className="font-bold text-[#29251F] flex items-center gap-1 mt-0.5">
                {isDelivery ? <Truck className="w-3.5 h-3.5 text-[#C26B59]" /> : <ShoppingBag className="w-3.5 h-3.5 text-[#C26B59]" />}
                <span>{isDelivery ? "Home Delivery" : "Takeaway / Pickup"}</span>
              </p>
            </div>

            <div className="rounded-xl bg-[#F5EBDD] p-3 border border-[#91885D]/25">
              <span className="text-[10px] font-bold uppercase text-[#696053] block">Scheduled Window</span>
              <p className="font-bold text-[#29251F] flex items-center gap-1 mt-0.5 truncate">
                <Clock className="w-3.5 h-3.5 text-[#C26B59] shrink-0" />
                <span className="truncate">{order.delivery_time_slot || dateFormatted}</span>
              </p>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ── VISUAL STATUS TIMELINE ── */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="pt-2">
            <h3 className="font-serif font-bold text-sm text-[#29251F] mb-4 flex items-center gap-1.5">
              <span>Kitchen &amp; Fulfillment Timeline</span>
            </h3>

            <div className="relative pl-6 space-y-6">
              {/* Vertical connecting line */}
              <div className="absolute top-3 bottom-3 left-2.75 w-0.5 bg-[#91885D]/25" />

              {steps.map((step, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isActive = idx === currentStepIndex;
                const isUpcoming = idx > currentStepIndex;
                const StepIcon = step.icon;
                const stepTime = historyTimeMap[step.key];

                return (
                  <div key={step.key} className="relative flex items-start gap-3.5 group">
                    {/* Circle Node */}
                    <div
                      className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all ${
                        isCompleted
                          ? "bg-[#4D7C47] text-white ring-4 ring-[#4D7C47]/20"
                          : isActive
                          ? "bg-[#C26B59] text-white ring-4 ring-[#C26B59]/30 animate-pulse scale-110"
                          : "bg-[#E8D5BC] text-[#696053] border border-[#91885D]/40"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <StepIcon className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Step Details */}
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          className={`text-xs font-bold ${
                            isActive
                              ? "text-[#C26B59] text-[13px]"
                              : isCompleted
                              ? "text-[#29251F]"
                              : "text-[#696053]/70"
                          }`}
                        >
                          {step.label}
                        </h4>
                        {stepTime && (
                          <span className="text-[10px] font-bold text-[#696053] bg-[#E8D5BC]/60 px-1.5 py-0.5 rounded-md">
                            {stepTime}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] ${isActive ? "text-[#54483B] font-medium" : "text-[#696053]/80"}`}>
                        {step.sublabel}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Collapsible Order Items Snapshot */}
          <div className="border-t border-[#91885D]/20 pt-3">
            <button
              onClick={() => setShowItems(!showItems)}
              className="w-full flex items-center justify-between py-2 text-xs font-bold text-[#29251F] hover:text-[#C26B59] transition-colors cursor-pointer"
            >
              <span>Dishes in this Order ({items.length})</span>
              {showItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showItems && (
              <div className="space-y-2 pt-2 animate-in fade-in">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-xs bg-[#F5EBDD]/60 p-2.5 rounded-xl border border-[#91885D]/20">
                    <div>
                      <span className="font-bold text-[#29251F]">{item.product_name}</span>
                      <span className="text-[#696053] ml-1.5 font-normal">× {item.quantity}</span>
                    </div>
                    <span className="font-bold text-[#29251F]">{formatPrice(item.subtotal)}</span>
                  </div>
                ))}

                <div className="flex justify-between items-center text-xs font-bold pt-1 text-[#29251F]">
                  <span>Total Paid (UPI):</span>
                  <span className="text-sm text-[#A34B3D]">{formatPrice(order.total)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions: Download PDF Receipt */}
          <div className="pt-2 border-t border-[#91885D]/20">
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#634832] hover:bg-[#523B28] text-[#F5EBDD] py-3 text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>{downloadingPdf ? "Generating PDF..." : "Download Official PDF Receipt"}</span>
            </button>
          </div>
        </div>

        {/* Bakery Help Card */}
        <div className="rounded-2xl bg-[#E8D5BC] border border-[#91885D]/30 p-4 text-xs text-[#29251F] space-y-2">
          <p className="font-bold">Need assistance with this order?</p>
          <p className="text-[#54483B] text-[11.5px]">
            Reach our bakery kitchen team directly on WhatsApp or call at{" "}
            <a href="tel:+919691639268" className="font-bold text-[#C26B59] underline">
              +91 9691639268
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
