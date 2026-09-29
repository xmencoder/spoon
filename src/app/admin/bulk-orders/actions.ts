"use server";

import { createClient } from "@/lib/supabase/server";
import type { BulkOrderEnquiry, BulkOrderStatus } from "@/types/database";

export async function getBulkOrderEnquiriesServerAction() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("bulk_order_enquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching bulk orders:", error);
      return { success: false, error: error.message, enquiries: [] };
    }

    return {
      success: true,
      enquiries: (data || []) as BulkOrderEnquiry[],
    };
  } catch (err: any) {
    console.error("getBulkOrderEnquiriesServerAction exception:", err);
    return { success: false, error: err?.message || "Failed to load enquiries", enquiries: [] };
  }
}

export async function updateBulkOrderStatusServerAction(
  id: string,
  status: BulkOrderStatus
) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("bulk_order_enquiries")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating bulk order status:", error);
      return { success: false, error: error.message };
    }

    return { success: true, enquiry: data as BulkOrderEnquiry };
  } catch (err: any) {
    console.error("updateBulkOrderStatusServerAction exception:", err);
    return { success: false, error: err?.message || "Failed to update status" };
  }
}

export async function updateBulkOrderNotesServerAction(
  id: string,
  adminNotes: string
) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("bulk_order_enquiries")
      .update({
        admin_notes: adminNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating bulk order notes:", error);
      return { success: false, error: error.message };
    }

    return { success: true, enquiry: data as BulkOrderEnquiry };
  } catch (err: any) {
    console.error("updateBulkOrderNotesServerAction exception:", err);
    return { success: false, error: err?.message || "Failed to update notes" };
  }
}

export async function deleteBulkOrderEnquiryServerAction(id: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("bulk_order_enquiries")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting bulk order:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("deleteBulkOrderEnquiryServerAction exception:", err);
    return { success: false, error: err?.message || "Failed to delete enquiry" };
  }
}
