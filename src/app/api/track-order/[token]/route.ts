import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const params = await context.params;
    const token = params?.token;

    if (!token) {
      return NextResponse.json({ error: "Missing tracking token" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch order by tracking_token or order id
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .or(`tracking_token.eq.${token},id.eq.${token}`)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Fetch order items
    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    // 3. Fetch status history
    const { data: history } = await supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    let adminApprovalUrl: string | null = null;
    if (order.status === "payment_verification_pending" || order.payment_status === "verification_pending") {
      const { generateActionToken } = await import("@/lib/order-approval-service");
      const { SITE_URL } = await import("@/lib/notifications");
      const token = generateActionToken(order.id, "approve", "whatsapp-admin");
      adminApprovalUrl = `${SITE_URL}/api/order-action?token=${token}`;
    }

    return NextResponse.json({
      order,
      items: items || [],
      history: history || [],
      adminApprovalUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
