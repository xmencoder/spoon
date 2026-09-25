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
 * Check if a slot on a given date is in the past or past cutoff relative to "now"
 */
export function isSlotInPastOrCutoff(
  slotDate: string,
  startTime: string,
  leadTimeMinutes: number = 60
): boolean {
  const now = new Date();
  
  // Format today's date in local YYYY-MM-DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  // If slot date is before today, it's in the past
  if (slotDate < todayStr) {
    return true;
  }

  // If slot date is after today, it is valid
  if (slotDate > todayStr) {
    return false;
  }

  // If slot is today, check start_time with lead time
  const [slotHourStr, slotMinStr] = startTime.split(":");
  const slotHour = parseInt(slotHourStr, 10);
  const slotMin = parseInt(slotMinStr || "0", 10);

  const slotStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), slotHour, slotMin, 0);
  const cutoffThreshold = new Date(now.getTime() + leadTimeMinutes * 60 * 1000);

  return slotStartDate <= cutoffThreshold;
}

/**
 * Customer query: Fetch available delivery dates and valid slots for a cart
 * Handles multi-category cart intersection and store-wide slots
 */
export async function getCustomerDeliverySlots(
  restaurantId: string,
  categoryIds: (string | null | undefined)[],
  daysAhead: number = 30
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

  const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
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
    // If no slots configured in DB, generate standard fallback virtual slots for next 14 days
    return generateFallbackCustomerSlots(daysAhead);
  }

  const allSlots = rawSlots as DeliverySlot[];
  const uniqueCategoryIds = Array.from(new Set(categoryIds.filter(Boolean))) as string[];

  // Group slots by date
  const dateMap: Record<string, DeliverySlot[]> = {};

  for (const slot of allSlots) {
    // 1. Filter out past slots / cutoff
    if (isSlotInPastOrCutoff(slot.date, slot.start_time, 60)) {
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

  // If after category filtering some dates have no slots, check if store-wide fallback needed
  const availableDates = Object.keys(dateMap).sort();
  if (availableDates.length === 0) {
    return generateFallbackCustomerSlots(daysAhead);
  }

  return {
    dates: availableDates,
    slotsByDate: dateMap,
  };
}

/**
 * Generate standard fallback slots (e.g. 11am-2pm, 2pm-6pm, 6pm-9pm) if none in DB yet
 */
function generateFallbackCustomerSlots(daysAhead: number = 14): {
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

  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dt = String(d.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${dt}`;

    const validSlots: DeliverySlot[] = [];
    for (const win of standardWindows) {
      if (!isSlotInPastOrCutoff(dateStr, win.start, 60)) {
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
