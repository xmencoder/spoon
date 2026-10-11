import { createClient } from "@/lib/supabase/client";
import type { DeliverySlot, DeliverySlotTemplate, SlotTimeWindow } from "@/types/database";

export interface BulkCreateSlotOptions {
  restaurantId: string;
  categoryId?: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysOfWeek: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  slots: SlotTimeWindow[];
  overwrite?: boolean;
}

export interface SlotAvailabilityOptions {
  leadTimeMinutes?: number; // e.g. 60 min lead time before slot start
  sameDayCutoffHour?: number; // e.g. 18 for 6:00 PM cutoff
}

/**
 * Format time "HH:mm" to 12-hour friendly format "10:00 AM"
 */
export function formatTimeFriendly(timeStr: string): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  const hour = parseInt(parts[0], 10);
  const minute = parts[1] || "00";
  if (isNaN(hour)) return timeStr;

  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour.toString().padStart(2, "0")}:${minute} ${ampm}`;
}

/**
 * Format slot time range "10:00 - 13:00" to "10:00 AM – 01:00 PM"
 */
export function formatSlotWindow(start: string, end: string): string {
  return `${formatTimeFriendly(start)} – ${formatTimeFriendly(end)}`;
}

/**
 * Check if a slot on a given date is in the past or past cutoff relative to "now".
 * Correctly handles multi-hour or multi-day baking/preparation lead times.
 */
export function isSlotInPastOrCutoff(
  slotDate: string,
  startTime: string,
  leadTimeMinutes: number = 60
): boolean {
  if (!slotDate || !startTime) return true;

  const now = new Date();

  // Format today's date in local YYYY-MM-DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  // If slot date is strictly before today, it's definitely in the past
  if (slotDate < todayStr) {
    return true;
  }

  // Parse slotDate "YYYY-MM-DD" and startTime "HH:mm"
  const [sYearStr, sMonthStr, sDayStr] = slotDate.split("-");
  const [sHourStr, sMinStr] = startTime.split(":");
  const sYear = parseInt(sYearStr, 10);
  const sMonth = parseInt(sMonthStr, 10);
  const sDay = parseInt(sDayStr, 10);
  const sHour = parseInt(sHourStr, 10);
  const sMin = parseInt(sMinStr || "0", 10);

  // Exact slot start timestamp
  const slotStartDateTime = new Date(sYear, sMonth - 1, sDay, sHour, sMin, 0);

  // Cutoff threshold = now + required baking / preparation lead time
  const cutoffThreshold = new Date(now.getTime() + leadTimeMinutes * 60 * 1000);

  // If the slot starts before or at the cutoff threshold, it is NOT available
  return slotStartDateTime.getTime() <= cutoffThreshold.getTime();
}

/**
 * Customer query: Fetch available delivery dates and valid slots for a cart
 * Handles multi-category cart intersection, store-wide slots, and max baking time
 * Only returns the next available dates starting AFTER the required baking period.
 */
export async function getCustomerDeliverySlots(
  restaurantId: string,
  categoryIds: (string | null | undefined)[],
  daysAhead: number = 5,
  bakingPeriodMinutes: number = 60
): Promise<{
  dates: string[];
  slotsByDate: Record<string, DeliverySlot[]>;
}> {
  const supabase = createClient();

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  // Search ahead far enough to find `daysAhead` available dates even with 1-3 days baking time
  const leadTimeDays = Math.ceil(bakingPeriodMinutes / 1440);
  const searchDaysAhead = Math.max(14, leadTimeDays + daysAhead + 3);

  const endDate = new Date(now.getTime() + searchDaysAhead * 24 * 60 * 60 * 1000);
  const endYear = endDate.getFullYear();
  const endMonth = String(endDate.getMonth() + 1).padStart(2, "0");
  const endDay = String(endDate.getDate()).padStart(2, "0");
  const endDateStr = `${endYear}-${endMonth}-${endDay}`;

  // Fetch slots for this restaurant within date range
  const { data: rawSlots, error } = await supabase
    .from("delivery_slots")
    .select("*, category:categories(*)")
    .eq("restaurant_id", restaurantId)
    .gte("date", todayStr)
    .lte("date", endDateStr)
    .eq("is_active", true)
    .eq("is_closed", false)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error || !rawSlots || rawSlots.length === 0) {
    // If no slots configured in DB, generate standard fallback virtual slots for available days
    return generateFallbackCustomerSlots(daysAhead, bakingPeriodMinutes);
  }

  const allSlots = rawSlots as DeliverySlot[];
  const uniqueCategoryIds = Array.from(new Set(categoryIds.filter(Boolean))) as string[];

  // Group slots by date
  const dateMap: Record<string, DeliverySlot[]> = {};

  for (const slot of allSlots) {
    // 1. Filter out slots that start before the required baking / prep lead time
    if (isSlotInPastOrCutoff(slot.date, slot.start_time, bakingPeriodMinutes)) {
      continue;
    }

    // 2. Filter out slots at capacity
    if (slot.current_order_count >= slot.capacity) {
      continue;
    }

    // 3. Category matching logic:
    // If cart has no specific categories or slot is storewide (category_id == null), it is eligible
    // If cart has specific categories, slot must either be storewide or match one of cart's categories
    if (uniqueCategoryIds.length > 0 && slot.category_id) {
      if (!uniqueCategoryIds.includes(slot.category_id)) {
        continue;
      }
    }

    if (!dateMap[slot.date]) {
      dateMap[slot.date] = [];
    }

    // Avoid duplicate time windows for the same date
    const exists = dateMap[slot.date].some(
      (s) => s.start_time === slot.start_time && s.end_time === slot.end_time
    );
    if (!exists) {
      dateMap[slot.date].push(slot);
    }
  }

  // If after filtering some dates have no slots, check if store-wide fallback needed
  const availableDates = Object.keys(dateMap).sort();
  if (availableDates.length === 0) {
    return generateFallbackCustomerSlots(daysAhead, bakingPeriodMinutes);
  }

  // Limit to next `daysAhead` available dates (starting after baking period)
  const limitedDates = availableDates.slice(0, daysAhead);
  const limitedSlotsByDate: Record<string, DeliverySlot[]> = {};
  for (const d of limitedDates) {
    limitedSlotsByDate[d] = dateMap[d];
  }

  return {
    dates: limitedDates,
    slotsByDate: limitedSlotsByDate,
  };
}

/**
 * Generate standard fallback slots if none in DB yet
 * Strictly honors leadTimeMinutes so no slots appear before baking is complete.
 */
function generateFallbackCustomerSlots(daysAhead: number = 5, leadTimeMinutes: number = 60): {
  dates: string[];
  slotsByDate: Record<string, DeliverySlot[]>;
} {
  const dates: string[] = [];
  const slotsByDate: Record<string, DeliverySlot[]> = {};

  const standardWindows = [
    { start: "11:00", end: "14:00" },
    { start: "14:00", end: "18:00" },
    { start: "18:00", end: "21:00" },
  ];

  const now = new Date();
  const leadTimeDays = Math.ceil(leadTimeMinutes / 1440);
  const maxSearchDays = Math.max(14, leadTimeDays + daysAhead + 3);

  for (let i = 0; i < maxSearchDays && dates.length < daysAhead; i++) {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dt = String(d.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${dt}`;

    const validSlots: DeliverySlot[] = [];
    for (const win of standardWindows) {
      if (!isSlotInPastOrCutoff(dateStr, win.start, leadTimeMinutes)) {
        validSlots.push({
          id: `fallback-${dateStr}-${win.start}`,
          restaurant_id: "",
          category_id: null,
          date: dateStr,
          start_time: win.start,
          end_time: win.end,
          capacity: 20,
          current_order_count: 0,
          is_active: true,
          is_closed: false,
        });
      }
    }

    if (validSlots.length > 0) {
      dates.push(dateStr);
      slotsByDate[dateStr] = validSlots;
    }
  }

  return { dates, slotsByDate };
}

