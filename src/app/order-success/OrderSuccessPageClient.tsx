"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import {
  CheckCircle2,
  Printer,
  Share2,
  ArrowLeft,
  Utensils,
  Truck,
  ShoppingBag,
  MapPin,
  Phone,
  User,
  Mail,
  MessageCircle,
  ExternalLink,
  Clock,
  Sparkles,
  Gift,
  Tag,
  ShieldCheck,
  Calendar,
  Download,
  Navigation,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { generateOrderReceiptPdf } from "@/lib/pdf-generator";

interface ReceiptItem {
  id: string;
  name: string;
  image_url?: string | null;
  quantity: number;
  unitPrice: number;
  sizeLabel?: string;
  addons?: Array<{ id: string; label: string; price: number }>;
}

interface ReceiptData {
  orderId: string;
  createdAt: string;
  orderType: "delivery" | "takeaway";
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  alternatePhone?: string | null;
  deliveryAddress?: string | null;
  addressType?: "home" | "office" | "other" | null;
  deliveryDate?: string | null;
  deliveryTimeSlot?: string | null;
  distanceKm?: number | null;
  items: ReceiptItem[];
  subtotal: number;
  deliveryCharge: number;
  packagingFee: number;
  hasGiftNote?: boolean;
  giftNote?: string;
  giftNoteFee?: number;
  couponCode?: string | null;
  discountAmount?: number;
  total: number;
  whatsappUrl?: string;
  restaurantName?: string;
  restaurantPhone?: string;
  paymentStatus?: "PAID" | "PENDING" | string;
  paymentMethod?: string;
  trackingToken?: string;
}

