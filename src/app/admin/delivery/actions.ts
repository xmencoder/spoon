"use server";

import { createClient } from "@/lib/supabase/server";
import type { SlotTimeWindow, DeliverySlot } from "@/types/database";

export interface BulkCreateServerActionOptions {
  restaurantId?: string | null;
  categoryId?: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysOfWeek: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  slots: SlotTimeWindow[];
}

/**
 * Server Action to bulk create delivery slots with full server privileges
 */
export async function createDeliverySlotsBulkServerAction(
  options: BulkCreateServerActionOptions
) {
  try {
    const supabase = await createClient();

    let targetRestId = options.restaurantId;
    if (!targetRestId) {
      const { data: defaultRest } = await supabase
        .from("restaurants")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      targetRestId = defaultRest?.id;
    }

    if (!targetRestId) {
      return {
        success: false,
        error: "No restaurant found. Please configure a restaurant first.",
      };
    }

    const {
      categoryId = null,
      startDate,
      endDate,
      daysOfWeek,
      slots,
    } = options;

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
      return { success: true, count: 0 };
    }

    const cleanCategoryId = categoryId && categoryId.trim() !== "" ? categoryId.trim() : null;

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
          restaurant_id: targetRestId,
          category_id: cleanCategoryId,
          date: dateStr,
          start_time: slot.start_time,
          end_time: slot.end_time,
          capacity: Number(slot.capacity) || 10,
          is_active: true,
          is_closed: false,
        });
      }
    }

    // Delete any existing overlapping slots for these exact parameters to prevent duplicates cleanly
    for (const dateStr of datesToCreate) {
      for (const slot of slots) {
        let delQuery = supabase
          .from("delivery_slots")
          .delete()
          .eq("restaurant_id", targetRestId)
          .eq("date", dateStr)
          .eq("start_time", slot.start_time)
          .eq("end_time", slot.end_time);

        if (cleanCategoryId) {
          delQuery = delQuery.eq("category_id", cleanCategoryId);
        } else {
          delQuery = delQuery.is("category_id", null);
        }

        await delQuery;
      }
    }

    // Insert new rows in chunks
    const CHUNK_SIZE = 50;
    let totalInserted = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { data, error } = await supabase
        .from("delivery_slots")
        .insert(chunk)
        .select("id");

      if (error) {
        console.error("createDeliverySlotsBulkServerAction insert error:", error);
        return {
          success: false,
          error: error.message || "Failed to insert delivery slots into database.",
        };
      }

      totalInserted += data?.length || chunk.length;
    }

    return { success: true, count: totalInserted };
  } catch (err: unknown) {
    console.error("createDeliverySlotsBulkServerAction unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create slots",
    };
  }
}

/**
 * Server Action to update a delivery slot
 */
export async function updateDeliverySlotServerAction(
  slotId: string,
  updates: Partial<DeliverySlot>
) {
  try {
    const supabase = await createClient();
    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.capacity !== undefined) payload.capacity = Number(updates.capacity);
    if (updates.is_active !== undefined) payload.is_active = Boolean(updates.is_active);
    if (updates.is_closed !== undefined) payload.is_closed = Boolean(updates.is_closed);
    if (updates.closed_reason !== undefined) payload.closed_reason = updates.closed_reason;

    const { data, error } = await supabase
      .from("delivery_slots")
      .update(payload)
      .eq("id", slotId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, slot: data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update slot",
    };
  }
}

/**
 * Server Action to delete a delivery slot
 */
export async function deleteDeliverySlotServerAction(slotId: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("delivery_slots")
      .delete()
      .eq("id", slotId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete slot",
    };
  }
}

/**
 * Server Action to toggle closure for a whole date
 */
export async function toggleDateClosureServerAction(
  restaurantId: string | null | undefined,
  date: string,
  isClosed: boolean,
  reason?: string
) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("delivery_slots")
      .update({
        is_closed: isClosed,
        closed_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("date", date);

    if (restaurantId) {
      query = query.eq("restaurant_id", restaurantId);
    }

    const { error } = await query;
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle date closure",
    };
  }
}

