// Supabase Edge Function: razorpay-order-notification
// Receives Razorpay webhooks, verifies HMAC-SHA256 signature,
// updates order payment status, and sends transactional emails via Resend.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
};

// Cryptographic signature verification using Web Crypto API
async function verifyRazorpaySignature(
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(rawBody)
    );
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const generatedHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return generatedHex.toLowerCase() === signature.toLowerCase();
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

// Send email helper via Resend REST API
async function sendResendEmail({
  apiKey,
  from,
  to,
  subject,
  html,
}: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.message || "Resend API error" };
    }
    return { success: true, id: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    const webhookSecret =
      Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ||
      Deno.env.get("RAZORPAY_KEY_SECRET") ||
      "";

    // 1. Signature check
    if (webhookSecret && !webhookSecret.includes("placeholder")) {
      if (!signature) {
        return new Response(
          JSON.stringify({ error: "Missing x-razorpay-signature header" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isValid = await verifyRazorpaySignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: "Invalid webhook signature" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 2. Parse event payload
    const event = JSON.parse(rawBody);
    const eventType = event.event;

    if (eventType !== "payment.captured" && eventType !== "order.paid") {
      return new Response(
        JSON.stringify({ message: `Ignored event: ${eventType}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payment = event.payload?.payment?.entity;
    if (!payment) {
      return new Response(
        JSON.stringify({ error: "Missing payment entity" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const eventKey = event.id || payment.id;
    const nowIso = new Date().toISOString();

    // 4. Locate order
    const candidateOrderId =
      payment.notes?.order_id || event.payload?.order?.entity?.receipt;

    let order: any = null;
    if (candidateOrderId) {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", candidateOrderId)
        .maybeSingle();
      order = data;
    }

    if (!order && payment.order_id) {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("razorpay_order_id", payment.order_id)
        .maybeSingle();
      order = data;
    }

    if (!order) {
      console.warn(`Order not found for payment ${payment.id}`);
      return new Response(
        JSON.stringify({ message: "Order not found in database" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Amount check
    const expectedPaise = Math.round(Number(order.total) * 100);
    if (payment.amount < expectedPaise || payment.currency !== "INR") {
      return new Response(
        JSON.stringify({ error: "Amount or currency mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Idempotency check
    const { data: existingNotif } = await supabase
      .from("order_notifications")
      .select("customer_email_status, kitchen_email_status")
      .eq("razorpay_event_id", eventKey)
      .maybeSingle();

    if (
      existingNotif &&
      existingNotif.customer_email_status === "sent" &&
      existingNotif.kitchen_email_status === "sent"
    ) {
      return new Response(
        JSON.stringify({ message: "Already processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Update order status
    await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: "confirmed",
        payment_method: payment.method || "Razorpay",
        payment_verified_at: nowIso,
        payment_verified_by: "Razorpay Edge Function Webhook",
        approval_source: "EDGE_FUNCTION",
        razorpay_order_id: payment.order_id || order.razorpay_order_id,
        razorpay_payment_id: payment.id,
        updated_at: nowIso,
      })
      .eq("id", order.id);

    // 8. Resend email dispatch
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const emailFrom = Deno.env.get("EMAIL_FROM") || "The Indulgent Spoon <onboarding@resend.dev>";
    const kitchenEmail = Deno.env.get("KITCHEN_OWNER_EMAIL") || "";

    let custStatus = "skipped";
    let kitchenStatus = "skipped";
    let custMsgId: string | null = null;
    let kitchenMsgId: string | null = null;
    let custError: string | null = null;
    let kitchenError: string | null = null;

    if (resendApiKey && !resendApiKey.includes("placeholder")) {
      // Customer email
      if (order.customer_email) {
        const custResult = await sendResendEmail({
          apiKey: resendApiKey,
          from: emailFrom,
          to: order.customer_email,
          subject: `Your Bakery Order Is Confirmed! — Order #${order.order_number || order.id.slice(0, 8)}`,
          html: `<h1>Order Confirmed!</h1><p>Hi ${order.customer_name}, your order of ₹${order.total} has been confirmed.</p>`,
        });
        custStatus = custResult.success ? "sent" : "failed";
        custMsgId = custResult.id || null;
        custError = custResult.error || null;
      }

      // Kitchen alert email
      if (kitchenEmail) {
        const kitchenResult = await sendResendEmail({
          apiKey: resendApiKey,
          from: emailFrom,
          to: kitchenEmail,
          subject: `NEW PAID ORDER — #${order.order_number || order.id.slice(0, 8)} — ₹${order.total}`,
          html: `<h1>New Paid Order</h1><p>Customer: ${order.customer_name} (${order.customer_phone})</p><p>Total: ₹${order.total}</p>`,
        });
        kitchenStatus = kitchenResult.success ? "sent" : "failed";
        kitchenMsgId = kitchenResult.id || null;
        kitchenError = kitchenResult.error || null;
      }
    }

    // 9. Persist notification record
    try {
      await supabase.from("order_notifications").upsert(
        {
          order_id: order.id,
          razorpay_event_id: eventKey,
          customer_email_status: custStatus,
          kitchen_email_status: kitchenStatus,
          customer_email_message_id: custMsgId,
          kitchen_email_message_id: kitchenMsgId,
          customer_email_error: custError,
          kitchen_email_error: kitchenError,
          attempt_count: 1,
          last_attempt_at: nowIso,
        },
        { onConflict: "razorpay_event_id" }
      );
    } catch {
      // ignore if notification table not yet created
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        notifications: { customer: custStatus, kitchen: kitchenStatus },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
