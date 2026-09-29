"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAdmin } from "@/lib/admin/AdminContext";
import type { BulkOrderEnquiry, BulkOrderStatus } from "@/types/database";
import {
  getBulkOrderEnquiriesServerAction,
  updateBulkOrderStatusServerAction,
  updateBulkOrderNotesServerAction,
  deleteBulkOrderEnquiryServerAction,
} from "./actions";
import {
  Gift,
  Search,
  RefreshCw,
  MessageCircle,
  Phone,
  Mail,
  Building,
  Calendar,
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  Trash2,
  FileText,
  Save,
  Tag,
  Loader2,
  Filter,
  ExternalLink,
} from "lucide-react";

const STATUS_CONFIG: Record<
  BulkOrderStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  new: {
    label: "New Enquiry",
    bg: "bg-amber-50",
    text: "text-amber-800 border-amber-300",
    dot: "bg-amber-500",
  },
  contacted: {
    label: "Contacted",
    bg: "bg-blue-50",
    text: "text-blue-800 border-blue-300",
    dot: "bg-blue-500",
  },
  in_discussion: {
    label: "In Discussion",
    bg: "bg-purple-50",
    text: "text-purple-800 border-purple-300",
    dot: "bg-purple-500",
  },
  confirmed: {
    label: "Confirmed / Booked",
    bg: "bg-emerald-50",
    text: "text-emerald-800 border-emerald-300",
    dot: "bg-emerald-600",
  },
  completed: {
    label: "Fulfilled & Delivered",
    bg: "bg-teal-50",
    text: "text-teal-800 border-teal-300",
    dot: "bg-teal-600",
  },
  cancelled: {
    label: "Cancelled / Closed",
    bg: "bg-rose-50",
    text: "text-rose-800 border-rose-300",
    dot: "bg-rose-500",
  },
};

