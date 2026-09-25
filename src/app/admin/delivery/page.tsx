"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAdmin } from "@/lib/admin/AdminContext";
import { getAdminCategories } from "@/lib/admin/admin-service";
import {
  getAdminDeliverySlots,
  getDeliverySlotTemplates,
  formatSlotWindow,
} from "@/lib/delivery-slots-service";
import {
  createDeliverySlotsBulkServerAction,
  updateDeliverySlotServerAction,
  deleteDeliverySlotServerAction,
  toggleDateClosureServerAction,
  deleteSlotsForDateServerAction,
  saveDeliveryTemplateServerAction,
  deleteDeliveryTemplateServerAction,
} from "./actions";
import type {
  Category,
  DeliverySlot,
  DeliverySlotTemplate,
  SlotTimeWindow,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  X,
  Check,
  FolderTree,
  Store,
  Tag,
} from "lucide-react";

export default function AdminDeliveryPage() {
  const { restaurant } = useAdmin();
  const searchParams = useSearchParams();
  const initialCategoryParam = searchParams.get("category") || "all";

  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [templates, setTemplates] = useState<DeliverySlotTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & View Mode
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>(initialCategoryParam);
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());

  // Modals
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<string>("");
  const [editingSlot, setEditingSlot] = useState<DeliverySlot | null>(null);

  // Bulk Create Wizard State
  const [bulkCategory, setBulkCategory] = useState<string>(
    initialCategoryParam === "all" ? "" : initialCategoryParam
  );
  const [bulkStartDate, setBulkStartDate] = useState<string>("");
  const [bulkEndDate, setBulkEndDate] = useState<string>("");
  const [bulkDaysOfWeek, setBulkDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]); // All days
  const [bulkTimeWindows, setBulkTimeWindows] = useState<SlotTimeWindow[]>([
    { start_time: "10:00", end_time: "13:00", capacity: 10 },
    { start_time: "14:00", end_time: "17:00", capacity: 10 },
    { start_time: "18:00", end_time: "21:00", capacity: 10 },
  ]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [submittingBulk, setSubmittingBulk] = useState(false);

  // Single Day Slot Form
  const [newSlotStart, setNewSlotStart] = useState("10:00");
  const [newSlotEnd, setNewSlotEnd] = useState("13:00");
  const [newSlotCapacity, setNewSlotCapacity] = useState(10);
  const [newSlotCategory, setNewSlotCategory] = useState<string>(
    initialCategoryParam === "all" ? "" : initialCategoryParam
  );
  const [closureReason, setClosureReason] = useState("");
  const [submittingDayAction, setSubmittingDayAction] = useState(false);

  // Set initial bulk date range (Today to +30 days)
  useEffect(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    setBulkStartDate(`${y}-${m}-${d}`);

    const next30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ny = next30.getFullYear();
    const nm = String(next30.getMonth() + 1).padStart(2, "0");
    const nd = String(next30.getDate()).padStart(2, "0");
    setBulkEndDate(`${ny}-${nm}-${nd}`);
  }, []);

  // Update category selection when URL query param changes
  useEffect(() => {
    const queryCat = searchParams.get("category");
    if (queryCat) {
      setSelectedCategoryFilter(queryCat);
      setBulkCategory(queryCat);
      setNewSlotCategory(queryCat);
    }
  }, [searchParams]);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!restaurant?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const [catsData, templatesData, slotsData] = await Promise.all([
        getAdminCategories(restaurant.id),
        getDeliverySlotTemplates(restaurant.id),
        getAdminDeliverySlots(restaurant.id),
      ]);

      setCategories(catsData);
      setTemplates(templatesData);
      setSlots(slotsData);
    } catch (err: unknown) {
      console.error("Fetch delivery data error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to load schedule data");
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Flash success helper
  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Category switch handler
  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryFilter(catId);
    setBulkCategory(catId === "all" ? "" : catId);
    setNewSlotCategory(catId === "all" ? "" : catId);
  };

  // Bulk Create Action via Server Action
  const handleBulkCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) return;

    if (!bulkStartDate || !bulkEndDate) {
      setErrorMsg("Please select both start and end dates.");
      return;
    }
    if (bulkDaysOfWeek.length === 0) {
      setErrorMsg("Please select at least one day of the week.");
      return;
    }
    if (bulkTimeWindows.length === 0) {
      setErrorMsg("Please add at least one time window.");
      return;
    }

    try {
      setSubmittingBulk(true);
      setErrorMsg(null);

      // 1. Create slots via Server Action
      const result = await createDeliverySlotsBulkServerAction({
        restaurantId: restaurant.id,
        categoryId: bulkCategory || null,
        startDate: bulkStartDate,
        endDate: bulkEndDate,
        daysOfWeek: bulkDaysOfWeek,
        slots: bulkTimeWindows,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create slots.");
      }

      // 2. Save as template if checked
      if (saveAsTemplate && newTemplateName.trim()) {
        await saveDeliveryTemplateServerAction(
          restaurant.id,
          newTemplateName.trim(),
          bulkTimeWindows,
          bulkCategory || null
        );
      }

      const categoryName = bulkCategory
        ? categories.find((c) => c.id === bulkCategory)?.name || "selected category"
        : "all categories (store-wide)";

      notifySuccess(
        `Generated ${result.count || 0} delivery slots for ${categoryName}!`
      );
      setShowBulkModal(false);
      await fetchData();
    } catch (err: unknown) {
      console.error("Bulk create error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to generate schedule.");
    } finally {
      setSubmittingBulk(false);
    }
  };

  // Add time window row in bulk modal
  const addTimeWindowRow = () => {
    setBulkTimeWindows((prev) => [
      ...prev,
      { start_time: "12:00", end_time: "15:00", capacity: 10 },
    ]);
  };

  // Remove time window row in bulk modal
  const removeTimeWindowRow = (idx: number) => {
    setBulkTimeWindows((prev) => prev.filter((_, i) => i !== idx));
  };

  // Apply template to bulk wizard
  const applyTemplateToBulkForm = (tpl: DeliverySlotTemplate) => {
    if (tpl.slots && tpl.slots.length > 0) {
      setBulkTimeWindows(tpl.slots);
    }
    if (tpl.category_id) {
      setBulkCategory(tpl.category_id);
      setSelectedCategoryFilter(tpl.category_id);
    }
    setShowTemplatesModal(false);
    setShowBulkModal(true);
    notifySuccess(`Applied template: "${tpl.name}"`);
  };

  // Quick preset for days of week
  const setDaysPreset = (type: "all" | "weekdays" | "weekends") => {
    if (type === "all") setBulkDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
    if (type === "weekdays") setBulkDaysOfWeek([1, 2, 3, 4, 5]);
    if (type === "weekends") setBulkDaysOfWeek([0, 6]);
  };

  // Toggle single day of week
  const toggleDayOfWeek = (day: number) => {
    setBulkDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  // Open Day Management Modal
  const openDayModal = (dateStr: string) => {
    setSelectedDayDate(dateStr);
    const daySlots = slots.filter((s) => s.date === dateStr);
    const isClosed = daySlots.some((s) => s.is_closed);
    const reason = daySlots.find((s) => s.closed_reason)?.closed_reason || "";
    setClosureReason(reason);
    setNewSlotCategory(selectedCategoryFilter === "all" ? "" : selectedCategoryFilter);
    setShowDayModal(true);
  };

  // Add single slot to specific date via Server Action
  const handleAddSlotToDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id || !selectedDayDate) return;

    try {
      setSubmittingDayAction(true);
      setErrorMsg(null);

      const targetCategory = newSlotCategory || null;

      const result = await createDeliverySlotsBulkServerAction({
        restaurantId: restaurant.id,
        categoryId: targetCategory,
        startDate: selectedDayDate,
        endDate: selectedDayDate,
        daysOfWeek: [new Date(`${selectedDayDate}T00:00:00`).getDay()],
        slots: [
          {
            start_time: newSlotStart,
            end_time: newSlotEnd,
            capacity: Number(newSlotCapacity) || 10,
          },
        ],
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to add slot.");
      }

      notifySuccess(`Added ${formatSlotWindow(newSlotStart, newSlotEnd)} on ${selectedDayDate}`);
      await fetchData();
    } catch (err: unknown) {
      console.error("Add single slot error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to add slot.");
    } finally {
      setSubmittingDayAction(false);
    }
  };

  // Toggle Date Closure via Server Action
  const handleToggleClosure = async (dateStr: string, currentClosed: boolean) => {
    if (!restaurant?.id) return;
    try {
      setSubmittingDayAction(true);
      const res = await toggleDateClosureServerAction(
        restaurant.id,
        dateStr,
        !currentClosed,
        closureReason
      );

      if (!res.success) {
        throw new Error(res.error || "Failed to toggle date closure.");
      }

      notifySuccess(
        !currentClosed
          ? `Date ${dateStr} marked as closed / holiday.`
          : `Date ${dateStr} reopened for deliveries.`
      );
      await fetchData();
    } catch (err: unknown) {
      console.error("Toggle closure error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to toggle date closure.");
    } finally {
      setSubmittingDayAction(false);
    }
  };

  // Delete all slots on date via Server Action
  const handleDeleteDateSlots = async (dateStr: string) => {
    if (!restaurant?.id) return;
    if (!confirm(`Are you sure you want to delete all delivery slots on ${dateStr}?`)) return;

    try {
      setSubmittingDayAction(true);
      const res = await deleteSlotsForDateServerAction(restaurant.id, dateStr);
      if (!res.success) {
        throw new Error(res.error || "Failed to delete slots.");
      }

      notifySuccess(`Deleted all delivery slots on ${dateStr}`);
      setShowDayModal(false);
      await fetchData();
    } catch (err: unknown) {
      console.error("Delete date slots error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete slots.");
    } finally {
      setSubmittingDayAction(false);
    }
  };

  // Delete single slot via Server Action
  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Are you sure you want to delete this delivery slot?")) return;
    try {
      const res = await deleteDeliverySlotServerAction(slotId);
      if (!res.success) {
        throw new Error(res.error || "Failed to delete slot.");
      }
      notifySuccess("Delivery slot deleted.");
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err: unknown) {
      console.error("Delete slot error:", err);
      setErrorMsg("Failed to delete slot.");
    }
  };

  // Save Edit Slot Modal via Server Action
  const handleSaveSlotEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    try {
      const res = await updateDeliverySlotServerAction(editingSlot.id, {
        capacity: editingSlot.capacity,
        is_active: editingSlot.is_active,
        is_closed: editingSlot.is_closed,
        closed_reason: editingSlot.closed_reason,
      });

      if (!res.success || !res.slot) {
        throw new Error(res.error || "Failed to update slot.");
      }

      setSlots((prev) => prev.map((s) => (s.id === res.slot.id ? res.slot : s)));
      notifySuccess("Delivery slot updated successfully.");
      setEditingSlot(null);
    } catch (err: unknown) {
      console.error("Update slot error:", err);
      setErrorMsg("Failed to update slot.");
    }
  };

  // Delete Template via Server Action
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Delete this delivery schedule template?")) return;
    try {
      const res = await deleteDeliveryTemplateServerAction(templateId);
      if (!res.success) {
        throw new Error(res.error || "Failed to delete template.");
      }
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      notifySuccess("Template removed.");
    } catch (err: unknown) {
      console.error("Delete template error:", err);
      setErrorMsg("Failed to delete template.");
    }
  };

  // Filtered Slots: When category is selected, show category slots + storewide slots
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (selectedCategoryFilter !== "all") {
        // Show slots specifically for this category OR store-wide slots (null category_id)
        if (slot.category_id && slot.category_id !== selectedCategoryFilter) {
          return false;
        }
      }
      return true;
    });
  }, [slots, selectedCategoryFilter]);

  // Group filtered slots by date
  const slotsByDateMap = useMemo(() => {
    const map: Record<string, DeliverySlot[]> = {};
    for (const slot of filteredSlots) {
      if (!map[slot.date]) map[slot.date] = [];
      map[slot.date].push(slot);
    }
    return map;
  }, [filteredSlots]);

  // Calendar Grid Calculation
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayIndex = firstDayOfMonth.getDay(); // 0 = Sun
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const daysArray: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      slots: DeliverySlot[];
      isClosed: boolean;
      totalCapacity: number;
      totalBooked: number;
    }> = [];

    // Preceding month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, pDay);
      const py = prevDate.getFullYear();
      const pm = String(prevDate.getMonth() + 1).padStart(2, "0");
      const pd = String(prevDate.getDate()).padStart(2, "0");
      const pDateStr = `${py}-${pm}-${pd}`;

      daysArray.push({
        dateStr: pDateStr,
        dayNumber: pDay,
        isCurrentMonth: false,
        slots: slotsByDateMap[pDateStr] || [],
        isClosed: (slotsByDateMap[pDateStr] || []).some((s) => s.is_closed),
        totalCapacity: (slotsByDateMap[pDateStr] || []).reduce((acc, s) => acc + s.capacity, 0),
        totalBooked: (slotsByDateMap[pDateStr] || []).reduce((acc, s) => acc + s.current_order_count, 0),
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const curDate = new Date(year, month, d);
      const cy = curDate.getFullYear();
      const cm = String(curDate.getMonth() + 1).padStart(2, "0");
      const cd = String(curDate.getDate()).padStart(2, "0");
      const cDateStr = `${cy}-${cm}-${cd}`;

      const daySlots = slotsByDateMap[cDateStr] || [];
      const isClosed = daySlots.some((s) => s.is_closed);
      const totalCapacity = daySlots.reduce((acc, s) => acc + s.capacity, 0);
      const totalBooked = daySlots.reduce((acc, s) => acc + s.current_order_count, 0);

      daysArray.push({
        dateStr: cDateStr,
        dayNumber: d,
        isCurrentMonth: true,
        slots: daySlots,
        isClosed,
        totalCapacity,
        totalBooked,
      });
    }

    // Trailing month padding
    const remaining = (7 - (daysArray.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const ny = nextDate.getFullYear();
      const nm = String(nextDate.getMonth() + 1).padStart(2, "0");
      const nd = String(nextDate.getDate()).padStart(2, "0");
      const nDateStr = `${ny}-${nm}-${nd}`;

      daysArray.push({
        dateStr: nDateStr,
        dayNumber: i,
        isCurrentMonth: false,
        slots: slotsByDateMap[nDateStr] || [],
        isClosed: (slotsByDateMap[nDateStr] || []).some((s) => s.is_closed),
        totalCapacity: (slotsByDateMap[nDateStr] || []).reduce((acc, s) => acc + s.capacity, 0),
        totalBooked: (slotsByDateMap[nDateStr] || []).reduce((acc, s) => acc + s.current_order_count, 0),
      });
    }

    return daysArray;
  }, [currentCalendarDate, slotsByDateMap]);

  return (
    <div className="max-w-6xl space-y-6">
      {/* ── HEADER & TOP ACTIONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-spoon-border/60">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-spoon-dark flex items-center gap-2.5">
            <span>Delivery Schedule</span>
            <span className="text-xs font-sans font-bold px-2.5 py-0.5 rounded-full bg-spoon-sand text-spoon-caramel border border-spoon-border">
              {slots.length} Total Slots
            </span>
          </h1>
          <p className="text-xs text-spoon-muted mt-0.5">
            Configure delivery dates, hourly time slots, order capacity, and holiday closures by category.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplatesModal(true)}
            className="gap-1.5 text-xs font-semibold"
          >
            <Layers className="h-3.5 w-3.5 text-spoon-caramel" />
            <span>Templates ({templates.length})</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setBulkCategory(selectedCategoryFilter === "all" ? "" : selectedCategoryFilter);
              setShowBulkModal(true);
            }}
            className="gap-1.5 text-xs font-bold bg-spoon-caramel hover:bg-spoon-caramel-dark text-white shadow-warm-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Quick Add Bulk Schedule</span>
          </Button>
        </div>
      </div>

      {/* ── ALERTS / FEEDBACK ── */}
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

      {/* ── CATEGORY SELECTOR TABS BAR ── */}
      <div className="space-y-2 bg-white p-4 rounded-3xl border border-spoon-border shadow-warm-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-spoon-muted flex items-center gap-1.5">
            <FolderTree className="h-3.5 w-3.5 text-spoon-caramel" />
            <span>Category Schedule Filter:</span>
          </span>
          <Button
            size="sm"
            onClick={() => {
              setBulkCategory(selectedCategoryFilter === "all" ? "" : selectedCategoryFilter);
              setShowBulkModal(true);
            }}
            className="gap-1.5 text-xs font-bold bg-spoon-caramel hover:bg-spoon-caramel-dark text-white rounded-xl self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>
              {selectedCategoryFilter === "all"
                ? "Add Slots (All Categories)"
                : `+ Add Slots for "${categories.find((c) => c.id === selectedCategoryFilter)?.name || "Selected"}"`}
            </span>
          </Button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin pt-1">
          {/* Store-wide / All Categories Button */}
          <button
            type="button"
            onClick={() => handleSelectCategory("all")}
            className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer select-none ${
              selectedCategoryFilter === "all"
                ? "bg-spoon-caramel text-white border-spoon-caramel shadow-warm-sm scale-[1.02]"
                : "bg-spoon-cream/40 text-spoon-dark border-spoon-border hover:bg-spoon-sand/50"
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            <span>All Categories (Store-wide)</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                selectedCategoryFilter === "all"
                  ? "bg-white/20 text-white"
                  : "bg-spoon-sand text-spoon-dark"
              }`}
            >
              {slots.length}
            </span>
          </button>

          {/* Individual Category Buttons */}
          {categories.map((cat) => {
            const isSelected = selectedCategoryFilter === cat.id;
            const catSlotCount = slots.filter((s) => s.category_id === cat.id).length;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat.id)}
                className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer select-none ${
                  isSelected
                    ? "bg-spoon-caramel text-white border-spoon-caramel shadow-warm-sm scale-[1.02]"
                    : "bg-spoon-cream/40 text-spoon-dark border-spoon-border hover:bg-spoon-sand/50"
                }`}
              >
                <Tag className="h-3 w-3 opacity-70" />
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-spoon-sand text-spoon-dark"
                  }`}
                >
                  {catSlotCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── FILTER & VIEW BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-spoon-border shadow-warm-sm">
        {/* Active Scope Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-spoon-muted">Showing:</span>
          <span className="text-xs font-bold text-spoon-dark px-2.5 py-1 rounded-xl bg-spoon-sand/60 border border-spoon-border">
            {selectedCategoryFilter === "all"
              ? "All Categories (Store-wide)"
              : `Category: ${categories.find((c) => c.id === selectedCategoryFilter)?.name || ""}`}
          </span>
          <span className="text-[11px] text-spoon-muted">
            ({filteredSlots.length} slots available)
          </span>
        </div>

        {/* View Switcher & Month Navigation */}
        <div className="flex items-center gap-3">
          {viewMode === "calendar" && (
            <div className="flex items-center gap-1.5 bg-spoon-cream/60 rounded-2xl p-1 border border-spoon-border">
              <button
                type="button"
                onClick={() =>
                  setCurrentCalendarDate(
                    new Date(
                      currentCalendarDate.getFullYear(),
                      currentCalendarDate.getMonth() - 1,
                      1
                    )
                  )
                }
                className="p-1 rounded-xl text-spoon-dark hover:bg-white transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="font-serif text-xs font-bold px-2 min-w-[120px] text-center text-spoon-dark">
                {currentCalendarDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentCalendarDate(
                    new Date(
                      currentCalendarDate.getFullYear(),
                      currentCalendarDate.getMonth() + 1,
                      1
                    )
                  )
                }
                className="p-1 rounded-xl text-spoon-dark hover:bg-white transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex rounded-2xl bg-spoon-cream/60 p-1 border border-spoon-border">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-spoon-caramel text-white shadow-xs"
                  : "text-spoon-muted hover:text-spoon-dark"
              }`}
            >
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-spoon-caramel text-white shadow-xs"
                  : "text-spoon-muted hover:text-spoon-dark"
              }`}
            >
              List View
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-spoon-border">
          <Loader2 className="h-7 w-7 animate-spin text-spoon-caramel" />
          <span className="text-xs font-semibold text-spoon-muted">
            Loading delivery schedule...
          </span>
        </div>
      ) : viewMode === "calendar" ? (
        /* ════════════════════ CALENDAR VIEW ════════════════════ */
        <div className="rounded-3xl border border-spoon-border bg-white shadow-warm-sm overflow-hidden">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b border-spoon-border bg-spoon-cream/40 text-center text-[11px] font-bold uppercase tracking-wider text-spoon-muted py-3">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-spoon-border/60">
            {calendarDays.map((cell, idx) => {
              const hasSlots = cell.slots.length > 0;
              const isFull = cell.totalCapacity > 0 && cell.totalBooked >= cell.totalCapacity;
              const isToday =
                cell.dateStr === new Date().toISOString().slice(0, 10);

              return (
                <div
                  key={`${cell.dateStr}-${idx}`}
                  onClick={() => openDayModal(cell.dateStr)}
                  className={`min-h-[105px] sm:min-h-[120px] p-2 sm:p-2.5 transition-all cursor-pointer group flex flex-col justify-between ${
                    !cell.isCurrentMonth
                      ? "bg-spoon-sand/15 opacity-40 hover:opacity-80"
                      : cell.isClosed
                      ? "bg-rose-50/50 hover:bg-rose-50"
                      : isFull
                      ? "bg-amber-50/40 hover:bg-amber-50/70"
                      : hasSlots
                      ? "bg-white hover:bg-spoon-cream/40"
                      : "bg-white hover:bg-spoon-sand/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        isToday
                          ? "bg-spoon-caramel text-white shadow-xs"
                          : cell.isCurrentMonth
                          ? "text-spoon-dark"
                          : "text-spoon-muted"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {cell.isClosed ? (
                      <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 uppercase tracking-wider">
                        Closed
                      </span>
                    ) : hasSlots ? (
                      <span
                        className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          isFull
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {cell.slots.length} {cell.slots.length === 1 ? "Slot" : "Slots"}
                      </span>
                    ) : null}
                  </div>

                  {/* Slot Details in Day Cell */}
                  <div className="my-1.5 space-y-1">
                    {cell.isClosed ? (
                      <p className="text-[10px] text-rose-700 italic truncate font-medium">
                        Holiday / Off
                      </p>
                    ) : hasSlots ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[10px] font-medium text-spoon-muted">
                          <span>Capacity:</span>
                          <span className="font-bold text-spoon-dark">
                            {cell.totalBooked} / {cell.totalCapacity}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="h-1.5 w-full rounded-full bg-spoon-sand overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isFull ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                (cell.totalBooked / (cell.totalCapacity || 1)) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-spoon-muted/60 block opacity-0 group-hover:opacity-100 transition-opacity">
                        + Click to add slots
                      </span>
                    )}
                  </div>

                  <div className="text-[9.5px] text-spoon-muted text-right font-medium">
                    {hasSlots && (
                      <span className="text-spoon-caramel hover:underline">Manage &rarr;</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ════════════════════ LIST VIEW ════════════════════ */
        <div className="rounded-3xl border border-spoon-border bg-white shadow-warm-sm overflow-hidden">
          {filteredSlots.length === 0 ? (
            <div className="py-16 text-center text-spoon-muted text-xs">
              No delivery slots found for this category. Click &ldquo;Quick Add Bulk Schedule&rdquo; to generate slots.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-spoon-dark">
                <thead className="border-b border-spoon-border bg-spoon-cream/40 font-bold uppercase tracking-wider text-spoon-muted text-[10px]">
                  <tr>
                    <th className="px-6 py-4">Delivery Date</th>
                    <th className="px-6 py-4">Time Window</th>
                    <th className="px-6 py-4">Category Scope</th>
                    <th className="px-6 py-4">Capacity &amp; Bookings</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-spoon-border/60">
                  {filteredSlots.map((slot) => {
                    const isFull = slot.current_order_count >= slot.capacity;
                    const catObj = categories.find((c) => c.id === slot.category_id);
                    const catName = catObj?.name || "Store-wide (All Products)";

                    return (
                      <tr key={slot.id} className="hover:bg-spoon-sand/15 transition-colors">
                        <td className="px-6 py-4 font-bold text-spoon-dark whitespace-nowrap">
                          {new Date(`${slot.date}T00:00:00`).toLocaleDateString("en-IN", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>

                        <td className="px-6 py-4 font-bold text-spoon-caramel whitespace-nowrap">
                          {formatSlotWindow(slot.start_time, slot.end_time)}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                              slot.category_id
                                ? "bg-amber-100/70 text-amber-900 border border-amber-300/60"
                                : "bg-spoon-sand text-spoon-dark border border-spoon-border"
                            }`}
                          >
                            {catName}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1 max-w-[140px]">
                            <div className="flex justify-between text-[11px] font-semibold">
                              <span>{slot.current_order_count} booked</span>
                              <span className="text-spoon-muted">max {slot.capacity}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-spoon-sand overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isFull ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (slot.current_order_count / (slot.capacity || 1)) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {slot.is_closed ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              Closed
                            </span>
                          ) : !slot.is_active ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                              Inactive
                            </span>
                          ) : isFull ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Full
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Active
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingSlot(slot)}
                              className="p-1.5 rounded-lg bg-spoon-sand/70 text-spoon-dark hover:bg-spoon-sand transition-colors cursor-pointer"
                              title="Edit capacity"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                              title="Delete slot"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
      )}

      {/* ════════════════════ QUICK ADD BULK MODAL ════════════════════ */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-spoon-border bg-white p-6 shadow-warm-xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-spoon-border/60">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-spoon-sand text-spoon-caramel">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-spoon-dark">
                    Quick Add Bulk Schedule
                  </h3>
                  <p className="text-xs text-spoon-muted">
                    Generate an entire month of delivery slots in seconds.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-spoon-sand text-spoon-dark hover:bg-spoon-border transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleBulkCreate} className="space-y-4 text-xs">
              {/* Step 1: Category Scope */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted block mb-1.5">
                  1. Target Category *
                </label>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-spoon-border bg-spoon-cream/40 px-3.5 text-xs font-bold text-spoon-dark focus:outline-none focus:ring-2 focus:ring-spoon-caramel/30 cursor-pointer"
                >
                  <option value="">Store-wide (Applies to all products/categories)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      Category: {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Date Range */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted block mb-1.5">
                  2. Date Range
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-spoon-muted block mb-1">Start Date</span>
                    <input
                      type="date"
                      value={bulkStartDate}
                      onChange={(e) => setBulkStartDate(e.target.value)}
                      required
                      className="w-full h-10 rounded-2xl border border-spoon-border bg-spoon-cream/40 px-3.5 text-xs font-bold text-spoon-dark focus:outline-none focus:ring-2 focus:ring-spoon-caramel/30"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-spoon-muted block mb-1">End Date</span>
                    <input
                      type="date"
                      value={bulkEndDate}
                      onChange={(e) => setBulkEndDate(e.target.value)}
                      required
                      className="w-full h-10 rounded-2xl border border-spoon-border bg-spoon-cream/40 px-3.5 text-xs font-bold text-spoon-dark focus:outline-none focus:ring-2 focus:ring-spoon-caramel/30"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Days of Week */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted">
                    3. Days of the Week
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDaysPreset("all")}
                      className="text-spoon-caramel hover:underline cursor-pointer"
                    >
                      All Days
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setDaysPreset("weekdays")}
                      className="text-spoon-caramel hover:underline cursor-pointer"
                    >
                      Weekdays
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setDaysPreset("weekends")}
                      className="text-spoon-caramel hover:underline cursor-pointer"
                    >
                      Weekends
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { day: 1, label: "Mon" },
                    { day: 2, label: "Tue" },
                    { day: 3, label: "Wed" },
                    { day: 4, label: "Thu" },
                    { day: 5, label: "Fri" },
                    { day: 6, label: "Sat" },
                    { day: 0, label: "Sun" },
                  ].map(({ day, label }) => {
                    const isSelected = bulkDaysOfWeek.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDayOfWeek(day)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-spoon-caramel text-white border-spoon-caramel shadow-xs"
                            : "bg-spoon-sand/40 text-spoon-dark border-spoon-border hover:bg-spoon-sand"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 4: Time Windows & Capacities */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted">
                    4. Time Windows &amp; Order Capacity
                  </label>
                  <button
                    type="button"
                    onClick={addTimeWindowRow}
                    className="inline-flex items-center gap-1 text-xs font-bold text-spoon-caramel hover:underline cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Another Window</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {bulkTimeWindows.map((tw, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2.5 rounded-2xl border border-spoon-border bg-spoon-cream/30"
                    >
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[9px] text-spoon-muted font-semibold block">
                            Start Time
                          </span>
                          <input
                            type="time"
                            value={tw.start_time}
                            onChange={(e) => {
                              const v = e.target.value;
                              setBulkTimeWindows((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, start_time: v } : item
                                )
                              );
                            }}
                            required
                            className="w-full h-8 rounded-xl border border-spoon-border bg-white px-2 text-xs font-bold text-spoon-dark"
                          />
                        </div>

                        <div>
                          <span className="text-[9px] text-spoon-muted font-semibold block">
                            End Time
                          </span>
                          <input
                            type="time"
                            value={tw.end_time}
                            onChange={(e) => {
                              const v = e.target.value;
                              setBulkTimeWindows((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, end_time: v } : item
                                )
                              );
                            }}
                            required
                            className="w-full h-8 rounded-xl border border-spoon-border bg-white px-2 text-xs font-bold text-spoon-dark"
                          />
                        </div>

                        <div>
                          <span className="text-[9px] text-spoon-muted font-semibold block">
                            Max Capacity
                          </span>
                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={tw.capacity}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10) || 1;
                              setBulkTimeWindows((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, capacity: v } : item
                                )
                              );
                            }}
                            required
                            className="w-full h-8 rounded-xl border border-spoon-border bg-white px-2 text-xs font-bold text-spoon-dark"
                          />
                        </div>
                      </div>

                      {bulkTimeWindows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTimeWindowRow(idx)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove time window"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 5: Save as Template Checkbox */}
              <div className="pt-2 border-t border-spoon-border/60 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    className="h-4 w-4 rounded border-spoon-border text-spoon-caramel focus:ring-spoon-caramel"
                  />
                  <span className="font-bold text-spoon-dark text-xs">
                    Save this configuration as a reusable Template
                  </span>
                </label>

                {saveAsTemplate && (
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g. Standard Weekday Slots, Sourdough Schedule"
                    className="w-full h-9 rounded-xl border border-spoon-border bg-white px-3 text-xs text-spoon-dark"
                  />
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-spoon-border/60">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="rounded-xl border border-spoon-border px-4 py-2 text-xs font-bold text-spoon-dark hover:bg-spoon-sand transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBulk}
                  className="flex items-center gap-2 rounded-xl bg-spoon-caramel hover:bg-spoon-caramel-dark text-white px-5 py-2 text-xs font-bold shadow-warm-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submittingBulk ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating Slots...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Generate Schedule Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════ DAY MANAGEMENT MODAL ════════════════════ */}
      {showDayModal && selectedDayDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl border border-spoon-border bg-white p-6 shadow-warm-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-spoon-border/60">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted block">
                  Date Management
                </span>
                <h3 className="font-serif text-lg font-bold text-spoon-dark">
                  {new Date(`${selectedDayDate}T00:00:00`).toLocaleDateString("en-IN", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
              </div>
              <button
                onClick={() => setShowDayModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-spoon-sand text-spoon-dark hover:bg-spoon-border transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Existing Slots on this day */}
            <div className="space-y-3">
              <h4 className="font-serif font-bold text-sm text-spoon-dark flex items-center justify-between">
                <span>Slots on this date</span>
                <span className="text-xs font-sans text-spoon-muted font-normal">
                  {(slotsByDateMap[selectedDayDate] || []).length} slots scheduled
                </span>
              </h4>

              {(!slotsByDateMap[selectedDayDate] ||
                slotsByDateMap[selectedDayDate].length === 0) ? (
                <div className="p-4 rounded-2xl border border-dashed border-spoon-border text-center text-xs text-spoon-muted">
                  No slots scheduled on this date.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {slotsByDateMap[selectedDayDate].map((slot) => {
                    const catObj = categories.find((c) => c.id === slot.category_id);
                    const catTag = catObj ? catObj.name : "Store-wide";

                    return (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between p-3 rounded-2xl border border-spoon-border bg-spoon-cream/30 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-spoon-dark block">
                              {formatSlotWindow(slot.start_time, slot.end_time)}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-spoon-sand text-spoon-muted">
                              {catTag}
                            </span>
                          </div>
                          <span className="text-[11px] text-spoon-muted">
                            Bookings: {slot.current_order_count} / {slot.capacity} orders
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setEditingSlot(slot)}
                            className="p-1.5 rounded-lg bg-white border border-spoon-border text-spoon-dark hover:bg-spoon-sand transition-colors cursor-pointer"
                            title="Edit capacity"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Delete slot"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add single slot to this day form */}
            <form
              onSubmit={handleAddSlotToDate}
              className="rounded-2xl border border-spoon-border bg-spoon-sand/20 p-4 space-y-3"
            >
              <h5 className="font-bold text-xs text-spoon-dark flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-spoon-caramel" />
                <span>Add Slot to This Day</span>
              </h5>

              {/* Category Scope Selection */}
              <div>
                <span className="text-[9px] text-spoon-muted font-bold block mb-1">
                  Category Scope
                </span>
                <select
                  value={newSlotCategory}
                  onChange={(e) => setNewSlotCategory(e.target.value)}
                  className="w-full h-8 rounded-xl border border-spoon-border bg-white px-2.5 text-xs font-bold text-spoon-dark focus:outline-none"
                >
                  <option value="">Store-wide (All Categories)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      Category: {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[9px] text-spoon-muted block mb-1">Start</span>
                  <input
                    type="time"
                    value={newSlotStart}
                    onChange={(e) => setNewSlotStart(e.target.value)}
                    required
                    className="w-full h-8 rounded-xl border border-spoon-border bg-white px-2 font-bold"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-spoon-muted block mb-1">End</span>
                  <input
                    type="time"
                    value={newSlotEnd}
                    onChange={(e) => setNewSlotEnd(e.target.value)}
                    required
                    className="w-full h-8 rounded-xl border border-spoon-border bg-white px-2 font-bold"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-spoon-muted block mb-1">Capacity</span>
                  <input
                    type="number"
                    min="1"
                    value={newSlotCapacity}
                    onChange={(e) => setNewSlotCapacity(parseInt(e.target.value, 10) || 1)}
                    required
                    className="w-full h-8 rounded-xl border border-spoon-border bg-white px-2 font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingDayAction}
                className="w-full py-2 rounded-xl bg-spoon-caramel text-white text-xs font-bold hover:bg-spoon-caramel-dark transition-colors cursor-pointer"
              >
                + Add Slot
              </button>
            </form>

            {/* Holiday / Closed Day Toggle */}
            <div className="rounded-2xl border border-spoon-border bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-spoon-dark block">
                    Holiday / Closure
                  </span>
                  <span className="text-[11px] text-spoon-muted">
                    Prevent customer delivery bookings for this entire day.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleToggleClosure(
                      selectedDayDate,
                      (slotsByDateMap[selectedDayDate] || []).some((s) => s.is_closed)
                    )
                  }
                  disabled={submittingDayAction}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    (slotsByDateMap[selectedDayDate] || []).some((s) => s.is_closed)
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                  }`}
                >
                  {(slotsByDateMap[selectedDayDate] || []).some((s) => s.is_closed)
                    ? "Re-open Date"
                    : "Close Entire Day"}
                </button>
              </div>

              {/* Danger Zone: Delete all slots on this date */}
              {(slotsByDateMap[selectedDayDate] || []).length > 0 && (
                <div className="pt-2 border-t border-spoon-border/60">
                  <button
                    type="button"
                    onClick={() => handleDeleteDateSlots(selectedDayDate)}
                    disabled={submittingDayAction}
                    className="text-xs text-rose-700 hover:underline font-semibold cursor-pointer"
                  >
                    Delete all slots on this date
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ TEMPLATES MODAL ════════════════════ */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl border border-spoon-border bg-white p-6 shadow-warm-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-spoon-border/60">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-spoon-caramel" />
                <h3 className="font-serif text-lg font-bold text-spoon-dark">
                  Delivery Schedule Templates
                </h3>
              </div>
              <button
                onClick={() => setShowTemplatesModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-spoon-sand text-spoon-dark hover:bg-spoon-border transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-spoon-border text-center text-xs text-spoon-muted">
                No templates saved yet. You can save any schedule as a template from the Quick Add wizard.
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-4 rounded-2xl border border-spoon-border bg-spoon-cream/30 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-spoon-dark">{tpl.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => applyTemplateToBulkForm(tpl)}
                          className="px-3 py-1 rounded-xl bg-spoon-caramel text-white text-xs font-bold hover:bg-spoon-caramel-dark transition-colors cursor-pointer"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="p-1 rounded-lg text-rose-700 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(tpl.slots || []).map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg bg-white border border-spoon-border text-[11px] font-semibold text-spoon-dark"
                        >
                          {formatSlotWindow(s.start_time, s.end_time)} (cap: {s.capacity})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════ EDIT SINGLE SLOT MODAL ════════════════════ */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-spoon-border bg-white p-6 shadow-warm-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-spoon-border/60">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted block">
                  Edit Slot
                </span>
                <h3 className="font-serif text-base font-bold text-spoon-dark">
                  {editingSlot.date} • {formatSlotWindow(editingSlot.start_time, editingSlot.end_time)}
                </h3>
              </div>
              <button
                onClick={() => setEditingSlot(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-spoon-sand text-spoon-dark hover:bg-spoon-border transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlotEdit} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-spoon-muted block mb-1">
                  Order Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={editingSlot.capacity}
                  onChange={(e) =>
                    setEditingSlot({
                      ...editingSlot,
                      capacity: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full h-10 rounded-2xl border border-spoon-border bg-spoon-cream/40 px-3.5 text-xs font-bold text-spoon-dark"
                />
                <span className="text-[10px] text-spoon-muted mt-0.5 block">
                  Current booked count: {editingSlot.current_order_count}
                </span>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editingSlot.is_active}
                    onChange={(e) =>
                      setEditingSlot({
                        ...editingSlot,
                        is_active: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-spoon-border text-spoon-caramel"
                  />
                  <span className="font-bold text-spoon-dark text-xs">Active</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editingSlot.is_closed}
                    onChange={(e) =>
                      setEditingSlot({
                        ...editingSlot,
                        is_closed: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-spoon-border text-rose-600"
                  />
                  <span className="font-bold text-spoon-dark text-xs">Mark as Closed</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-spoon-border/60">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="px-4 py-2 rounded-xl border border-spoon-border text-xs font-bold text-spoon-dark hover:bg-spoon-sand cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-spoon-caramel text-white text-xs font-bold hover:bg-spoon-caramel-dark cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
