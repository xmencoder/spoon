"use server";

import {
  getDeliveryPricing,
  saveDeliveryPricing,
  type DeliveryPricingConfig,
} from "@/lib/delivery-config";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getAdminDeliveryPricingAction(): Promise<DeliveryPricingConfig> {
  return getDeliveryPricing();
}

export async function updateAdminDeliveryPricingAction(
  newPricing: DeliveryPricingConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = saveDeliveryPricing(newPricing);
    if (!success) {
      return { success: false, error: "Failed to write delivery pricing configuration." };
    }

    // Also sync baseFare to restaurants.delivery_charge in Supabase
    try {
      const admin = createAdminClient();
      await admin
        .from("restaurants")
        .update({
          delivery_charge: newPricing.baseFare,
          updated_at: new Date().toISOString(),
        })
        .neq("id", "00000000-0000-0000-0000-000000000000");
    } catch (dbErr) {
      console.warn("Could not sync delivery_charge to restaurants table:", dbErr);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update delivery pricing." };
  }
}