/**
 * Server Action to delete all slots for a specific date
 */
export async function deleteSlotsForDateServerAction(
  restaurantId: string | null | undefined,
  date: string
) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("delivery_slots")
      .delete()
      .eq("date", date);

    if (restaurantId) {
      query = query.eq("restaurant_id", restaurantId);
    }

    const { error } = await query;
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete date slots",
    };
  }
}

/**
 * Server Action to save a delivery template
 */
export async function saveDeliveryTemplateServerAction(
  restaurantId: string | null | undefined,
  name: string,
  slots: SlotTimeWindow[],
  categoryId?: string | null
) {
  try {
    const supabase = await createClient();

    let targetRestId = restaurantId;
    if (!targetRestId) {
      const { data: defaultRest } = await supabase
        .from("restaurants")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      targetRestId = defaultRest?.id;
    }

    if (!targetRestId) {
      return { success: false, error: "Restaurant not found" };
    }

    const { data, error } = await supabase
      .from("delivery_slot_templates")
      .insert({
        restaurant_id: targetRestId,
        name: name.trim(),
        category_id: categoryId || null,
        slots,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, template: data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save template",
    };
  }
}

/**
 * Server Action to delete a delivery template
 */
export async function deleteDeliveryTemplateServerAction(templateId: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("delivery_slot_templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete template",
    };
  }
}

/**
 * Server Action to delete multiple delivery slots by IDs
 */
export async function bulkDeleteSlotsByIdsServerAction(slotIds: string[]) {
  try {
    if (!slotIds || slotIds.length === 0) {
      return { success: true, count: 0 };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("delivery_slots")
      .delete()
      .in("id", slotIds);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, count: slotIds.length };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete selected slots",
    };
  }
}

export interface BulkDeleteFilterOptions {
  restaurantId?: string | null;
  categoryId?: string | null; // "all", "storewide", or category UUID
  startDate?: string;
  endDate?: string;
  scope?: "category" | "storewide" | "past" | "all";
}

/**
 * Server Action to delete slots by filters (Category, Date Range, Past Slots, etc.)
 */
export async function bulkDeleteSlotsByFilterServerAction(
  options: BulkDeleteFilterOptions
) {
  try {
    const supabase = await createClient();

    let targetRestId = options.restaurantId;
    if (!targetRestId) {
      const { data: defaultRest } = await supabase
        .from("restaurants")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      targetRestId = defaultRest?.id;
    }

    let query = supabase.from("delivery_slots").delete();

    if (targetRestId) {
      query = query.eq("restaurant_id", targetRestId);
    }

    if (options.scope === "past") {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const todayStr = `${y}-${m}-${d}`;
      query = query.lt("date", todayStr);
    } else {
      if (options.startDate) {
        query = query.gte("date", options.startDate);
      }
      if (options.endDate) {
        query = query.lte("date", options.endDate);
      }

      if (options.scope === "storewide") {
        query = query.is("category_id", null);
      } else if (options.scope === "category" && options.categoryId) {
        query = query.eq("category_id", options.categoryId);
      }
    }

    const { error } = await query;
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to bulk delete slots",
    };
  }
}

/**
 * Server Action to batch update status of multiple slots (Active / Inactive / Closed)
 */
export async function bulkUpdateSlotStatusServerAction(
  slotIds: string[],
  updates: { is_active?: boolean; is_closed?: boolean }
) {
  try {
    if (!slotIds || slotIds.length === 0) {
      return { success: true, count: 0 };
    }

    const supabase = await createClient();
    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.is_active !== undefined) payload.is_active = updates.is_active;
    if (updates.is_closed !== undefined) payload.is_closed = updates.is_closed;

    const { error } = await supabase
      .from("delivery_slots")
      .update(payload)
      .in("id", slotIds);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, count: slotIds.length };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update selected slots",
    };
  }
}

