"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { submitBulkOrderEnquiryAction } from "./actions";
import {
  Sparkles,
  Gift,
  Calendar,
  Package,
  CheckCircle2,
  Send,
  MessageCircle,
  Phone,
  Mail,
  Building,
  User,
  MapPin,
  Heart,
  ShieldCheck,
  Truck,
  ArrowRight,
  ChevronRight,
  HelpCircle,
  Loader2,
} from "lucide-react";

const OCCASIONS = [
  { id: "Corporate Gifting & Events", label: "Corporate Gifting & Events", icon: "🏢", desc: "Employee hampers, client appreciation, Diwali gifts" },
  { id: "Wedding Favors & Mehendi", label: "Wedding Favors & Mehendi", icon: "💍", desc: "Bespoke return gifts, sweet boxes & trousseau" },
  { id: "Birthday & Private Parties", label: "Birthday & Private Parties", icon: "🎂", desc: "Party favors, dessert tables & goodie boxes" },
  { id: "Festive Celebrations", label: "Festive Celebrations", icon: "🪔", desc: "Diwali, Rakhi, New Year & special festival hampers" },
  { id: "Baby Shower & Anniversaries", label: "Baby Shower & Anniversaries", icon: "👶", desc: "Cute themed treat boxes & curated bundles" },
  { id: "Cafe & Wholesale Supply", label: "Cafe / Retail / Wholesale", icon: "☕", desc: "Regular supply of baked delicacies & desserts" },
  { id: "Other Custom Celebration", label: "Other Celebration", icon: "✨", desc: "Custom requirement tailored to your event" },
];

const QUANTITY_TIERS = [
  { id: "10 - 25 Boxes / Units", label: "10 – 25 Boxes", badge: "Small Event" },
  { id: "25 - 50 Boxes / Units", label: "25 – 50 Boxes", badge: "Popular" },
  { id: "50 - 100 Boxes / Units", label: "50 – 100 Boxes", badge: "Gifting Tier" },
  { id: "100 - 250 Boxes / Units", label: "100 – 250 Boxes", badge: "Bulk Discount" },
  { id: "250+ Large Order", label: "250+ Units", badge: "VIP Concierge" },
];

const PRODUCT_OPTIONS = [
  { id: "Artisan Stuffed Cookies", name: "Artisanal Stuffed Cookies", icon: "🍪", desc: "Nutella melt, Belgian chocolate, Biscoff lava" },
  { id: "Fudgy Brownies & Blondies", name: "Brownies & Blondies", icon: "🍫", desc: "Dense fudgy Belgian chocolate, salted caramel" },
  { id: "Gourmet Tea Cakes & Loaves", name: "Gourmet Tea Cakes", icon: "🍰", desc: "Spiced carrot, banana walnut, lemon drizzle" },
  { id: "Curated Luxury Hampers", name: "Luxury Curated Hampers", icon: "🎁", desc: "Assorted sweet & savory boxes with custom ribbon" },
  { id: "Savory Bakes & Croissant Delights", name: "Savory Gourmet Bakes", icon: "🥐", desc: "Herb cheese puffs, sourdough crisps, quiches" },
  { id: "Tarts & Seasonal Delicacies", name: "Fruit Tarts & Delicacies", icon: "🍓", desc: "Fresh seasonal berry, banoffee & chocolate tarts" },
];

const DIETARY_CUSTOMIZATIONS = [
  "100% Eggless Guaranteed",
  "Zero Refined Sugar / Jaggery Options",
  "Nut-Free / Specific Allergen Safe",
  "Custom Logo / Company Branding Sticker",
  "Custom Printed Ribbon & Wax Seal",
  "Handwritten Personal Note Cards",
];

const BUDGET_RANGES = [
  "₹5,000 – ₹15,000",
  "₹15,000 – ₹35,000",
  "₹35,000 – ₹75,000",
  "₹75,000+ (VIP / Large Batch)",
  "Flexible / Need Custom Menu & Quote",
];