/**
 * Admin: Fetch slots for management
 */
export async function getAdminDeliverySlots(
  restaurantId: string,
  startDate?: string,
  endDate?: string,
  categoryId?: string | null
): Promise<DeliverySlot[]> {
  const supabase = createClient();

  let query = supabase
    .from("delivery_slots")
    .select("*, category:categories(*)")
    .eq("restaurant_id", restaurantId)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (startDate) {
    query = query.gte("date", startDate);
  }
  if (endDate) {
    query = query.lte("date", endDate);
  }
  if (categoryId && categoryId !== "all") {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as DeliverySlot[]) || [];
}

/**
 * Admin: Bulk create slots across a date range & selected days of week
 */
export async function createAdminDeliverySlotsBulk(
  options: BulkCreateSlotOptions
): Promise<{ count: number }> {
  const {
    restaurantId,
    categoryId = null,
    startDate,
    endDate,
    daysOfWeek,
    slots,
    overwrite = true,
  } = options;

  const supabase = createClient();

  // Generate date list between startDate and endDate
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const datesToCreate: string[] = [];

  const curr = new Date(start);
  while (curr <= end) {
    const dayOfWeek = curr.getDay(); // 0 = Sun, 1 = Mon ...
    if (daysOfWeek.includes(dayOfWeek)) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, "0");
      const d = String(curr.getDate()).padStart(2, "0");
      datesToCreate.push(`${y}-${m}-${d}`);
    }
    curr.setDate(curr.getDate() + 1);
  }

  if (datesToCreate.length === 0 || slots.length === 0) {
    return { count: 0 };
  }

  // Build rows to upsert
  const rows: Array<{
    restaurant_id: string;
    category_id: string | null;
    date: string;
    start_time: string;
    end_time: string;
    capacity: number;
    is_active: boolean;
    is_closed: boolean;
  }> = [];

  for (const dateStr of datesToCreate) {
    for (const slot of slots) {
      rows.push({
        restaurant_id: restaurantId,
        category_id: categoryId || null,
        date: dateStr,
        start_time: slot.start_time,
        end_time: slot.end_time,
        capacity: slot.capacity || 10,
        is_active: true,
        is_closed: false,
      });
    }
  }

  // Perform bulk insert / upsert in chunks of 100
  const CHUNK_SIZE = 100;
  let totalInserted = 0;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    
    if (overwrite) {
      // Upsert
      const { data, error } = await supabase
        .from("delivery_slots")
        .upsert(chunk, {
          onConflict: "restaurant_id,category_id,date,start_time,end_time",
          ignoreDuplicates: false,
        })
        .select("id");

      if (error) {
        // If unique index name is slightly different, fallback to insert ignore
        console.warn("Upsert error in delivery slots, trying insert with ignore:", error.message);
        const { data: insData, error: insErr } = await supabase
          .from("delivery_slots")
          .insert(chunk)
          .select("id");
        if (insErr) {
          console.error("Bulk insert failed:", insErr);
          throw insErr;
        }
        totalInserted += insData?.length || chunk.length;
      } else {
        totalInserted += data?.length || chunk.length;
      }
    } else {
      const { data, error } = await supabase
        .from("delivery_slots")
        .insert(chunk)
        .select("id");
      if (error) throw error;
      totalInserted += data?.length || chunk.length;
    }
  }

  return { count: totalInserted };
}

