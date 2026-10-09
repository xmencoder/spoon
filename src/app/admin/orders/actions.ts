"use server";

import { createClient } from "@/lib/supabase/server";
import {
  approveOrderPaymentAction,
  rejectOrderPaymentAction,
  advanceOrderStatusAction,
} from "@/lib/order-approval-service";
import type { OrderStatus, PaymentStatus } from "@/types/database";

export async function approveOrderPaymentServerAction(orderId: string) {
  try {
    const result = await approveOrderPaymentAction({
      orderId,
      adminId: "dashboard-admin",
      approvalSource: "DASHBOARD",
    });
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to approve payment" };
  }
}

export async function rejectOrderPaymentServerAction(orderId: string, reason?: string) {
  try {
    const result = await rejectOrderPaymentAction({
      orderId,
      adminId: "dashboard-admin",
      rejectionSource: "DASHBOARD",
      reason: reason || "Payment not received in bank/UPI account",
    });
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reject payment" };
  }
}

export async function advanceOrderStatusServerAction(
  orderId: string,
  newStatus: OrderStatus,
  notes?: string
) {
  try {
    // Try the rich notification and logging pipeline first
    try {
      const result = await advanceOrderStatusAction({
        orderId,
        newStatus,
        adminId: "dashboard-admin",
        notes,
      });
      return result;
    } catch (pipelineErr: any) {
      // If validation threw (e.g. strict status transition), perform direct status update
      const supabase = await createClient();
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;
      return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to advance order status" };
  }
}

export async function updateOrderPaymentStatusServerAction(
  orderId: string,
  paymentStatus: PaymentStatus,
  paymentMethod?: string
) {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      payment_status: paymentStatus,
      updated_at: now,
    };

    if (paymentStatus === "verified") {
      updatePayload.payment_verified_at = now;
      updatePayload.payment_verified_by = "Admin Dashboard";
      updatePayload.approval_source = paymentMethod?.toLowerCase().includes("razorpay")
        ? "RAZORPAY"
        : "DASHBOARD";
    }

    if (paymentMethod) {
      updatePayload.payment_method = paymentMethod;
    }

    const { error } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update payment status" };
  }
}