export default function BulkOrdersPage() {
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    company_name: "",
    occasion: "Corporate Gifting & Events",
    estimated_quantity: "25 - 50 Boxes / Units",
    custom_quantity_num: "",
    target_date: "",
    delivery_location: "",
    budget_range: "₹15,000 – ₹35,000",
    product_interests: ["Artisan Stuffed Cookies", "Curated Luxury Hampers"] as string[],
    dietary_preferences: ["100% Eggless Guaranteed"] as string[],
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedEnquiry, setSubmittedEnquiry] = useState<{
    enquiryNumber: string;
    customer_name: string;
    customer_phone: string;
    occasion: string;
    estimated_quantity: string;
    target_date?: string;
  } | null>(null);

  const toggleProduct = (prodId: string) => {
    setFormData((prev) => {
      const exists = prev.product_interests.includes(prodId);
      if (exists) {
        return {
          ...prev,
          product_interests: prev.product_interests.filter((p) => p !== prodId),
        };
      } else {
        return {
          ...prev,
          product_interests: [...prev.product_interests, prodId],
        };
      }
    });
  };

  const toggleDietary = (item: string) => {
    setFormData((prev) => {
      const exists = prev.dietary_preferences.includes(item);
      if (exists) {
        return {
          ...prev,
          dietary_preferences: prev.dietary_preferences.filter((p) => p !== item),
        };
      } else {
        return {
          ...prev,
          dietary_preferences: [...prev.dietary_preferences, item],
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.customer_name.trim()) {
      setSubmitError("Please enter your name.");
      return;
    }
    if (!formData.customer_phone.trim()) {
      setSubmitError("Please enter your WhatsApp / phone number.");
      return;
    }

    const finalQuantity =
      formData.custom_quantity_num.trim()
        ? `${formData.custom_quantity_num.trim()} units (${formData.estimated_quantity})`
        : formData.estimated_quantity;

    setIsSubmitting(true);
    try {
      const res = await submitBulkOrderEnquiryAction({
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_email: formData.customer_email,
        company_name: formData.company_name,
        occasion: formData.occasion,
        estimated_quantity: finalQuantity,
        target_date: formData.target_date,
        delivery_location: formData.delivery_location,
        budget_range: formData.budget_range,
        product_interests: formData.product_interests,
        dietary_preferences: formData.dietary_preferences,
        message: formData.message,
      });

      if (!res.success) {
        setSubmitError(res.error || "Failed to submit. Please try again.");
      } else {
        setSubmittedEnquiry({
          enquiryNumber: res.enquiryNumber || "BLK-NEW",
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          occasion: formData.occasion,
          estimated_quantity: finalQuantity,
          target_date: formData.target_date,
        });
        window.scrollTo({ top: 100, behavior: "smooth" });
      }
    } catch (err: any) {
      setSubmitError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const constructWhatsAppUrl = () => {
    if (!submittedEnquiry) return "";
    const text = encodeURIComponent(
      `Hi Vasvi & The Indulgent Spoon team! 👩‍🍳\n\n` +
      `I just submitted a Bulk Order Enquiry on your website:\n` +
      `📌 *Enquiry Ref:* #${submittedEnquiry.enquiryNumber}\n` +
      `👤 *Name:* ${submittedEnquiry.customer_name}\n` +
      `🎉 *Occasion:* ${submittedEnquiry.occasion}\n` +
      `📦 *Estimated Quantity:* ${submittedEnquiry.estimated_quantity}\n` +
      (submittedEnquiry.target_date ? `📅 *Event Date:* ${submittedEnquiry.target_date}\n` : "") +
      `\nCould you please share your bulk catalogue & custom pricing quote? Thank you!`
    );
    return `https://wa.me/919876543210?text=${text}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5EBDD] text-[#29251F]">
      <Header />

      {/* ── HERO BANNER ── */}
      <div className="relative bg-gradient-to-b from-[#7A774D] to-[#605D3A] text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden shadow-inner">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#E8D5BC_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#C26B59]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[#E8D5BC]/20 blur-2xl pointer-events-none" />

        <div className="mx-auto max-w-4xl relative z-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-xs px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#E8D5BC] mb-4">
            <Gift className="h-3.5 w-3.5 text-[#E8D5BC]" />
            <span>Bespoke Gifting & Event Catering</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#FAF5ED] leading-tight drop-shadow-xs">
            Handcrafted Bulk Orders & Luxury Gift Hampers
          </h1>

          <p className="mt-4 text-sm sm:text-base text-[#E6DBC9] max-w-2xl mx-auto leading-relaxed">
            From intimate celebratory favor boxes to 500+ corporate client hampers, every confection is baked fresh from scratch with wholesome artisan ingredients and customized branding.
          </p>

          {/* Quick value badges */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
              <span className="text-xl">🌿</span>
              <div>
                <p className="text-xs font-bold text-white leading-tight">100% Eggless</p>
                <p className="text-[10px] text-white/70">Pure vegetarian</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
              <span className="text-xl">🎀</span>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Custom Branding</p>
                <p className="text-[10px] text-white/70">Ribbons & wax seals</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
              <span className="text-xl">🏷️</span>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Tiered Discounts</p>
                <p className="text-[10px] text-white/70">Direct kitchen rates</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
              <span className="text-xl">🚚</span>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Safe Delivery</p>
                <p className="text-[10px] text-white/70">NCR & Pan-India</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-20 relative z-20">
        {submittedEnquiry ? (
          /* ── SUCCESS SCREEN ── */
          <div className="bg-white rounded-3xl shadow-[0_12px_50px_rgba(41,37,31,0.12)] border border-[#91885D]/25 p-6 sm:p-10 text-center animate-in fade-in duration-500">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#F4EDE2] border-2 border-[#91885D]/40 flex items-center justify-center text-[#C26B59] mb-6 shadow-warm-sm">
              <CheckCircle2 className="h-10 w-10 text-[#7A774D]" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-[#7A774D]/10 text-[#7A774D] text-xs font-bold uppercase tracking-wider mb-2">
              Enquiry Ref: #{submittedEnquiry.enquiryNumber}
            </span>

            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#29251F]">
              Thank you, {submittedEnquiry.customer_name}!
            </h2>

            <p className="mt-3 text-sm sm:text-base text-[#696053] max-w-lg mx-auto leading-relaxed">
              Your bulk order inquiry has been received by our kitchen concierge. Founder Vasvi and our culinary team are reviewing your requirements and will reach out shortly on WhatsApp with a personalized quote and menu tasting options.
            </p>

            {/* Quick summary box */}
            <div className="mt-6 max-w-md mx-auto bg-[#FAF5ED] rounded-2xl p-4 border border-[#E8D5BC] text-left text-xs sm:text-sm space-y-2">
              <div className="flex justify-between border-b border-[#E8D5BC]/60 pb-2">
                <span className="text-[#696053]">Occasion:</span>
                <span className="font-semibold text-[#29251F]">{submittedEnquiry.occasion}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8D5BC]/60 pb-2">
                <span className="text-[#696053]">Quantity:</span>
                <span className="font-semibold text-[#29251F]">{submittedEnquiry.estimated_quantity}</span>
              </div>
              {submittedEnquiry.target_date && (
                <div className="flex justify-between border-b border-[#E8D5BC]/60 pb-2">
                  <span className="text-[#696053]">Event Date:</span>
                  <span className="font-semibold text-[#29251F]">{submittedEnquiry.target_date}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#696053]">Contact Phone:</span>
                <span className="font-semibold text-[#29251F]">{submittedEnquiry.customer_phone}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={constructWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white px-6 py-3.5 font-bold text-sm shadow-md transition-all hover:scale-[1.02]"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Chat Instantly on WhatsApp</span>
              </a>

              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#FAF5ED] hover:bg-[#E8D5BC] text-[#29251F] border border-[#91885D]/30 px-6 py-3.5 font-semibold text-sm transition-colors"
              >
                <span>Return to Home & Menu</span>
              </Link>
            </div>
          </div>
        ) : (
          /* ── SURVEY FORM CONTAINER ── */
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl shadow-[0_12px_50px_rgba(41,37,31,0.12)] border border-[#91885D]/25 overflow-hidden"
          >
            {/* Section Header */}
            <div className="bg-[#FAF5ED] px-6 sm:px-8 py-5 border-b border-[#91885D]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#29251F]">
                  Bulk Order & Gifting Survey
                </h2>
                <p className="text-xs sm:text-sm text-[#696053]">
                  Takes under 2 minutes • Tailored custom quote guaranteed within 2–4 hours
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C26B59] bg-white px-3 py-1.5 rounded-full border border-[#91885D]/20 self-start sm:self-center">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Chef Curated</span>
              </div>
            </div>

            <div className="p-6 sm:p-10 space-y-10">
              {/* ── QUESTION 1: OCCASION ── */}
              <div className="space-y-3">
                <label className="block text-sm sm:text-base font-serif font-bold text-[#29251F]">
                  1. What is the occasion or event? <span className="text-[#C26B59]">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {OCCASIONS.map((occ) => {
                    const isSelected = formData.occasion === occ.id;
                    return (
                      <button
                        key={occ.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, occasion: occ.id })}
                        className={`text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                          isSelected
                            ? "bg-[#FAF5ED] border-[#C26B59] shadow-warm-sm ring-1 ring-[#C26B59]"
                            : "bg-white border-[#E8D5BC] hover:border-[#91885D]/50 hover:bg-[#FDFBF7]"
                        }`}
                      >
                        <span className="text-2xl mt-0.5">{occ.icon}</span>
                        <div>
                          <p className={`text-xs sm:text-sm font-bold ${isSelected ? "text-[#C26B59]" : "text-[#29251F]"}`}>
                            {occ.label}
                          </p>
                          <p className="text-[11px] text-[#696053] mt-0.5 leading-snug">
                            {occ.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── QUESTION 2: ESTIMATED QUANTITY ── */}
              <div className="space-y-3 pt-2 border-t border-[#E8D5BC]/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="block text-sm sm:text-base font-serif font-bold text-[#29251F]">
                    2. Estimated Quantity / Box Count <span className="text-[#C26B59]">*</span>
                  </label>
                  <span className="text-xs text-[#696053]">Minimum order size is 10 boxes for bulk pricing</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {QUANTITY_TIERS.map((tier) => {
                    const isSelected = formData.estimated_quantity === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, estimated_quantity: tier.id })}
                        className={`p-3 rounded-2xl border text-center transition-all ${
                          isSelected
                            ? "bg-[#7A774D] border-[#7A774D] text-white shadow-warm-sm"
                            : "bg-white border-[#E8D5BC] hover:border-[#91885D]/50 text-[#29251F]"
                        }`}
                      >
                        <span className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isSelected ? "text-[#E8D5BC]" : "text-[#91885D]"}`}>
                          {tier.badge}
                        </span>
                        <span className="block text-xs sm:text-sm font-bold">
                          {tier.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom count input */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-[#696053]">Or exact count if known:</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 75"
                    value={formData.custom_quantity_num}
                    onChange={(e) => setFormData({ ...formData, custom_quantity_num: e.target.value })}
                    className="w-28 px-3 py-1.5 text-xs rounded-xl border border-[#E8D5BC] bg-[#FAF5ED] focus:outline-none focus:border-[#C26B59] focus:bg-white"
                  />
                  <span className="text-xs text-[#696053]">units / boxes</span>
                </div>
              </div>

              {/* ── QUESTION 3: TIMELINE & LOCATION ── */}
              <div className="space-y-3 pt-2 border-t border-[#E8D5BC]/60">
                <label className="block text-sm sm:text-base font-serif font-bold text-[#29251F]">
                  3. Event Date & Delivery Location
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#696053] uppercase tracking-wider mb-1.5">
                      Target Delivery / Event Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formData.target_date}
                        onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#E8D5BC] bg-[#FAF5ED] text-sm text-[#29251F] focus:outline-none focus:border-[#C26B59] focus:bg-white"
                      />
                    </div>
                    <p className="text-[11px] text-[#91885D] mt-1">
                      💡 Tip: 2–3 days advance notice recommended for custom packaging
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#696053] uppercase tracking-wider mb-1.5">
                      Delivery City / Venue Location
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Rewari / Gurgaon / Delhi NCR / Courier"
                        value={formData.delivery_location}
                        onChange={(e) => setFormData({ ...formData, delivery_location: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#E8D5BC] bg-[#FAF5ED] text-sm text-[#29251F] focus:outline-none focus:border-[#C26B59] focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── QUESTION 4: PRODUCTS OF INTEREST ── */}
              <div className="space-y-3 pt-2 border-t border-[#E8D5BC]/60">
                <div className="flex items-center justify-between">
                  <label className="block text-sm sm:text-base font-serif font-bold text-[#29251F]">
                    4. Which delicacies are you interested in?
                  </label>
                  <span className="text-xs text-[#91885D] font-medium">Select all that apply</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PRODUCT_OPTIONS.map((prod) => {
                    const isChecked = formData.product_interests.includes(prod.id);
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => toggleProduct(prod.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                          isChecked
                            ? "bg-[#FAF5ED] border-[#C26B59] shadow-warm-xs ring-1 ring-[#C26B59]"
                            : "bg-white border-[#E8D5BC] hover:border-[#91885D]/40"
                        }`}
                      >
                        <span className="text-2xl mt-0.5">{prod.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className={`text-xs sm:text-sm font-bold ${isChecked ? "text-[#C26B59]" : "text-[#29251F]"}`}>
                              {prod.name}
                            </p>
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                              isChecked ? "bg-[#C26B59] text-white" : "border border-[#91885D]/40"
                            }`}>
                              {isChecked ? "✓" : ""}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#696053] mt-0.5 leading-snug">
                            {prod.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── QUESTION 5: DIETARY & CUSTOMIZATIONS ── */}
              <div className="space-y-3 pt-2 border-t border-[#E8D5BC]/60">
                <label className="block text-sm sm:text-base font-serif font-bold text-[#29251F]">
                  5. Dietary & Packaging Customizations
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {DIETARY_CUSTOMIZATIONS.map((item) => {
                    const isChecked = formData.dietary_preferences.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleDietary(item)}
                        className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center gap-2.5 transition-all ${
                          isChecked
                            ? "bg-[#7A774D]/10 border-[#7A774D] text-[#7A774D]"
                            : "bg-white border-[#E8D5BC] text-[#696053] hover:border-[#91885D]"
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                          isChecked ? "bg-[#7A774D] text-white font-bold" : "border border-[#91885D]/40"
                        }`}>
                          {isChecked ? "✓" : ""}
                        </span>
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── QUESTION 6: BUDGET RANGE ── */}
              <div className="space-y-3 pt-2 border-t border-[#E8D5BC]/60">
                <label className="block text-sm sm:text-base font-serif font-bold text-[#29251F]">
                  6. Approximate Budget Range (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {BUDGET_RANGES.map((b) => {
                    const isSelected = formData.budget_range === b;
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setFormData({ ...formData, budget_range: b })}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? "bg-[#C26B59] border-[#C26B59] text-white shadow-warm-xs"
                            : "bg-[#FAF5ED] border-[#E8D5BC] text-[#29251F] hover:border-[#91885D]"
                        }`}
                      >
                        {b}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── QUESTION 7: CONTACT DETAILS ── */}
              <div className="space-y-4 pt-2 border-t border-[#E8D5BC]/60">
                <label className="block text-sm sm:text-base font-serif font-bold text-[#29251F]">
                  7. Where should we send the catalogue & quotation? <span className="text-[#C26B59]">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#696053] uppercase tracking-wider mb-1.5">
                      Your Full Name <span className="text-[#C26B59]">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#91885D]" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Priya Sharma"
                        value={formData.customer_name}
                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8D5BC] bg-[#FAF5ED] text-sm text-[#29251F] focus:outline-none focus:border-[#C26B59] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#696053] uppercase tracking-wider mb-1.5">
                      WhatsApp / Phone Number <span className="text-[#C26B59]">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#91885D]" />
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        value={formData.customer_phone}
                        onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8D5BC] bg-[#FAF5ED] text-sm text-[#29251F] focus:outline-none focus:border-[#C26B59] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#696053] uppercase tracking-wider mb-1.5">
                      Email Address (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#91885D]" />
                      <input
                        type="email"
                        placeholder="priya@example.com"
                        value={formData.customer_email}
                        onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8D5BC] bg-[#FAF5ED] text-sm text-[#29251F] focus:outline-none focus:border-[#C26B59] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#696053] uppercase tracking-wider mb-1.5">
                      Company / Organization Name (Optional)
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#91885D]" />
                      <input
                        type="text"
                        placeholder="e.g. Google India / Zomato"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8D5BC] bg-[#FAF5ED] text-sm text-[#29251F] focus:outline-none focus:border-[#C26B59] focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional notes / custom requirements */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-[#696053] uppercase tracking-wider mb-1.5">
                    Any specific theme, flavor preference, or special requests?
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. We want pastel pink packaging ribbons with gold lettering, and 50 boxes of assorted cookies for our Diwali gift rollout..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E8D5BC] bg-[#FAF5ED] text-sm text-[#29251F] focus:outline-none focus:border-[#C26B59] focus:bg-white"
                  />
                </div>
              </div>

              {/* Error display */}
              {submitError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  ⚠️ {submitError}
                </div>
              )}

              {/* Submit CTA */}
              <div className="pt-4 border-t border-[#E8D5BC]/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-[#696053]">
                  <ShieldCheck className="h-4 w-4 text-[#7A774D]" />
                  <span>No spam guarantee • Direct connection with our founder</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#C26B59] hover:bg-[#a85949] text-white px-8 py-3.5 font-bold text-sm shadow-warm-md transition-all hover:scale-[1.02] disabled:opacity-60 disabled:pointer-events-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending Enquiry to Kitchen...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Bulk Order Enquiry</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}