/**
 * Admin: Update single delivery slot
 */
export async function updateAdminDeliverySlot(
  slotId: string,
  updates: Partial<DeliverySlot>
): Promise<DeliverySlot> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("delivery_slots")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", slotId)
    .select()
    .single();

  if (error) throw error;
  return data as DeliverySlot;
}

/**
 * Admin: Delete single delivery slot
 */
export async function deleteAdminDeliverySlot(slotId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("delivery_slots").delete().eq("id", slotId);
  if (error) throw error;
}

/**
 * Admin: Toggle closure for an entire date (Holiday / Off day)
 */
export async function toggleDateClosure(
  restaurantId: string,
  date: string,
  isClosed: boolean,
  reason?: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("delivery_slots")
    .update({
      is_closed: isClosed,
      closed_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_id", restaurantId)
    .eq("date", date);

  if (error) throw error;
}

/**
 * Admin: Delete all slots for a specific date
 */
export async function deleteSlotsForDate(
  restaurantId: string,
  date: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("delivery_slots")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("date", date);

  if (error) throw error;
}

/**
 * Templates: Get all delivery slot templates
 */
export async function getDeliverySlotTemplates(
  restaurantId: string
): Promise<DeliverySlotTemplate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("delivery_slot_templates")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data as DeliverySlotTemplate[]) || [];
}

/**
 * Templates: Create delivery slot template
 */
export async function createDeliverySlotTemplate(
  restaurantId: string,
  name: string,
  slots: SlotTimeWindow[],
  categoryId?: string | null
): Promise<DeliverySlotTemplate> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("delivery_slot_templates")
    .insert({
      restaurant_id: restaurantId,
      name: name.trim(),
      category_id: categoryId || null,
      slots,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DeliverySlotTemplate;
}

/**
 * Templates: Delete delivery slot template
 */
export async function deleteDeliverySlotTemplate(
  templateId: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("delivery_slot_templates")
    .delete()
    .eq("id", templateId);

  if (error) throw error;
}
