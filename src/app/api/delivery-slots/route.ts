import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSlotInPastOrCutoff } from "@/lib/delivery-slots-service";
import type { DeliverySlot } from "@/types/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurant_id");
    const categoryIdsParam = searchParams.get("category_ids"); // comma separated
    const daysAhead = Math.min(parseInt(searchParams.get("days") || "5", 10), 5);
    const bakingPeriodMinutes = parseInt(searchParams.get("baking_period_minutes") || "60", 10);

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurant_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

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

    const categoryIds = categoryIdsParam
      ? categoryIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

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

    if (error) {
      console.error("Fetch delivery slots API error:", error);
      return NextResponse.json({ dates: [], slotsByDate: {} });
    }

    const allSlots = (rawSlots || []) as DeliverySlot[];
    const dateMap: Record<string, DeliverySlot[]> = {};

    for (const slot of allSlots) {
      // 1. Cutoff filter (uses baking period lead time)
      if (isSlotInPastOrCutoff(slot.date, slot.start_time, bakingPeriodMinutes)) {
        continue;
      }

      // 2. Capacity filter
      if (slot.current_order_count >= slot.capacity) {
        continue;
      }

      // 3. Category matching
      if (categoryIds.length > 0 && slot.category_id) {
        if (!categoryIds.includes(slot.category_id)) {
          continue;
        }
      }

      if (!dateMap[slot.date]) {
        dateMap[slot.date] = [];
      }

      const exists = dateMap[slot.date].some(
        (s) => s.start_time === slot.start_time && s.end_time === slot.end_time
      );
      if (!exists) {
        dateMap[slot.date].push(slot);
      }
    }

    const allDates = Object.keys(dateMap).sort();
    // Limit to first `daysAhead` dates (max 5)
    const dates = allDates.slice(0, daysAhead);
    const slotsByDate: Record<string, typeof dateMap[string]> = {};
    for (const d of dates) {
      slotsByDate[d] = dateMap[d];
    }

    return NextResponse.json({
      dates,
      slotsByDate,
    });
  } catch (err: unknown) {
    console.error("delivery-slots API error:", err);
    return NextResponse.json(
      { error: "Failed to load delivery slots" },
      { status: 500 }
    );
  }
}
