import React from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  ShieldCheck,
  RotateCcw,
  RefreshCw,
  Clock,
  MessageCircle,
  HelpCircle,
  ArrowLeft,
  ChevronRight,
  PackageX,
  Sparkles,
  Ban,
} from "lucide-react";

export const metadata = {
  title: "Return & Exchange Policy — The Indulgent Spoon",
  description:
    "Review the return, exchange, and cancellation policy for The Indulgent Spoon. Perishable artisanal bakery products baked fresh to order.",
  alternates: {
    canonical: "/return-policy",
  },
  openGraph: {
    title: "Return & Exchange Policy | The Indulgent Spoon",
    description:
      "Review the return, exchange, and cancellation policy for The Indulgent Spoon. Perishable artisanal bakery products baked fresh to order.",
    url: "https://www.theindulgentspoon.in/return-policy",
    images: ["/main_photo_f.jpeg"],
  },
};

export default function ReturnPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#D9BC9E] text-[#29251F]">
      <Header />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-4xl mx-auto w-full space-y-8">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs font-semibold text-[#4D4537]"
        >
          <Link
            href="/"
            className="hover:text-[#C26B59] transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#91885D]" />
          <span className="text-[#29251F]">Return &amp; Exchange Policy</span>
        </nav>

        {/* Hero Card */}
        <div className="rounded-3xl border border-[#91885D]/35 bg-[#FAF6EF] p-6 sm:p-10 shadow-warm-md relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#C26B59]/10 via-transparent to-transparent rounded-full pointer-events-none" />

          <div className="relative space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F5EBDD] text-[#C26B59] border border-[#91885D]/30 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5" />
                Customer Care &amp; Transparency
              </span>
              <span className="text-[11px] font-medium text-[#7A6E5D]">
                Last Updated: October 2026
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#29251F] tracking-tight leading-tight">
              Return &amp; Exchange Policy
            </h1>

            <p className="text-sm sm:text-base text-[#4D4537] leading-relaxed max-w-2xl font-medium">
              At <strong className="text-[#29251F]">The Indulgent Spoon</strong>, every loaf of
              slow-fermented sourdough, bespoke celebration cake, and gourmet delicacy is made fresh
              to order in small artisanal batches with strict quality and hygiene standards. Please review
              our official return, exchange, and cancellation terms below.
            </p>
          </div>
        </div>

        {/* ═══ TWO PRIMARY PREFERENCES (Returns & Exchanges) ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. RETURNS PREFERENCE */}
          <div className="rounded-3xl border border-[#91885D]/35 bg-[#FAF6EF] p-6 sm:p-7 shadow-warm-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[#C26B59]/15 text-[#C26B59] flex items-center justify-center border border-[#C26B59]/30">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-100/80 text-rose-900 border border-rose-200">
                  Returns Preference
                </span>
              </div>

              <h2 className="font-serif text-xl font-bold text-[#29251F]">
                Product Returns
              </h2>

              {/* Explicit option statement as configured */}
              <div className="p-3.5 rounded-2xl bg-[#F5EBDD] border border-[#91885D]/35 space-y-1">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#7A6E5D]">
                  Our Policy:
                </p>
                <p className="text-sm font-extrabold text-[#29251F] flex items-center gap-2">
                  <PackageX className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>No, I don&apos;t accept returns</span>
                </p>
              </div>

              <p className="text-xs sm:text-sm text-[#4D4537] leading-relaxed">
                Because all items are perishable foodstuffs prepared fresh per customer order, we do
                not accept returns once items have left our bakery premises or have been delivered.
              </p>
            </div>

            <div className="pt-3 border-t border-[#91885D]/20 text-[11px] text-[#7A6E5D] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#C26B59] shrink-0" />
              <span>Food safety &amp; hygiene guidelines compliant</span>
            </div>
          </div>

          {/* 2. EXCHANGES PREFERENCE */}
          <div className="rounded-3xl border border-[#91885D]/35 bg-[#FAF6EF] p-6 sm:p-7 shadow-warm-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[#7A774D]/15 text-[#7A774D] flex items-center justify-center border border-[#7A774D]/30">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100/80 text-amber-900 border border-amber-200">
                  Exchanges Preference
                </span>
              </div>

              <h2 className="font-serif text-xl font-bold text-[#29251F]">
                Product Exchanges
              </h2>

              {/* Explicit option statement as configured */}
              <div className="p-3.5 rounded-2xl bg-[#F5EBDD] border border-[#91885D]/35 space-y-1">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#7A6E5D]">
                  Our Policy:
                </p>
                <p className="text-sm font-extrabold text-[#29251F] flex items-center gap-2">
                  <PackageX className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>No, I don&apos;t accept exchanges</span>
                </p>
              </div>

              <p className="text-xs sm:text-sm text-[#4D4537] leading-relaxed">
                Due to custom baking schedules, perishable shelf lives, and tailored orders, we
                cannot offer product exchanges, flavor swaps, or item replacements after order placement.
              </p>
            </div>

            <div className="pt-3 border-t border-[#91885D]/20 text-[11px] text-[#7A6E5D] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#7A774D] shrink-0" />
              <span>Baked fresh to order for your designated slot</span>
            </div>
          </div>
        </div>

        {/* ═══ CANCELLATION & REFUNDS: NO CANCELLATION ONCE PAID ═══ */}
        <div className="rounded-3xl border border-[#91885D]/35 bg-[#FAF6EF] p-6 sm:p-8 shadow-warm-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#C26B59]/15 text-[#C26B59] flex items-center justify-center border border-[#C26B59]/30">
                <Ban className="w-5 h-5 text-[#C26B59]" />
              </div>
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#29251F]">
                  Order Cancellations &amp; Refunds
                </h2>
                <p className="text-xs text-[#7A6E5D] mt-0.5">
                  Made-to-order artisanal bakery policy
                </p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-100/80 text-rose-900 border border-rose-200 shrink-0">
              Strict Policy
            </span>
          </div>

          {/* Prominent policy highlight box */}
          <div className="p-4 rounded-2xl bg-[#F5EBDD] border border-[#91885D]/35 space-y-1.5">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#7A6E5D]">
              Cancellation &amp; Refund Rule:
            </p>
            <p className="text-base sm:text-lg font-black text-[#A03B2A] flex items-center gap-2">
              <PackageX className="w-5 h-5 text-[#A03B2A] shrink-0" />
              <span>No Cancellations Once You Have Paid</span>
            </p>
            <p className="text-xs sm:text-sm text-[#4D4537] leading-relaxed pt-1">
              All sales are final. Once your payment has been processed and your order is confirmed,
              it cannot be cancelled, modified, or refunded under any circumstances.
            </p>
          </div>

          <div className="space-y-2 text-xs sm:text-sm text-[#4D4537] leading-relaxed pt-1">
            <p>
              Because our artisanal sourdough loaves, handcrafted cakes, and wholesome delicacies
              are made fresh to order in limited daily batches, our kitchen immediately allocates fresh
              ingredients, initiates natural fermentation, and reserves baking capacity the moment your order is paid.
            </p>
            <p>
              We kindly ask that you verify your delivery date, time slot, delivery address, and product
              selections carefully prior to completing payment.
            </p>
          </div>
        </div>

        {/* ═══ CONTACT & SUPPORT CARD ═══ */}
        <div className="rounded-3xl border border-[#91885D]/35 bg-gradient-to-br from-[#FAF6EF] to-[#F5EBDD] p-6 sm:p-8 shadow-warm-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-serif text-xl font-bold text-[#29251F] flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#C26B59]" />
                <span>Questions Before Ordering?</span>
              </h2>
              <p className="text-xs text-[#7A6E5D]">
                Our bakery concierge is available daily between 10:00 AM – 8:00 PM to help you with sizes, allergens, or special requests.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <a
                href="https://wa.me/919717123510?text=Hi%20The%20Indulgent%20Spoon!%20I%20have%20a%20question%20before%20placing%20my%20order."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#394231] hover:bg-[#2C3426] text-white text-xs font-bold transition-all shadow-warm-sm"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                <span>WhatsApp: +91 97171 23510</span>
              </a>

              <Link
                href="/full-menu"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-stone-50 text-[#29251F] border border-[#91885D]/35 text-xs font-bold transition-all"
              >
                <span>Browse Menu</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