export default function AdminBulkOrdersPage() {
  const { restaurant } = useAdmin();
  const [enquiries, setEnquiries] = useState<BulkOrderEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>("");

  const loadEnquiries = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await getBulkOrderEnquiriesServerAction();
      if (res.success && res.enquiries) {
        setEnquiries(res.enquiries);
      }
    } catch (err) {
      console.error("Failed to load bulk order enquiries:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEnquiries();
  }, [loadEnquiries]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadEnquiries(true);
  };

  const handleStatusChange = async (id: string, newStatus: BulkOrderStatus) => {
    setUpdatingId(id);
    try {
      const res = await updateBulkOrderStatusServerAction(id, newStatus);
      if (res.success) {
        setEnquiries((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: newStatus } : item
          )
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveNotes = async (id: string) => {
    setUpdatingId(id);
    try {
      const res = await updateBulkOrderNotesServerAction(id, noteDraft);
      if (res.success) {
        setEnquiries((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, admin_notes: noteDraft } : item
          )
        );
        setEditingNotesId(null);
      }
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this bulk order enquiry?")) {
      return;
    }
    setUpdatingId(id);
    try {
      const res = await deleteBulkOrderEnquiryServerAction(id);
      if (res.success) {
        setEnquiries((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete enquiry:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter and search
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((item) => {
      // Status filter
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.customer_name?.toLowerCase().includes(q);
        const matchPhone = item.customer_phone?.toLowerCase().includes(q);
        const matchEmail = item.customer_email?.toLowerCase().includes(q);
        const matchCompany = item.company_name?.toLowerCase().includes(q);
        const matchRef = item.enquiry_number?.toLowerCase().includes(q);
        const matchOccasion = item.occasion?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchCompany && !matchRef && !matchOccasion) {
          return false;
        }
      }
      return true;
    });
  }, [enquiries, statusFilter, searchQuery]);

  // Counts for tabs
  const counts = useMemo(() => {
    const total = enquiries.length;
    const newCount = enquiries.filter((e) => e.status === "new").length;
    const contactedCount = enquiries.filter((e) => e.status === "contacted").length;
    const inDiscussionCount = enquiries.filter((e) => e.status === "in_discussion").length;
    const confirmedCount = enquiries.filter((e) => e.status === "confirmed").length;
    return { total, newCount, contactedCount, inDiscussionCount, confirmedCount };
  }, [enquiries]);

  const constructWhatsAppUrl = (enquiry: BulkOrderEnquiry) => {
    const phone = enquiry.customer_phone.replace(/[^0-9]/g, "");
    const cleanPhone = phone.startsWith("91") ? phone : `91${phone}`;
    const text = encodeURIComponent(
      `Hello ${enquiry.customer_name}! 👩‍🍳\n\n` +
      `This is Vasvi from The Indulgent Spoon regarding your Bulk Gifting Enquiry (#${enquiry.enquiry_number || "REF"}).\n\n` +
      `We'd love to curate the perfect handcrafted confection boxes for your ${enquiry.occasion} (${enquiry.estimated_quantity}).\n\n` +
      `Would you like me to share our seasonal catalogue and sample flavor menu?`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-spoon-border shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-spoon-sand text-spoon-caramel border border-spoon-border">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-spoon-dark">
                Bulk Order & Gifting Enquiries
              </h1>
              <p className="text-xs text-spoon-muted">
                Track and manage custom corporate gifting, wedding favors, and party orders
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <a
            href="/bulk-orders"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-spoon-cream text-spoon-dark border border-spoon-border hover:bg-spoon-sand transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-spoon-caramel" />
            <span>Open Public Survey</span>
          </a>

          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl bg-spoon-caramel text-white px-4 py-2 text-xs font-semibold hover:bg-spoon-caramel/90 transition-colors shadow-2xs disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── METRIC CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-spoon-border shadow-2xs">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-spoon-muted">
            Total Inquiries
          </p>
          <p className="font-serif text-2xl font-bold text-spoon-dark mt-1">
            {counts.total}
          </p>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-amber-800">
            New / Uncontacted
          </p>
          <p className="font-serif text-2xl font-bold text-amber-900 mt-1">
            {counts.newCount}
          </p>
        </div>

        <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 shadow-2xs">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-purple-800">
            In Discussion
          </p>
          <p className="font-serif text-2xl font-bold text-purple-900 mt-1">
            {counts.inDiscussionCount}
          </p>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-emerald-800">
            Confirmed / Booked
          </p>
          <p className="font-serif text-2xl font-bold text-emerald-900 mt-1">
            {counts.confirmedCount}
          </p>
        </div>
      </div>

      {/* ── CONTROLS & FILTER TABS ── */}
      <div className="bg-white p-4 rounded-2xl border border-spoon-border shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-spoon-muted" />
            <input
              type="text"
              placeholder="Search by customer, phone, company, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-spoon-cream/50 border border-spoon-border focus:outline-none focus:border-spoon-caramel"
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold">
            {[
              { id: "all", label: "All", count: counts.total },
              { id: "new", label: "New", count: counts.newCount },
              { id: "contacted", label: "Contacted", count: counts.contactedCount },
              { id: "in_discussion", label: "In Discussion", count: counts.inDiscussionCount },
              { id: "confirmed", label: "Confirmed", count: counts.confirmedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? "bg-spoon-caramel text-white shadow-2xs"
                    : "bg-spoon-cream/70 text-spoon-muted hover:bg-spoon-sand/70 hover:text-spoon-dark"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === tab.id ? "bg-white/20 text-white" : "bg-spoon-border/80 text-spoon-dark"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ENQUIRY LIST ── */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-spoon-border">
          <Loader2 className="h-8 w-8 animate-spin text-spoon-caramel" />
          <p className="text-xs text-spoon-muted">Loading bulk enquiries...</p>
        </div>
      ) : filteredEnquiries.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-spoon-border text-center p-6">
          <div className="w-14 h-14 rounded-full bg-spoon-sand flex items-center justify-center text-spoon-caramel">
            <Gift className="h-6 w-6" />
          </div>
          <h3 className="font-serif text-base font-bold text-spoon-dark">
            No bulk enquiries found
          </h3>
          <p className="text-xs text-spoon-muted max-w-sm">
            {searchQuery || statusFilter !== "all"
              ? "Try clearing your search query or switching the status filter."
              : "When customers submit the survey on /bulk-orders, their requests will appear here instantly."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEnquiries.map((enquiry) => {
            const statusConf = STATUS_CONFIG[enquiry.status] || STATUS_CONFIG.new;
            const isEditingThisNote = editingNotesId === enquiry.id;
            const isUpdatingThis = updatingId === enquiry.id;

            return (
              <div
                key={enquiry.id}
                className="bg-white rounded-2xl border border-spoon-border shadow-2xs p-5 sm:p-6 transition-all hover:shadow-warm-sm"
              >
                {/* Top Row: Ref, Date, Status */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-spoon-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-spoon-sand text-spoon-dark border border-spoon-border">
                      #{enquiry.enquiry_number || "ENQ-REF"}
                    </span>
                    <span className="text-[11px] text-spoon-muted flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(enquiry.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusConf.bg} ${statusConf.text}`}>
                      <span className={`w-2 h-2 rounded-full ${statusConf.dot}`} />
                      <span>{statusConf.label}</span>
                    </span>

                    <select
                      value={enquiry.status}
                      disabled={isUpdatingThis}
                      onChange={(e) =>
                        handleStatusChange(enquiry.id, e.target.value as BulkOrderStatus)
                      }
                      className="text-xs font-medium rounded-xl border border-spoon-border bg-spoon-cream/60 px-2.5 py-1 text-spoon-dark focus:outline-none focus:border-spoon-caramel cursor-pointer"
                    >
                      <option value="new">Mark as New</option>
                      <option value="contacted">Mark as Contacted</option>
                      <option value="in_discussion">Mark as In Discussion</option>
                      <option value="confirmed">Mark as Confirmed</option>
                      <option value="completed">Mark as Fulfilled</option>
                      <option value="cancelled">Mark as Cancelled</option>
                    </select>

                    <button
                      onClick={() => handleDelete(enquiry.id)}
                      title="Delete enquiry"
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Main Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
                  {/* Left Col: Customer & Quick Action Buttons */}
                  <div className="lg:col-span-4 space-y-3">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-spoon-dark">
                        {enquiry.customer_name}
                      </h3>
                      {enquiry.company_name && (
                        <p className="text-xs text-spoon-muted flex items-center gap-1.5 mt-0.5">
                          <Building className="h-3.5 w-3.5 text-spoon-caramel" />
                          <span>{enquiry.company_name}</span>
                        </p>
                      )}
                    </div>

                    {/* Contact Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <a
                        href={constructWhatsAppUrl(enquiry)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold transition-transform hover:scale-105 shadow-2xs"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>WhatsApp</span>
                      </a>

                      <a
                        href={`tel:${enquiry.customer_phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-spoon-cream text-spoon-dark hover:bg-spoon-sand border border-spoon-border text-xs font-semibold transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5 text-spoon-caramel" />
                        <span>{enquiry.customer_phone}</span>
                      </a>

                      {enquiry.customer_email && (
                        <a
                          href={`mailto:${enquiry.customer_email}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-spoon-cream text-spoon-dark hover:bg-spoon-sand border border-spoon-border text-xs font-semibold transition-colors"
                        >
                          <Mail className="h-3.5 w-3.5 text-spoon-caramel" />
                          <span>{enquiry.customer_email}</span>
                        </a>
                      )}
                    </div>

                    {/* Event & Location info */}
                    <div className="text-xs text-spoon-muted space-y-1.5 pt-2">
                      {enquiry.target_date && (
                        <div className="flex items-center gap-2 text-spoon-dark">
                          <Calendar className="h-3.5 w-3.5 text-spoon-caramel" />
                          <span>Event Date: <strong>{enquiry.target_date}</strong></span>
                        </div>
                      )}
                      {enquiry.delivery_location && (
                        <div className="flex items-center gap-2 text-spoon-dark">
                          <MapPin className="h-3.5 w-3.5 text-spoon-caramel" />
                          <span>Location: <strong>{enquiry.delivery_location}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Col: Order Requirements & Tags */}
                  <div className="lg:col-span-5 space-y-3 lg:border-l lg:border-spoon-border/60 lg:pl-6">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-spoon-sand/70 text-spoon-dark text-xs font-bold border border-spoon-border">
                        🎉 {enquiry.occasion}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-spoon-sand/70 text-spoon-dark text-xs font-bold border border-spoon-border">
                        📦 {enquiry.estimated_quantity}
                      </span>
                      {enquiry.budget_range && (
                        <span className="px-2.5 py-1 rounded-lg bg-spoon-sand/70 text-spoon-dark text-xs font-bold border border-spoon-border">
                          💰 {enquiry.budget_range}
                        </span>
                      )}
                    </div>

                    {/* Product Interests */}
                    {enquiry.product_interests && enquiry.product_interests.length > 0 && (
                      <div>
                        <p className="text-[11px] uppercase font-bold tracking-wider text-spoon-muted mb-1.5">
                          Delicacies of Interest:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {enquiry.product_interests.map((prod, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-[#FAF5ED] text-xs font-medium text-[#7A774D] border border-[#7A774D]/20"
                            >
                              {prod}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dietary / Customizations */}
                    {enquiry.dietary_preferences && enquiry.dietary_preferences.length > 0 && (
                      <div>
                        <p className="text-[11px] uppercase font-bold tracking-wider text-spoon-muted mb-1.5">
                          Dietary & Packaging:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {enquiry.dietary_preferences.map((diet, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-amber-50 text-[11px] font-medium text-amber-800 border border-amber-200"
                            >
                              ✓ {diet}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message / Special Note */}
                    {enquiry.message && (
                      <div className="bg-spoon-cream/40 p-3 rounded-xl border border-spoon-border text-xs text-spoon-dark leading-relaxed">
                        <span className="font-semibold text-spoon-caramel block mb-0.5">
                          Customer Message / Requests:
                        </span>
                        &ldquo;{enquiry.message}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* Right Col: Admin Internal Notes */}
                  <div className="lg:col-span-3 space-y-2 lg:border-l lg:border-spoon-border/60 lg:pl-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[11px] uppercase font-bold tracking-wider text-spoon-muted flex items-center gap-1">
                          <FileText className="h-3 w-3 text-spoon-caramel" />
                          <span>Internal Admin Notes</span>
                        </p>
                        {!isEditingThisNote && (
                          <button
                            onClick={() => {
                              setEditingNotesId(enquiry.id);
                              setNoteDraft(enquiry.admin_notes || "");
                            }}
                            className="text-[11px] font-semibold text-spoon-caramel hover:underline"
                          >
                            {enquiry.admin_notes ? "Edit" : "+ Add"}
                          </button>
                        )}
                      </div>

                      {isEditingThisNote ? (
                        <div className="space-y-2">
                          <textarea
                            rows={3}
                            placeholder="e.g. Quoted ₹24k for 60 boxes. Sent tasting box via Dunzo..."
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-spoon-caramel bg-white focus:outline-none"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingNotesId(null)}
                              className="px-2.5 py-1 text-xs text-spoon-muted hover:text-spoon-dark"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveNotes(enquiry.id)}
                              disabled={isUpdatingThis}
                              className="px-3 py-1 text-xs font-semibold bg-spoon-caramel text-white rounded-lg hover:bg-spoon-caramel/90"
                            >
                              Save Note
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-spoon-cream/30 border border-spoon-border text-xs text-spoon-muted min-h-[50px] italic">
                          {enquiry.admin_notes || "No internal notes added yet."}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 text-[10px] text-spoon-muted">
                      Last Updated: {enquiry.updated_at ? new Date(enquiry.updated_at).toLocaleDateString() : "Just now"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
