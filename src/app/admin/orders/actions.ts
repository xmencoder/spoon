"use server";

import {
  approveOrderPaymentAction,
  rejectOrderPaymentAction,
  advanceOrderStatusAction,
} from "@/lib/order-approval-service";
import type { OrderStatus } from "@/types/database";

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
    const result = await advanceOrderStatusAction({
      orderId,
      newStatus,
      adminId: "dashboard-admin",
      notes,
    });
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to advance order status" };
  }
}