function buildWhatsAppPingUrl(receipt: ReceiptData): string {
  const bakeryPhone = (receipt.restaurantPhone || "919717123510").replace(/\D/g, "");
  const targetPhone = bakeryPhone.startsWith("91") ? bakeryPhone : `91${bakeryPhone}`;

  let msg = `🧁 *New Order from The Indulgent Spoon* 🧁\n\n`;
  msg += `*Order ID:* #${receipt.orderId}\n`;
  msg += `*Customer:* ${receipt.customerName}\n`;
  msg += `*Phone:* ${receipt.customerPhone}\n`;
  if (receipt.customerEmail) {
    msg += `*Email:* ${receipt.customerEmail}\n`;
  }

  msg += `\n`;
  if (receipt.orderType === "takeaway") {
    msg += `🛍️ *Fulfilment:* Bakery Takeaway (Self Pickup)\n`;
    if (receipt.deliveryDate) msg += `🗓️ *Pickup Date:* ${receipt.deliveryDate}\n`;
    if (receipt.deliveryTimeSlot) msg += `⏰ *Pickup Slot:* ${receipt.deliveryTimeSlot}\n`;
    msg += `📍 *Pickup Address:* N 376, 2nd Floor, Mayfield Gardens, Sec 51, Gurgaon\n`;
  } else {
    msg += `📦 *Fulfilment:* Home Delivery\n`;
    if (receipt.deliveryDate) msg += `🗓️ *Delivery Date:* ${receipt.deliveryDate}\n`;
    if (receipt.deliveryTimeSlot) msg += `⏰ *Delivery Slot:* ${receipt.deliveryTimeSlot}\n`;
    if (receipt.deliveryAddress) {
      const typeTag = receipt.addressType ? ` (${receipt.addressType.toUpperCase()})` : "";
      msg += `📍 *Delivery Address${typeTag}:* ${receipt.deliveryAddress}\n`;
    }
  }

  msg += `\n🛍️ *Items Ordered:*\n`;
  for (const item of receipt.items) {
    const size = item.sizeLabel ? ` (${item.sizeLabel})` : "";
    msg += `• ${item.name}${size} × ${item.quantity} — ₹${item.unitPrice * item.quantity}\n`;
    if (item.addons && item.addons.length > 0) {
      msg += `   └ Add-ons: ${item.addons.map((a) => a.label).join(", ")}\n`;
    }
  }

  msg += `\n💰 *Total Paid:* ₹${receipt.total} (${receipt.paymentStatus === "PAID" ? "Paid Online via Razorpay/UPI" : "Payment Pending"})\n`;
  if (receipt.hasGiftNote && receipt.giftNote) {
    msg += `💌 *Gift Note:* "${receipt.giftNote}"\n`;
  }

  msg += `\n_Hi! I've just placed and paid for this order on your website. Please confirm my order. Thank you!_ ✨`;

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`;
}

export default function OrderSuccessReceiptPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "the-indulgent-spoon";
  const router = useRouter();

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored =
        sessionStorage.getItem(`receipt-${slug}`) ||
        sessionStorage.getItem("receipt-the-indulgent-spoon");
      if (stored) {
        setReceipt(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Error reading receipt data:", err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const BAKERY_PICKUP_ADDRESS = "N 376, 2nd Floor, Mayfield Gardens, Sec 51, Gurgaon 122018";
  const GOOGLE_MAPS_URL = "https://www.google.com/maps/search/?api=1&query=N+376%2C+2nd+Floor%2C+Mayfield+Gardens%2C+Sector+51%2C+Gurgaon+122018";

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(`The Indulgent Spoon, ${BAKERY_PICKUP_ADDRESS}`);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (e) {
      console.error("Failed to copy address:", e);
    }
  };

  const handleDownloadPdf = () => {
    if (!receipt) return;
    try {
      setDownloadingPdf(true);
      const pdf = generateOrderReceiptPdf({
        orderNumber: `#${receipt.orderId}`,
        orderId: receipt.orderId,
        createdAt: receipt.createdAt || new Date().toISOString(),
        orderType: receipt.orderType,
        customerName: receipt.customerName,
        customerPhone: receipt.customerPhone,
        customerEmail: receipt.customerEmail,
        deliveryAddress: receipt.deliveryAddress,
        deliveryDate: receipt.deliveryDate,
        deliveryTimeSlot: receipt.deliveryTimeSlot,
        items: receipt.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          sizeLabel: i.sizeLabel,
          addons: i.addons,
          subtotal: i.unitPrice * i.quantity,
        })),
        subtotal: receipt.subtotal,
        deliveryCharge: receipt.deliveryCharge,
        packagingFee: receipt.packagingFee,
        giftNoteFee: receipt.giftNoteFee,
        giftNote: receipt.giftNote,
        total: receipt.total,
        paymentMethod: receipt.paymentMethod || "Razorpay / Online",
        paymentStatus: (receipt.paymentStatus || "PAID").toUpperCase(),
        paymentVerifiedAt: new Date().toISOString(),
        bakeryName: receipt.restaurantName || "The Indulgent Spoon",
        bakeryPhone: receipt.restaurantPhone || "+91 9717123510",
        bakeryAddress: BAKERY_PICKUP_ADDRESS,
        pickupLocation: BAKERY_PICKUP_ADDRESS,
      });

      pdf.save(`Receipt-${receipt.orderId}.pdf`);
    } catch (e) {
      console.error("PDF generation failed:", e);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#D9BC9E] flex items-center justify-center p-4">
        <div className="bg-[#FAF5ED] border border-[#D9BC9E] rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
          <div className="relative mx-auto w-16 h-16 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-[#E8D5BC] border border-[#91885D]/30 flex items-center justify-center text-[#C26B59] shadow-inner">
              <Loader2 className="w-8 h-8 animate-spin text-[#C26B59]" />
            </div>
          </div>
          <h3 className="font-serif text-xl font-bold text-[#29251F] mb-1.5">
            Generating Your Receipt...
          </h3>
          <p className="text-xs text-[#696053] leading-relaxed mb-4">
            Please wait while we prepare your official digital order invoice and summary.
          </p>
          <div className="w-full bg-[#E5D7C5] h-1.5 rounded-full overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-[#C26B59] via-[#91885D] to-[#4D7C47] rounded-full animate-progress-indeterminate" />
          </div>
        </div>
      </div>
    );
  }

  // Fallback if receipt session expired or opened directly
  if (!receipt) {
    return (
      <div className="min-h-screen bg-[#D9BC9E] font-sans text-[#29251F]">
        <Header cartCount={0} />
        <main className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#F5EBDD] border border-[#91885D]/30 flex items-center justify-center mx-auto text-[#696053]">
            <Utensils className="w-7 h-7" />
          </div>
          <h1 className="font-serif font-bold text-2xl text-[#29251F]">
            Order Receipt
          </h1>
          <p className="text-xs text-[#696053]">
            No recent active receipt was found in this session. If you just placed an order, your confirmation was shared via WhatsApp.
          </p>
          <div className="pt-4">
            <Link
              href={`/store/${slug}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#C26B59] hover:bg-[#A95145] text-[#F5EBDD] px-6 py-3 text-xs font-bold shadow-md transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Bakery Menu</span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const formattedDate = new Date(receipt.createdAt || Date.now()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const formattedTime = new Date(receipt.createdAt || Date.now()).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-[#D9BC9E] font-sans text-[#29251F] print:bg-white print:text-black">
      {/* Navbar (Hidden in Print) */}
      <div className="print:hidden">
        <Header cartCount={0} />
      </div>

      <main className="max-w-lg mx-auto px-4 py-6 pb-28 pt-16 sm:pt-20 md:pt-24 space-y-6">
        {/* Top Navigation & Action Bar (Hidden in Print) */}
        <div className="flex items-center justify-between gap-3 print:hidden">
          <Link
            href={`/store/${slug}`}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#29251F] hover:text-[#C26B59] transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F5EBDD] border border-[#91885D]/35 text-[#29251F] shadow-2xs">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span>Back to Menu</span>
          </Link>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#91885D]/35 bg-[#F5EBDD] px-3.5 py-1.5 text-xs font-bold text-[#29251F] hover:bg-[#E8D5BC] transition-colors shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#696053]" />
            <span>Print Receipt</span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ── LUXURY VINTAGE DIGITAL RECEIPT CARD ── */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="relative rounded-3xl border border-[#91885D]/35 bg-[#FAF6EF] shadow-warm-lg overflow-hidden">
          {/* Top Decorative Header */}
          <div className="bg-[#634832] text-[#F5EBDD] p-5 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-[#C26B59] via-[#E8D5BC] to-[#C26B59]" />
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#E8D5BC]" />
              <span className="font-serif text-lg sm:text-xl font-bold tracking-wide">
                The Indulgent Spoon
              </span>
              <Sparkles className="w-4 h-4 text-[#E8D5BC]" />
            </div>
            <p className="text-[10.5px] uppercase tracking-widest text-[#E8D5BC]/80">
              Artisanal Bakery & Patisserie • Digital Receipt
            </p>
          </div>

          {/* Receipt Content Body */}
          <div className="p-5 sm:p-6 space-y-5">
            {/* Status & Order ID Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[#91885D]/20">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#696053] block">
                  Order Reference
                </span>
                <span className="font-mono text-sm font-black text-[#A34B3D]">
                  #{receipt.orderId}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {receipt.paymentStatus === "PAID" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-[#4D7C47]/15 text-[#2D5A27] border border-[#4D7C47]/30">
                    <CheckCircle2 className="w-3 h-3 text-[#4D7C47]" />
                    <span>Payment Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-[#A34B3D]/15 text-[#A34B3D] border border-[#A34B3D]/30">
                    <Clock className="w-3 h-3 text-[#A34B3D]" />
                    <span>Order Placed</span>
                  </span>
                )}
                <span className="text-[11px] font-semibold text-[#696053]">
                  {formattedDate} • {formattedTime}
                </span>
              </div>
            </div>

            {/* Fulfilment & Receiver Information */}
            <div className="rounded-2xl bg-[#F4E9DC]/70 border border-[#91885D]/25 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#91885D]/20 pb-2">
                <span className="text-xs font-bold text-[#29251F] flex items-center gap-1.5">
                  {receipt.orderType === "delivery" ? (
                    <>
                      <Truck className="w-4 h-4 text-[#C26B59]" />
                      <span>Home Delivery</span>
                      {receipt.distanceKm && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C26B59]/15 text-[#A34B3D]">
                          {receipt.distanceKm} km
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4 text-[#C26B59]" />
                      <span>Takeaway / Store Pickup</span>
                    </>
                  )}
                </span>

                {receipt.addressType && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white/70 border border-[#91885D]/30 text-[#696053]">
                    {receipt.addressType}
                  </span>
                )}
              </div>

              {(receipt.deliveryDate || receipt.deliveryTimeSlot) && (
                <div className="rounded-xl bg-[#FAF6EF] border border-[#91885D]/20 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  {receipt.deliveryDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#C26B59]" />
                      <span className="text-[11px] text-[#696053]">
                        {receipt.orderType === "delivery" ? "Delivery Date:" : "Pickup Date:"}
                      </span>
                      <span className="font-bold text-[#29251F]">
                        {new Date(receipt.deliveryDate + "T00:00:00").toLocaleDateString("en-IN", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}

                  {receipt.deliveryTimeSlot && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#C26B59]" />
                      <span className="text-[11px] text-[#696053]">
                        {receipt.orderType === "delivery" ? "Delivery Slot:" : "Pickup Slot:"}
                      </span>
                      <span className="font-bold text-[#A34B3D]">
                        {receipt.deliveryTimeSlot}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#696053] block">
                    Receiver
                  </span>
                  <p className="font-bold text-[#29251F]">{receipt.customerName}</p>
                  <p className="text-[11px] text-[#554D3F] flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-[#C26B59]" />
                    <span>+91 {receipt.customerPhone}</span>
                  </p>
                  {receipt.alternatePhone && (
                    <p className="text-[10px] text-[#696053] mt-0.5">
                      Alt: +91 {receipt.alternatePhone}
                    </p>
                  )}
                </div>

                {receipt.orderType === "delivery" && receipt.deliveryAddress && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#696053] block">
                      Delivery Address
                    </span>
                    <p className="text-[11px] text-[#29251F] leading-snug">
                      {receipt.deliveryAddress}
                    </p>
                  </div>
                )}

                {receipt.orderType !== "delivery" && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#696053] block">
                      Pickup Location
                    </span>
                    <p className="font-bold text-[#29251F]">The Indulgent Spoon</p>
                    <p className="text-[11px] text-[#29251F] leading-snug mt-0.5">
                      {BAKERY_PICKUP_ADDRESS}
                    </p>
                  </div>
                )}
              </div>

              {/* ── BAKERY PICKUP LOCATION & GOOGLE MAPS CARD (TAKEAWAY ONLY) ── */}
              {receipt.orderType !== "delivery" && (
                <div className="rounded-xl bg-gradient-to-br from-[#FFFDF8] to-[#F8F1E5] border border-[#C26B59]/35 p-3 sm:p-3.5 space-y-2.5 shadow-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#C26B59]/15 border border-[#C26B59]/30 flex items-center justify-center shrink-0 mt-0.5 text-[#C26B59]">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#A34B3D]">
                          Bakery Pickup Address
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-[#4D7C47]/15 text-[#2D5A27] border border-[#4D7C47]/25">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4D7C47]" />
                          <span>Open for Pickup</span>
                        </span>
                      </div>
                      <p className="font-serif font-bold text-sm text-[#29251F] mt-0.5">
                        The Indulgent Spoon
                      </p>
                      <div className="text-[11.5px] text-[#423A2F] leading-relaxed mt-0.5 font-medium space-y-0.5">
                        <p>N 376, 2nd Floor</p>
                        <p>Mayfield Gardens, Sec 51</p>
                        <p>Gurgaon 122018</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Open in Google Maps + 1-Tap Copy */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#91885D]/20">
                    <a
                      href={GOOGLE_MAPS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C26B59] hover:bg-[#A95145] text-white text-[11px] font-bold shadow-xs hover:shadow-sm transition-all active:scale-95"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Open in Google Maps</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </a>

                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#FAF4EB] text-[#554D3F] border border-[#91885D]/30 text-[11px] font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
                    >
                      {copiedAddress ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#4D7C47]" />
                          <span className="text-[#4D7C47] font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#696053]" />
                          <span>Copy Address</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Itemized Order Table */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#696053] block">
                Itemized Creations
              </span>

              <div className="divide-y divide-[#91885D]/15 border-y border-[#91885D]/20">
                {receipt.items.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="py-2.5 flex items-start gap-3 text-xs">
                    {item.image_url ? (
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-[#91885D]/25 bg-[#E8D5BC]">
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#E8D5BC] flex items-center justify-center shrink-0">
                        <Utensils className="w-4 h-4 text-[#696053]" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#29251F] leading-tight">
                        {item.name}{" "}
                        <span className="font-normal text-[#696053]">
                          × {item.quantity}
                        </span>
                      </p>
                      {item.sizeLabel && (
                        <p className="text-[10.5px] text-[#7A6B5A]">
                          Size: {item.sizeLabel}
                        </p>
                      )}
                      {item.addons && item.addons.length > 0 && (
                        <p className="text-[10px] text-[#696053]">
                          + {item.addons.map((a) => a.label).join(", ")}
                        </p>
                      )}
                    </div>

                    <span className="font-bold text-[#29251F] shrink-0">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill Summary Breakdown */}
            <div className="space-y-2 text-xs pt-1">
              <div className="flex justify-between text-[#554D3F]">
                <span>Items Subtotal</span>
                <span className="font-bold text-[#29251F]">
                  {formatPrice(receipt.subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-[#554D3F]">
                <span>Transaction Fees (4%)</span>
                <span className="font-bold text-[#29251F]">
                  +{formatPrice(receipt.packagingFee)}
                </span>
              </div>

              <div className="flex justify-between text-[#554D3F]">
                <span>
                  Delivery Charge{" "}
                  {receipt.orderType === "delivery" && receipt.distanceKm
                    ? `(${receipt.distanceKm} km road)`
                    : "(Takeaway)"}
                </span>
                <span className="font-bold text-[#29251F]">
                  {receipt.deliveryCharge > 0
                    ? `+${formatPrice(receipt.deliveryCharge)}`
                    : "Free (₹0)"}
                </span>
              </div>

              {receipt.hasGiftNote && (
                <div className="flex justify-between text-[#C26B59]">
                  <span className="flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5" />
                    <span>Gift Note &amp; Card</span>
                  </span>
                  <span className="font-bold">
                    +{formatPrice(receipt.giftNoteFee || 40)}
                  </span>
                </div>
              )}

              {receipt.discountAmount != null && receipt.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-800 font-bold bg-emerald-50/60 p-2 rounded-xl border border-emerald-200">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Coupon Discount {receipt.couponCode ? `(${receipt.couponCode})` : ""}</span>
                  </span>
                  <span>-{formatPrice(receipt.discountAmount)}</span>
                </div>
              )}

              {/* Total Row */}
              <div className="pt-3 border-t-2 border-dashed border-[#91885D]/30 flex justify-between items-baseline">
                <div>
                  <span className="font-serif text-base font-black text-[#29251F]">
                    Grand Total Amount
                  </span>
                  <p className="text-[10px] text-[#696053]">Inclusive of all taxes &amp; fees</p>
                </div>
                <span className="font-serif text-2xl sm:text-3xl font-black text-[#A34B3D]">
                  {formatPrice(receipt.total)}
                </span>
              </div>
            </div>

            {/* Gift Note Text (If attached) */}
            {receipt.hasGiftNote && receipt.giftNote && (
              <div className="p-3 rounded-xl bg-[#FFF9F3] border border-[#C26B59]/30 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C26B59] block mb-0.5">
                  Attached Gift Message:
                </span>
                <p className="text-[11px] italic text-[#554D3F] leading-relaxed">
                  &ldquo;{receipt.giftNote}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Perforated / Jagged Bottom Edge Design */}
          <div className="bg-[#FAF6EF] border-t border-dashed border-[#91885D]/30 p-4 text-center text-[10px] text-[#696053] space-y-1">
            <p className="font-serif font-bold text-xs text-[#29251F]">
              Thank you for choosing The Indulgent Spoon! ♡
            </p>
            <p>Freshly handcrafted with 100% pure butter & premium ingredients.</p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ── PAYMENT & CONFIRMATION ACTIONS (HIDDEN IN PRINT) ── */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="space-y-3 print:hidden">
          {receipt.paymentStatus === "PAID" ? (
            <div className="rounded-2xl bg-[#4D7C47]/10 border border-[#4D7C47]/30 p-4 text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2D5A27]">
                <ShieldCheck className="w-4 h-4 text-[#4D7C47]" />
                <span>Payment Confirmed via {receipt.paymentMethod || "Razorpay / UPI"}</span>
              </div>
              <p className="text-[11px] text-[#554D3F]">
                Your handcrafted order has been received and scheduled for fresh baking.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Clock className="w-4 h-4 text-amber-700" />
                <span>Payment Verification Pending</span>
              </div>
              <p className="text-[11px] text-[#554D3F]">
                Please confirm or verify your payment status with the bakery on WhatsApp.
              </p>
            </div>
          )}

          {/* Download PDF & Print buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#F5EBDD] border border-[#91885D]/35 hover:bg-[#E8D5BC] text-[#29251F] py-3 text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-[#C26B59]" />
              <span>{downloadingPdf ? "Saving PDF..." : "Download PDF"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#F5EBDD] border border-[#91885D]/35 hover:bg-[#E8D5BC] text-[#29251F] py-3 text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#696053]" />
              <span>Print Receipt</span>
            </button>
          </div>

          {/* Primary Action: Open / Send Ping on WhatsApp */}
          {receipt && (
            <div className="space-y-1.5 pt-1">
              <a
                href={buildWhatsAppPingUrl(receipt)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] hover:bg-[#20BD5A] text-white py-3.5 px-4 text-xs sm:text-sm font-bold shadow-warm-md hover:shadow-warm-lg transition-all active:scale-[0.99] group cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-white text-transparent group-hover:scale-110 transition-transform" />
                <span>Ping Bakery on WhatsApp (Send Order Details)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-90" />
              </a>
              <p className="text-[10.5px] text-center text-[#696053]">
                Tap to send your verified order &amp; customer details directly to our bakery on WhatsApp.
              </p>
            </div>
          )}

          {/* Secondary Action: Back to Menu */}
          <div className="pt-2 text-center">
            <Link
              href="/#menu"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A34B3D] hover:text-[#7A362B] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Bakery Menu</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
