"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { submitBulkOrderEnquiryAction } from "./actions";
import {
  Gift,
  CheckCircle2,
  MessageCircle,
  Phone,
  Mail,
  User,
  ShieldCheck,
  ArrowRight,
  Loader2,
  FileText,
} from "lucide-react";

export default function BulkOrdersPage() {
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    requirement: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedEnquiry, setSubmittedEnquiry] = useState<{
    enquiryNumber: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    requirement: string;
  } | null>(null);

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
    if (!formData.requirement.trim()) {
      setSubmitError("Please enter your requirement.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitBulkOrderEnquiryAction({
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_email: formData.customer_email,
        requirement: formData.requirement,
      });

      if (!res.success) {
        setSubmitError(res.error || "Failed to submit. Please try again.");
      } else {
        setSubmittedEnquiry({
          enquiryNumber: res.enquiryNumber || "BLK-NEW",
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          customer_email: formData.customer_email,
          requirement: formData.requirement,
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
      `Hi The Indulgent Spoon team! 👩‍🍳\n\n` +
      `I just submitted a Bulk Order Enquiry on your website:\n` +
      `📌 *Enquiry Ref:* #${submittedEnquiry.enquiryNumber}\n` +
      `👤 *Name:* ${submittedEnquiry.customer_name}\n` +
      `📱 *Phone / WhatsApp:* ${submittedEnquiry.customer_phone}\n` +
      (submittedEnquiry.customer_email ? `✉️ *Email:* ${submittedEnquiry.customer_email}\n` : "") +
      `📝 *Requirement:* ${submittedEnquiry.requirement}\n\n` +
      `Could you please share your bulk catalogue & custom pricing quote? Thank you!`
    );
    return `https://wa.me/919717123510?text=${text}`;
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
            From celebratory favor boxes to corporate hampers, every confection is baked fresh from scratch with wholesome artisan ingredients. Share your requirement below!
          </p>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 -mt-8 pb-20 relative z-20">
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

            <p className="mt-3 text-sm text-[#696053] max-w-md mx-auto leading-relaxed">
              Your bulk order inquiry has been received. Our kitchen team will review your requirements and reach out on WhatsApp shortly.
            </p>

            {/* Quick summary box */}
            <div className="mt-6 max-w-md mx-auto bg-[#FAF5ED] rounded-2xl p-5 border border-[#E8D5BC] text-left text-xs sm:text-sm space-y-2.5">
              <div className="flex justify-between border-b border-[#E8D5BC]/60 pb-2">
                <span className="text-[#696053]">Name:</span>
                <span className="font-semibold text-[#29251F]">{submittedEnquiry.customer_name}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8D5BC]/60 pb-2">
                <span className="text-[#696053]">Phone / WhatsApp:</span>
                <span className="font-semibold text-[#29251F]">{submittedEnquiry.customer_phone}</span>
              </div>
              {submittedEnquiry.customer_email && (
                <div className="flex justify-between border-b border-[#E8D5BC]/60 pb-2">
                  <span className="text-[#696053]">Email:</span>
                  <span className="font-semibold text-[#29251F]">{submittedEnquiry.customer_email}</span>
                </div>
              )}
              <div className="pt-1">
                <span className="text-[#696053] block mb-1">Your Requirement:</span>
                <p className="font-medium text-[#29251F] bg-white p-3 rounded-xl border border-[#E8D5BC]/80 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                  {submittedEnquiry.requirement}
                </p>
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
          /* ── SIMPLE BULK ORDER FORM ── */
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl shadow-[0_12px_50px_rgba(41,37,31,0.12)] border border-[#91885D]/25 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#FAF5ED] px-6 sm:px-8 py-5 border-b border-[#91885D]/20">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#29251F]">
                Bulk Order Enquiry
              </h2>
              <p className="text-xs sm:text-sm text-[#696053] mt-1">
                Fill in your details and requirements below — our team will connect with custom pricing.
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              {/* Field 1: Name */}
              <div>
                <label className="block text-xs font-semibold text-[#696053] uppercase tracking-wider mb-1.5">
                  Name <span className="text-[#C26B59]">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#91885D]" />
                  <input
                    type="text"
                    required
                    placeholder="Your Full Name"
                    value={formData.customer_name}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_name: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E8D5BC] bg-[#FAF5ED] text-sm text-[#29251F] focus:outline-none focus:border-[#C26B59] focus:bg-white transition-all placeholder:text-[#91885D]/60"
                  />
                </div>
              </div>

              {/* Field 2: WhatsApp / Phone number */}
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
                    onChange={(e) =>
                      setFormData({ ...formData, customer_phone: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E8D5BC] bg-[#FAF5ED] text-sm text-[#29251F] focus:outline-none focus:border-[#C26B59] focus:bg-white transition-all placeholder:text-[#91885D]/60"
                  />
                </div>
              </div>

              {/* Field 3: Email address */}
              <div>
                <label className="block text-xs font-semibold text-[#696053] uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#91885D]" />
                  <input
                    type="email"
                    placeholder="e.g. you@example.com"
                    value={formData.customer_email}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_email: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E8D5BC] bg-[#FAF5ED] text-sm text-[#29251F] focus:outline-none focus:border-[#C26B59] focus:bg-white transition-all placeholder:text-[#91885D]/60"
                  />
                </div>
              </div>

              {/* Field 4: Your requirement */}
              <div>
                <label className="block text-xs font-semibold text-[#696053] uppercase tracking-wider mb-1.5">
                  Your Requirement <span className="text-[#C26B59]">*</span>
                </label>
                <div className="relative">
                  <textarea
                    required
                    rows={4}
                    placeholder="Tell us what you need (e.g. quantity, preferred items, date, packaging details, or occasion)..."
                    value={formData.requirement}
                    onChange={(e) =>
                      setFormData({ ...formData, requirement: e.target.value })
                    }
                    className="w-full p-4 rounded-xl border border-[#E8D5BC] bg-[#FAF5ED] text-sm text-[#29251F] focus:outline-none focus:border-[#C26B59] focus:bg-white transition-all placeholder:text-[#91885D]/60"
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
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-[#696053]">
                  <ShieldCheck className="h-4 w-4 text-[#7A774D]" />
                  <span>Direct connection with our kitchen team</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#C26B59] hover:bg-[#a85949] text-white px-8 py-3.5 font-bold text-sm shadow-warm-md transition-all hover:scale-[1.02] disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending Enquiry...</span>
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
