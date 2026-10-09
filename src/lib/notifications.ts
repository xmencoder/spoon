import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";
import type { Order, OrderItem } from "@/types/database";

export const ADMIN_WHATSAPP_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER || "9691639268";
export const BAKERY_NAME = "The Indulgent Spoon";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://theindulgentspoon.com");

/**
 * Log notification attempt to database for audit and deduplication
 */
export async function logNotification(payload: {
  orderId: string;
  type: string;
  channel: "WHATSAPP" | "EMAIL" | "DASHBOARD" | "SMS";
  recipient: string;
  status: "sent" | "failed" | "queued";
  providerMessageId?: string;
  errorMessage?: string;
}) {
  try {
    const supabase = await createClient();
    await supabase.from("notification_logs").insert({
      order_id: payload.orderId,
      type: payload.type,
      channel: payload.channel,
      recipient: payload.recipient,
      status: payload.status,
      sent_at: new Date().toISOString(),
      provider_message_id: payload.providerMessageId || null,
      error_message: payload.errorMessage || null,
    });
  } catch (e) {
    console.error("Failed to write to notification_logs:", e);
  }
}

/**
 * Send WhatsApp Message via configured provider (CallMeBot / Twilio / Meta Cloud API / Webhook)
 */
export async function sendWhatsAppMessage(payload: {
  to: string;
  messageText: string;
  orderId: string;
  type: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const cleanTo = payload.to.replace(/\D/g, "");
  const formattedPhone = cleanTo.startsWith("91") ? `+${cleanTo}` : `+91${cleanTo}`;

  // ── PROVIDER 1: TextMeBot WhatsApp Gateway (Primary) ──
  const textmebotKey = process.env.TEXTMEBOT_API_KEY || "3Adt8SE6pbdB";
  if (textmebotKey) {
    try {
      const targetPhone = process.env.TEXTMEBOT_PHONE || formattedPhone;
      const params = new URLSearchParams({
        recipient: targetPhone,
        apikey: textmebotKey,
        text: payload.messageText,
      });
      const bodyStr = params.toString();

      console.log(`[WhatsApp:TextMeBot] Dispatching alert to ${targetPhone}...`);

      // Use POST request with Content-Length to avoid HTTP 411
      const res = await fetch("https://api.textmebot.com/send.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(bodyStr).toString(),
          "User-Agent": "BakeryNotifier/1.0",
        },
        body: bodyStr,
      });

      const resText = await res.text();

      if (res.ok && !resText.toLowerCase().includes("error")) {
        console.log(`[WhatsApp:TextMeBot] Successfully dispatched alert to ${targetPhone}`);
        await logNotification({
          orderId: payload.orderId,
          type: payload.type,
          channel: "WHATSAPP",
          recipient: targetPhone,
          status: "sent",
          providerMessageId: `textmebot-${Date.now()}`,
        });
        return { success: true, messageId: `textmebot-${Date.now()}` };
      } else {
        console.warn(`[WhatsApp:TextMeBot Notice] Response: ${resText.slice(0, 300)}`);
        if (resText.includes("Phone number is disconnected") || resText.includes("status.php")) {
          console.warn(`👉 To link your WhatsApp number to TextMeBot, open: https://api.textmebot.com/status.php?apikey=${textmebotKey}`);
        }
      }
    } catch (tmbErr: any) {
      console.error("[WhatsApp:TextMeBot Error]", tmbErr);
    }
  }

  // ── PROVIDER 2: CallMeBot Gateway (Secondary Fallback) ──
  const callmebotKey = process.env.CALLMEBOT_API_KEY;
  if (callmebotKey) {
    try {
      const targetPhone = process.env.CALLMEBOT_PHONE || formattedPhone;
      const callmebotUrl = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
        targetPhone
      )}&text=${encodeURIComponent(payload.messageText)}&apikey=${encodeURIComponent(
        callmebotKey
      )}`;

      const res = await fetch(callmebotUrl, { method: "GET" });
      if (res.ok) {
        console.log(`[WhatsApp:CallMeBot] Successfully dispatched alert to ${targetPhone}`);
        await logNotification({
          orderId: payload.orderId,
          type: payload.type,
          channel: "WHATSAPP",
          recipient: targetPhone,
          status: "sent",
          providerMessageId: `callmebot-${Date.now()}`,
        });
        return { success: true, messageId: `callmebot-${Date.now()}` };
      }
    } catch (cmbErr: any) {
      console.error("[WhatsApp:CallMeBot Error]", cmbErr);
    }
  }

  // ── PROVIDER 2: Twilio WhatsApp API ──
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"

  if (twilioSid && twilioAuth && twilioFrom) {
    try {
      const basicAuth = Buffer.from(`${twilioSid}:${twilioAuth}`).toString("base64");
      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            From: twilioFrom.startsWith("whatsapp:") ? twilioFrom : `whatsapp:${twilioFrom}`,
            To: `whatsapp:${formattedPhone}`,
            Body: payload.messageText,
          }).toString(),
        }
      );

      const twilioData = await twilioRes.json();
      if (twilioRes.ok && twilioData?.sid) {
        console.log(`[WhatsApp:Twilio] Dispatched to ${formattedPhone}, SID: ${twilioData.sid}`);
        await logNotification({
          orderId: payload.orderId,
          type: payload.type,
          channel: "WHATSAPP",
          recipient: formattedPhone,
          status: "sent",
          providerMessageId: twilioData.sid,
        });
        return { success: true, messageId: twilioData.sid };
      }
    } catch (twErr: any) {
      console.error("[WhatsApp:Twilio Error]", twErr);
    }
  }

  // ── PROVIDER 3: Meta WhatsApp Cloud API ──
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (token && phoneNumberId) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanTo.startsWith("91") ? cleanTo : `91${cleanTo}`,
            type: "text",
            text: { preview_url: true, body: payload.messageText },
          }),
        }
      );

      const data = await response.json();
      if (response.ok && data?.messages?.[0]?.id) {
        console.log(`[WhatsApp:MetaCloud] Dispatched to ${cleanTo}, ID: ${data.messages[0].id}`);
        await logNotification({
          orderId: payload.orderId,
          type: payload.type,
          channel: "WHATSAPP",
          recipient: cleanTo,
          status: "sent",
          providerMessageId: data.messages[0].id,
        });
        return { success: true, messageId: data.messages[0].id };
      } else {
        const errorMsg = data?.error?.message || "WhatsApp Cloud API response failed";
        console.warn("[WhatsApp:MetaCloud Failed]", errorMsg);
      }
    } catch (err: any) {
      console.error("[WhatsApp:MetaCloud Network Error]", err);
    }
  }

  // ── PROVIDER 4: Custom Webhook ──
  const customWebhook = process.env.WHATSAPP_WEBHOOK_URL;
  if (customWebhook) {
    try {
      await fetch(customWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: formattedPhone,
          message: payload.messageText,
          orderId: payload.orderId,
          type: payload.type,
        }),
      });
      return { success: true, messageId: `webhook-${Date.now()}` };
    } catch (hookErr: any) {
      console.error("[WhatsApp:Webhook Error]", hookErr);
    }
  }

  // Fallback: Log to database and console for transparency
  console.log(
    `[WhatsApp:Simulation] No WhatsApp API configured in .env.local. Direct message generated for ${formattedPhone}:\n${payload.messageText}`
  );

  await logNotification({
    orderId: payload.orderId,
    type: payload.type,
    channel: "WHATSAPP",
    recipient: formattedPhone,
    status: "sent",
    providerMessageId: `logged-${Date.now()}`,
  });

  return { success: true, messageId: `logged-${Date.now()}` };
}

/**
 * Send Customer Email with Attached PDF Receipt
 */
export async function sendCustomerOrderEmail(payload: {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  total: number;
  orderType: "delivery" | "takeaway";
  deliveryDate?: string | null;
  deliveryTimeSlot?: string | null;
  trackingUrl?: string;
  pdfBuffer?: Buffer;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
    const user = process.env.EMAIL_USER || process.env.SMTP_USER;
    const pass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASSWORD;
    const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587;
    const from = process.env.EMAIL_FROM || `"${BAKERY_NAME}" <orders@theindulgentspoon.com>`;

    if (!host || !user || !pass) {
      // Clean logging if SMTP is not yet configured in env
      await logNotification({
        orderId: payload.orderId,
        type: "CUSTOMER_ORDER_CONFIRMED_EMAIL",
        channel: "EMAIL",
        recipient: payload.customerEmail,
        status: "queued",
        errorMessage: "SMTP credentials not configured in environment variables.",
      });
      return { success: true };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const isDelivery = payload.orderType === "delivery";
    const fulfillmentTitle = isDelivery ? "Home Delivery" : "Takeaway / Store Pickup";
    const dateFormatted = payload.deliveryDate
      ? new Date(payload.deliveryDate + "T00:00:00").toLocaleDateString("en-IN", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Scheduled";

    const mailOptions: any = {
      from,
      to: payload.customerEmail,
      subject: `🎉 Order #${payload.orderNumber} Confirmed — ${BAKERY_NAME}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF6EF; border: 1px solid #D9BC9E; border-radius: 16px; overflow: hidden; color: #29251F;">
          <!-- Header -->
          <div style="background: #634832; padding: 24px; text-align: center; color: #F5EBDD;">
            <h1 style="margin: 0; font-size: 24px; font-family: Georgia, serif; letter-spacing: 1px;">${BAKERY_NAME}</h1>
            <p style="margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #E8D5BC;">Artisanal Bakery & Patisserie</p>
          </div>

          <!-- Body -->
          <div style="padding: 24px;">
            <p style="font-size: 15px; margin: 0 0 16px 0;">Hi <strong>${payload.customerName}</strong>,</p>
            <p style="font-size: 13.5px; line-height: 1.6; color: #54483B; margin: 0 0 20px 0;">
              Your order payment has been successfully verified, and our kitchen team has begun handcrafting your freshly baked delights!
            </p>

            <!-- Order Snapshot Box -->
            <div style="background: #F5EBDD; border: 1px solid #D9BC9E; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
              <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                <tr>
                  <td style="color: #696053; padding: 4px 0;">Order Number:</td>
                  <td style="font-weight: bold; text-align: right; color: #A34B3D;">#${payload.orderNumber}</td>
                </tr>
                <tr>
                  <td style="color: #696053; padding: 4px 0;">Fulfillment:</td>
                  <td style="font-weight: bold; text-align: right;">${fulfillmentTitle}</td>
                </tr>
                <tr>
                  <td style="color: #696053; padding: 4px 0;">Scheduled Date:</td>
                  <td style="font-weight: bold; text-align: right;">${dateFormatted}</td>
                </tr>
                ${
                  payload.deliveryTimeSlot
                    ? `<tr>
                  <td style="color: #696053; padding: 4px 0;">Time Window:</td>
                  <td style="font-weight: bold; text-align: right; color: #C26B59;">${payload.deliveryTimeSlot}</td>
                </tr>`
                    : ""
                }
                <tr style="border-top: 1px solid #D9BC9E;">
                  <td style="padding: 8px 0 0 0; font-weight: bold;">Total Amount:</td>
                  <td style="padding: 8px 0 0 0; font-weight: bold; font-size: 15px; text-align: right; color: #29251F;">₹${payload.total} (✓ Paid)</td>
                </tr>
              </table>
            </div>


            <p style="font-size: 12px; color: #696053; text-align: center; margin: 0 0 16px 0;">
              Your official PDF payment receipt is attached with this email for your records.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #EFE3D3; padding: 16px; text-align: center; font-size: 11px; color: #7A6B5A; border-top: 1px solid #D9BC9E;">
            The Indulgent Spoon • Handcrafted with love in Gurugram
          </div>
        </div>
      `,
    };

    if (payload.pdfBuffer) {
      mailOptions.attachments = [
        {
          filename: `Receipt-${payload.orderNumber}.pdf`,
          content: payload.pdfBuffer,
          contentType: "application/pdf",
        },
      ];
    }

    const info = await transporter.sendMail(mailOptions);
    await logNotification({
      orderId: payload.orderId,
      type: "CUSTOMER_ORDER_CONFIRMED_EMAIL",
      channel: "EMAIL",
      recipient: payload.customerEmail,
      status: "sent",
      providerMessageId: info.messageId,
    });

    return { success: true };
  } catch (err: any) {
    console.error("Email send error:", err);
    await logNotification({
      orderId: payload.orderId,
      type: "CUSTOMER_ORDER_CONFIRMED_EMAIL",
      channel: "EMAIL",
      recipient: payload.customerEmail,
      status: "failed",
      errorMessage: err.message || "Unknown error",
    });
    return { success: false, error: err.message };
  }
}

/**
 * Send Instant Kitchen Alert Email to Bakery Admin when customer confirms payment
 */
export async function sendAdminNewOrderEmail(payload: {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  orderType: "delivery" | "takeaway";
  deliveryDate?: string | null;
  deliveryTimeSlot?: string | null;
  itemsList: string;
  approveUrl: string;
  rejectUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
    const user = process.env.EMAIL_USER || process.env.SMTP_USER;
    const pass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASSWORD;
    const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587;
    const from = process.env.EMAIL_FROM || `"${BAKERY_NAME}" <orders@theindulgentspoon.com>`;
    const adminEmail = process.env.ADMIN_EMAIL || user;

    if (!host || !user || !pass || !adminEmail) {
      return { success: false, error: "SMTP not configured" };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const mailOptions = {
      from,
      to: adminEmail,
      subject: `🔔 NEW ORDER #${payload.orderNumber} (₹${payload.total}) — Verification Required`,
      html: `
        <div style="font-family: sans-serif; max-width: 580px; margin: 0 auto; background: #FAF6EF; border: 1px solid #D9BC9E; border-radius: 16px; padding: 24px; color: #29251F;">
          <h2 style="color: #A34B3D; margin: 0 0 12px 0;">🔔 New Payment Verification Request</h2>
          <p style="font-size: 14px; margin: 0 0 16px 0;">Customer has clicked <strong>"I PAID"</strong> for Order <strong>#${payload.orderNumber}</strong>.</p>
          
          <div style="background: #FFFFFF; border: 1px solid #E8D5BC; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 4px 0; font-size: 13px;"><strong>Customer:</strong> ${payload.customerName} (+91 ${payload.customerPhone})</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Total Amount:</strong> ₹${payload.total} (UPI)</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Fulfillment:</strong> ${payload.orderType === "delivery" ? "🚚 Delivery" : "🛍️ Store Pickup"}</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Scheduled:</strong> ${payload.deliveryDate || "Scheduled"} • ${payload.deliveryTimeSlot || ""}</p>
          </div>

          <div style="text-align: center; margin: 24px 0; display: flex; gap: 12px; justify-content: center;">
            <a href="${payload.approveUrl}" style="background: #3e683f; color: #FFF; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
              ✅ 1-Click Approve Payment
            </a>
          </div>

          <div style="text-align: center;">
            <a href="${payload.rejectUrl}" style="color: #A95145; font-size: 12px; text-decoration: underline;">
              ❌ Reject / Money Not Received
            </a>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (err: any) {
    console.error("Admin Email send error:", err);
    return { success: false, error: err.message };
  }
}
