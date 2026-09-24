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
  Copy,
  Check,
  ArrowLeft,
  Utensils,
  Truck,
  ShoppingBag,
  MapPin,
  Phone,
  User,
  Mail,
  QrCode,
  CreditCard,
  MessageCircle,
  ExternalLink,
  Clock,
  Sparkles,
  Gift,
  ShieldCheck,
} from "lucide-react";

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
  distanceKm?: number | null;
  items: ReceiptItem[];
  subtotal: number;
  deliveryCharge: number;
  packagingFee: number;
  hasGiftNote?: boolean;
  giftNote?: string;
  giftNoteFee?: number;
  total: number;
  whatsappUrl?: string;
  restaurantName?: string;
  restaurantPhone?: string;
}

export default function OrderSuccessReceiptPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "the-indulgent-spoon";
  const router = useRouter();

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // UPI configuration
  const UPI_ID = "theindulgentspoon@okaxis"; // Bakery UPI VPA
  const BAKERY_NAME = "The Indulgent Spoon";

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`receipt-${slug}`);
      if (stored) {
        setReceipt(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Error reading receipt data:", err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const upiPayUrl = useMemo(() => {
    if (!receipt) return "";
    const amount = receipt.total;
    const note = `Order ${receipt.orderId} - ${BAKERY_NAME}`;
    return `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(
      BAKERY_NAME
    )}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
  }, [receipt]);

  const qrCodeUrl = useMemo(() => {
    if (!upiPayUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      upiPayUrl
    )}&margin=10`;
  }, [upiPayUrl]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#D9BC9E] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C26B59] border-t-transparent" />
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
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-[#4D7C47]/15 text-[#2D5A27] border border-[#4D7C47]/30">
                  <CheckCircle2 className="w-3 h-3 text-[#4D7C47]" />
                  <span>Order Placed</span>
                </span>
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
              </div>
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
                <span>Packing &amp; Handling (4%)</span>
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
          {/* Primary Action 1: Do Payment (UPI / QR Code) */}
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-[#4D7C47] hover:bg-[#3D6638] text-white py-4 text-sm font-bold shadow-warm-lg hover:shadow-warm-xl transition-all active:scale-[0.99] cursor-pointer"
          >
            <CreditCard className="w-5 h-5 text-white" />
            <span>Do Payment (UPI / QR Code) — {formatPrice(receipt.total)}</span>
          </button>

          {/* Primary Action 2: Open / Send on WhatsApp */}
          {receipt.whatsappUrl && (
            <a
              href={receipt.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-[#634832] hover:bg-[#523B28] text-[#F5EBDD] py-3.5 text-xs sm:text-sm font-bold shadow-warm-md hover:shadow-warm-lg transition-all active:scale-[0.99]"
            >
              <MessageCircle className="w-4 h-4 text-[#F5EBDD]" />
              <span>Confirm &amp; Send Order on WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          )}

          {/* Secondary Action: Back to Menu */}
          <div className="pt-2 text-center">
            <Link
              href={`/store/${slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A34B3D] hover:text-[#7A362B] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Continue Shopping &amp; Back to Menu</span>
            </Link>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ── UPI PAYMENT POPUP MODAL ── */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-[#FAF6EF] rounded-3xl border border-[#91885D]/35 max-w-sm w-full p-6 shadow-2xl space-y-4 relative animate-in zoom-in-95">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#E8D5BC] text-[#696053] transition-colors cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>

              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-[#4D7C47]/15 border border-[#4D7C47]/30 flex items-center justify-center mx-auto text-[#2D5A27]">
                  <QrCode className="w-5 h-5 text-[#4D7C47]" />
                </div>
                <h3 className="font-serif text-lg font-bold text-[#29251F]">
                  Scan &amp; Pay via UPI
                </h3>
                <p className="text-xs text-[#696053]">
                  Amount Payable:{" "}
                  <span className="font-bold text-[#A34B3D] text-sm">
                    {formatPrice(receipt.total)}
                  </span>
                </p>
              </div>

              {/* Dynamic QR Code Image */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-[#91885D]/30 shadow-inner">
                {qrCodeUrl && (
                  <div className="relative w-48 h-48">
                    <Image
                      src={qrCodeUrl}
                      alt="UPI QR Code"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                )}
                <span className="text-[10px] font-bold text-[#696053] mt-2 uppercase tracking-wider">
                  Scan with GPay, PhonePe, Paytm, BHIM
                </span>
              </div>

              {/* UPI ID Copy Card */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F5EBDD] border border-[#91885D]/30 text-xs">
                <div>
                  <span className="text-[10px] text-[#696053] block uppercase tracking-wider">
                    UPI ID (VPA)
                  </span>
                  <span className="font-mono font-bold text-[#29251F]">
                    {UPI_ID}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#C26B59] hover:bg-[#A95145] text-white text-[11px] font-bold transition-colors cursor-pointer"
                >
                  {copiedUpi ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Direct UPI App Intent Pay Button for Mobile Devices */}
              <div className="space-y-2 pt-1">
                <a
                  href={upiPayUrl}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4D7C47] hover:bg-[#3D6638] text-white py-3 text-xs font-bold shadow-md transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Open Supported UPI App to Pay</span>
                </a>

                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full py-2.5 text-xs font-semibold text-[#696053] hover:text-[#29251F] transition-colors cursor-pointer"
                >
                  Done / Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
