/**
 * Resend email sender for The Indulgent Spoon
 * Sends: 1) customer order confirmation with PDF receipt
 *         2) kitchen owner new-order alert
 *
 * REQUIRES env vars:
 *   RESEND_API_KEY
 *   EMAIL_FROM            (e.g. "The Indulgent Spoon <orders@yourdomain.com>")
 *   KITCHEN_OWNER_EMAIL   (e.g. "vasvi@theindulgentspoon.com")
 */

import { Resend } from "resend";
import nodemailer, { type Transporter } from "nodemailer";
import type { ReceiptData } from "./pdf-receipt";
import { generateReceiptPdf } from "./pdf-receipt";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "re_placeholder" || key.length < 10) return null;
  return new Resend(key);
}

function getSmtpTransporter(): Transporter | null {
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
  if (!pass) return null;
  const user =
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    process.env.KITCHEN_OWNER_EMAIL ||
    "theindulgentspoonbyvasvi@gmail.com";
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

function formatINR(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

function friendlyDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return iso;
  }
}

// ─── Customer Confirmation Email ─────────────────────────────────────────────

function buildCustomerHtml(data: ReceiptData): string {
  const isPaid = data.paymentStatus?.toLowerCase() === "paid";

  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #EFE5D7;font-size:13px;color:#29251F;">${item.productName}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EFE5D7;font-size:13px;color:#29251F;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EFE5D7;font-size:13px;color:#29251F;text-align:right;">${formatINR(item.unitPrice)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EFE5D7;font-size:13px;font-weight:600;color:#29251F;text-align:right;">${formatINR(item.subtotal)}</td>
      </tr>`
    )
    .join("");

  const deliveryInfo =
    data.orderType === "delivery"
      ? `<p style="margin:4px 0;font-size:13px;color:#29251F;"><strong>Delivery Address:</strong> ${data.deliveryAddress || "—"}</p>
         ${data.deliveryDate ? `<p style="margin:4px 0;font-size:13px;color:#29251F;"><strong>Delivery Date:</strong> ${data.deliveryDate}</p>` : ""}
         ${data.deliveryTimeSlot ? `<p style="margin:4px 0;font-size:13px;color:#29251F;"><strong>Time Slot:</strong> ${data.deliveryTimeSlot}</p>` : ""}`
      : `<p style="margin:4px 0;font-size:13px;color:#29251F;"><strong>Pickup:</strong> Store Pickup — DLF Phase 4, Gurugram</p>
         ${data.deliveryDate ? `<p style="margin:4px 0;font-size:13px;color:#29251F;"><strong>Pickup Date:</strong> ${data.deliveryDate}</p>` : ""}
         ${data.deliveryTimeSlot ? `<p style="margin:4px 0;font-size:13px;color:#29251F;"><strong>Pickup Slot:</strong> ${data.deliveryTimeSlot}</p>` : ""}`;

  const giftBlock =
    data.hasGiftNote && data.giftNote
      ? `<div style="margin-top:16px;padding:14px 16px;background:#FEF8EF;border-left:4px solid #C26B59;border-radius:6px;">
           <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#C26B59;text-transform:uppercase;letter-spacing:.05em;">Gift Note</p>
           <p style="margin:0;font-size:13px;color:#29251F;font-style:italic;">"${data.giftNote}"</p>
         </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order Confirmed</title></head>
<body style="margin:0;padding:0;background:#D9BC9E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#D9BC9E;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#F5EBDD;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(41,37,31,.12);">

        <!-- Header -->
        <tr><td style="background:#29251F;padding:28px 32px;">
          <h1 style="margin:0;color:#F5EBDD;font-size:22px;font-weight:700;letter-spacing:-.3px;">The Indulgent Spoon</h1>
          <p style="margin:4px 0 0;color:#D9BC9E;font-size:12px;">DLF Phase 4, Gurugram  •  Made with love ♡</p>
        </td></tr>

        <!-- Status Banner -->
        <tr><td style="background:${isPaid ? "#4D7C47" : "#A95145"};padding:16px 32px;">
          <p style="margin:0;color:#fff;font-size:15px;font-weight:700;">
            ${isPaid ? "✓ Your Order Is Confirmed!" : "⏳ Order Received — Payment Pending"}
          </p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:12px;">
            Order #${data.orderNumber}  •  ${friendlyDate(data.createdAt)}
          </p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:24px 32px;">

          <p style="margin:0 0 16px;font-size:14px;color:#29251F;">
            Hi <strong>${data.customerName}</strong>,<br>
            ${isPaid
              ? "Thank you for your payment! Your order has been confirmed and our kitchen team has been notified."
              : "We've received your order. Your receipt is attached below."}
          </p>

          <!-- Order Meta -->
          <div style="background:#EFE5D7;border-radius:10px;padding:16px;margin-bottom:20px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#C26B59;text-transform:uppercase;letter-spacing:.08em;">Order Details</p>
            ${deliveryInfo}
            ${giftBlock}
          </div>

          <!-- Items Table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #EFE5D7;border-radius:10px;overflow:hidden;">
            <thead>
              <tr style="background:#29251F;">
                <th style="padding:10px 12px;text-align:left;font-size:11px;color:#F5EBDD;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Item</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;color:#F5EBDD;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Qty</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;color:#F5EBDD;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Unit</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;color:#F5EBDD;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          <!-- Price Breakdown -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
            <tr>
              <td style="font-size:13px;color:#696053;padding:4px 0;">Subtotal</td>
              <td style="font-size:13px;color:#696053;text-align:right;padding:4px 0;">${formatINR(data.subtotal)}</td>
            </tr>
            ${data.deliveryCharge > 0 ? `<tr><td style="font-size:13px;color:#696053;padding:4px 0;">Delivery Charge</td><td style="font-size:13px;color:#696053;text-align:right;padding:4px 0;">${formatINR(data.deliveryCharge)}</td></tr>` : ""}
            ${data.packagingFee > 0 ? `<tr><td style="font-size:13px;color:#696053;padding:4px 0;">Packing & Handling</td><td style="font-size:13px;color:#696053;text-align:right;padding:4px 0;">${formatINR(data.packagingFee)}</td></tr>` : ""}
            ${data.hasGiftNote && data.giftNoteFee ? `<tr><td style="font-size:13px;color:#696053;padding:4px 0;">Gift Note</td><td style="font-size:13px;color:#696053;text-align:right;padding:4px 0;">${formatINR(data.giftNoteFee)}</td></tr>` : ""}
            <tr><td colspan="2" style="padding:8px 0 4px;"><hr style="border:none;border-top:1px solid #D9BC9E;margin:0;"></td></tr>
            <tr>
              <td style="font-size:16px;font-weight:700;color:#29251F;padding:4px 0;">Total Paid</td>
              <td style="font-size:16px;font-weight:700;color:#29251F;text-align:right;padding:4px 0;">${formatINR(data.total)}</td>
            </tr>
          </table>

          <!-- Payment Info -->
          <div style="margin-top:20px;background:#EFE5D7;border-radius:10px;padding:14px 16px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#C26B59;text-transform:uppercase;letter-spacing:.08em;">Payment</p>
            <p style="margin:2px 0;font-size:13px;color:#29251F;"><strong>Method:</strong> ${data.paymentMethod || "Online / UPI"}</p>
            <p style="margin:2px 0;font-size:13px;"><strong>Status:</strong> <span style="color:${isPaid ? "#4D7C47" : "#A95145"};font-weight:700;">${isPaid ? "Paid ✓" : "Pending"}</span></p>
            ${data.razorpayPaymentId ? `<p style="margin:2px 0;font-size:12px;color:#696053;">Ref: ${data.razorpayPaymentId}</p>` : ""}
          </div>

          <p style="margin:24px 0 0;font-size:13px;color:#696053;">
            Your PDF receipt is attached to this email.<br>
            Questions? WhatsApp us: <a href="https://wa.me/919717123510" style="color:#C26B59;">+91 97171 23510</a>
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#29251F;padding:20px 32px;text-align:center;">
          <p style="margin:0;color:#D9BC9E;font-size:11px;">
            The Indulgent Spoon — Made with love, one bake at a time ♡<br>
            DLF Phase 4, Gurugram
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Kitchen Owner Email ──────────────────────────────────────────────────────

function buildKitchenHtml(data: ReceiptData): string {
  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #EFE5D7;font-size:14px;color:#29251F;font-weight:600;">${item.productName}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EFE5D7;font-size:14px;color:#29251F;text-align:center;font-size:16px;font-weight:700;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EFE5D7;font-size:14px;color:#29251F;text-align:right;">${formatINR(item.unitPrice)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EFE5D7;font-size:14px;font-weight:700;color:#29251F;text-align:right;">${formatINR(item.subtotal)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New Order Alert</title></head>
<body style="margin:0;padding:0;background:#EFE5D7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFE5D7;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#F5EBDD;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(41,37,31,.1);">

        <!-- Alert Header -->
        <tr><td style="background:#4D7C47;padding:20px 28px;">
          <p style="margin:0;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;">New Paid Order Alert</p>
          <h1 style="margin:6px 0 0;color:#fff;font-size:24px;font-weight:800;">Order #${data.orderNumber}</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:12px;">${friendlyDate(data.createdAt)}</p>
        </td></tr>

        <tr><td style="padding:20px 28px;">

          <!-- 1. Customer Info -->
          <div style="background:#EFE5D7;border-radius:10px;padding:16px;margin-bottom:16px;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#C26B59;text-transform:uppercase;letter-spacing:.08em;">Customer</p>
            <p style="margin:3px 0;font-size:14px;color:#29251F;"><strong>Name:</strong> ${data.customerName}</p>
            <p style="margin:3px 0;font-size:14px;color:#29251F;"><strong>Phone:</strong> <a href="tel:${data.customerPhone}" style="color:#C26B59;">${data.customerPhone}</a></p>
            ${data.customerEmail ? `<p style="margin:3px 0;font-size:14px;color:#29251F;"><strong>Email:</strong> ${data.customerEmail}</p>` : ""}
          </div>

          <!-- 2. Delivery/Pickup Info -->
          <div style="background:#EFE5D7;border-radius:10px;padding:16px;margin-bottom:16px;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#C26B59;text-transform:uppercase;letter-spacing:.08em;">
              ${data.orderType === "delivery" ? "Delivery" : "Pickup"} Details
            </p>
            ${
              data.orderType === "delivery"
                ? `<p style="margin:3px 0;font-size:14px;color:#29251F;"><strong>Address:</strong> ${data.deliveryAddress || "—"}</p>`
                : `<p style="margin:3px 0;font-size:14px;color:#29251F;"><strong>Type:</strong> Store Pickup — DLF Phase 4, Gurugram</p>`
            }
            ${data.deliveryDate ? `<p style="margin:3px 0;font-size:14px;color:#29251F;"><strong>${data.orderType === "delivery" ? "Delivery" : "Pickup"} Date:</strong> ${data.deliveryDate}</p>` : ""}
            ${data.deliveryTimeSlot ? `<p style="margin:3px 0;font-size:16px;font-weight:700;color:#29251F;"><strong>Time Slot:</strong> ${data.deliveryTimeSlot}</p>` : ""}
          </div>

          <!-- 3. Items — Most Important for Kitchen -->
          <div style="margin-bottom:16px;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#C26B59;text-transform:uppercase;letter-spacing:.08em;">Items to Prepare</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:2px solid #29251F;border-radius:10px;overflow:hidden;">
              <thead>
                <tr style="background:#29251F;">
                  <th style="padding:10px 12px;text-align:left;font-size:11px;color:#F5EBDD;font-weight:700;text-transform:uppercase;">Product</th>
                  <th style="padding:10px 12px;text-align:center;font-size:11px;color:#F5EBDD;font-weight:700;text-transform:uppercase;">Qty</th>
                  <th style="padding:10px 12px;text-align:right;font-size:11px;color:#F5EBDD;font-weight:700;text-transform:uppercase;">Unit</th>
                  <th style="padding:10px 12px;text-align:right;font-size:11px;color:#F5EBDD;font-weight:700;text-transform:uppercase;">Total</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
          </div>

          ${data.hasGiftNote && data.giftNote ? `
          <!-- Gift Note -->
          <div style="background:#FEF8EF;border:2px solid #C26B59;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#C26B59;text-transform:uppercase;letter-spacing:.08em;">Gift Note to Include</p>
            <p style="margin:0;font-size:14px;color:#29251F;font-style:italic;">"${data.giftNote}"</p>
          </div>` : ""}

          <!-- 4. Payment Summary -->
          <div style="background:#EFE5D7;border-radius:10px;padding:16px;margin-bottom:16px;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#C26B59;text-transform:uppercase;letter-spacing:.08em;">Payment Summary</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="font-size:13px;color:#696053;padding:2px 0;">Subtotal</td><td style="font-size:13px;color:#696053;text-align:right;padding:2px 0;">${formatINR(data.subtotal)}</td></tr>
              ${data.deliveryCharge > 0 ? `<tr><td style="font-size:13px;color:#696053;padding:2px 0;">Delivery</td><td style="font-size:13px;color:#696053;text-align:right;padding:2px 0;">${formatINR(data.deliveryCharge)}</td></tr>` : ""}
              ${data.packagingFee > 0 ? `<tr><td style="font-size:13px;color:#696053;padding:2px 0;">Packing</td><td style="font-size:13px;color:#696053;text-align:right;padding:2px 0;">${formatINR(data.packagingFee)}</td></tr>` : ""}
              ${data.hasGiftNote && data.giftNoteFee ? `<tr><td style="font-size:13px;color:#696053;padding:2px 0;">Gift Note</td><td style="font-size:13px;color:#696053;text-align:right;padding:2px 0;">${formatINR(data.giftNoteFee)}</td></tr>` : ""}
              <tr><td colspan="2" style="padding:6px 0;"><hr style="border:none;border-top:1px solid #D9BC9E;margin:0;"></td></tr>
              <tr>
                <td style="font-size:16px;font-weight:800;color:#29251F;padding:4px 0;">TOTAL COLLECTED</td>
                <td style="font-size:16px;font-weight:800;color:#4D7C47;text-align:right;padding:4px 0;">${formatINR(data.total)}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#696053;padding:2px 0;">Payment Method</td>
                <td style="font-size:13px;color:#696053;text-align:right;padding:2px 0;">${data.paymentMethod || "Online / UPI"}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#696053;padding:2px 0;">Payment Status</td>
                <td style="font-size:13px;font-weight:700;color:#4D7C47;text-align:right;padding:2px 0;">PAID ✓</td>
              </tr>
              ${data.razorpayPaymentId ? `<tr><td style="font-size:11px;color:#696053;padding:2px 0;">Razorpay Ref</td><td style="font-size:11px;color:#696053;text-align:right;padding:2px 0;">${data.razorpayPaymentId}</td></tr>` : ""}
            </table>
          </div>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#29251F;padding:16px 28px;text-align:center;">
          <p style="margin:0;color:#D9BC9E;font-size:11px;">The Indulgent Spoon — Kitchen Notification System</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Main Send Functions ──────────────────────────────────────────────────────

/**
 * Send order confirmation email to the customer.
 * Attaches a receipt.pdf generated from the order data.
 */
export async function sendCustomerConfirmationEmail(
  data: ReceiptData
): Promise<EmailResult> {
  if (!data.customerEmail) {
    return { success: false, error: "No customer email address provided" };
  }

  const resend = getResendClient();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not configured — skipping customer email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const from = process.env.EMAIL_FROM || "The Indulgent Spoon <onboarding@resend.dev>";

  try {
    // Generate PDF receipt
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateReceiptPdf(data);
    } catch (pdfErr) {
      console.error("[Email] PDF generation failed:", pdfErr);
      // Continue without PDF rather than blocking the email
    }

    const attachments = pdfBuffer
      ? [{ filename: `receipt-${data.orderNumber}.pdf`, content: pdfBuffer }]
      : [];

    const { data: res, error } = await resend.emails.send({
      from,
      to: data.customerEmail,
      subject: `✓ Order Confirmed! — Order #${data.orderNumber} — The Indulgent Spoon`,
      html: buildCustomerHtml(data),
      attachments,
    });

    if (error) {
      console.error("[Email] Resend customer email error:", error);
      // In Resend sandbox mode, if email cannot be delivered to an unverified address, route to sandbox owner
      if (error.message && error.message.includes("only send testing emails to your own email address")) {
        const ownerEmail = "aadirao123i@gmail.com";
        console.log(`[Email] Sandbox mode: Forwarding customer confirmation email to ${ownerEmail}`);
        const retryRes = await resend.emails.send({
          from,
          to: ownerEmail,
          subject: `[Customer Copy: ${data.customerEmail}] ✓ Order Confirmed! — #${data.orderNumber}`,
          html: buildCustomerHtml(data),
          attachments,
        });
        if (!retryRes.error) {
          return { success: true, messageId: retryRes.data?.id };
        }
      }
      return { success: false, error: error.message };
    }

    return { success: true, messageId: res?.id };
  } catch (err: any) {
    console.error("[Email] sendCustomerConfirmationEmail error:", err);
    return { success: false, error: err?.message || "Unknown email error" };
  }
}

/**
 * Send new-order notification alert email to the kitchen / admin owner.
 */
export async function sendKitchenOwnerEmail(
  data: ReceiptData
): Promise<EmailResult> {
  const kitchenEmail =
    process.env.KITCHEN_OWNER_EMAIL ||
    process.env.ADMIN_EMAIL ||
    "theindulgentspoonbyvasvi@gmail.com";

  // 1. Try Gmail SMTP first if credentials configured
  const smtp = getSmtpTransporter();
  if (smtp) {
    try {
      const fromUser =
        process.env.SMTP_USER ||
        process.env.GMAIL_USER ||
        "theindulgentspoonbyvasvi@gmail.com";

      const info = await smtp.sendMail({
        from: `"The Indulgent Spoon Orders" <${fromUser}>`,
        to: kitchenEmail,
        subject: `🚨 NEW ORDER ALERT — #${data.orderNumber} — ${data.customerName} (${formatINR(data.total)})`,
        html: buildKitchenHtml(data),
      });

      console.log(`[Email] Admin order alert dispatched via SMTP to ${kitchenEmail}:`, info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (smtpErr: any) {
      console.error("[Email] SMTP sending error, falling back to Resend:", smtpErr);
    }
  }

  // 2. Resend provider
  const resend = getResendClient();
  if (!resend) {
    console.warn("[Email] Neither SMTP nor RESEND configured — skipping kitchen email");
    return { success: false, error: "Email provider not configured" };
  }

  const from = process.env.EMAIL_FROM || "The Indulgent Spoon <onboarding@resend.dev>";

  try {
    const { data: res, error } = await resend.emails.send({
      from,
      to: kitchenEmail,
      subject: `🚨 NEW ORDER ALERT — #${data.orderNumber} — ${data.customerName} (${formatINR(data.total)})`,
      html: buildKitchenHtml(data),
    });

    if (error) {
      console.error(`[Email] Resend error delivering admin alert to ${kitchenEmail}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Admin alert delivered to ${kitchenEmail} (ID: ${res?.id})`);
    return { success: true, messageId: res?.id };
  } catch (err: any) {
    console.error("[Email] sendKitchenOwnerEmail error:", err);
    return { success: false, error: err?.message || "Unknown email error" };
  }
}

/**
 * Convenience: send both emails and return combined results.
 */
export async function sendOrderEmails(data: ReceiptData): Promise<{
  customerEmail: EmailResult;
  kitchenEmail: EmailResult;
}> {
  const [customerEmail, kitchenEmail] = await Promise.allSettled([
    sendCustomerConfirmationEmail(data),
    sendKitchenOwnerEmail(data),
  ]);

  return {
    customerEmail:
      customerEmail.status === "fulfilled"
        ? customerEmail.value
        : { success: false, error: String((customerEmail as any).reason) },
    kitchenEmail:
      kitchenEmail.status === "fulfilled"
        ? kitchenEmail.value
        : { success: false, error: String((kitchenEmail as any).reason) },
  };
}

/**
 * Send order completion email to customer
 */
export interface OrderCompletedEmailData {
  orderNumber: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  orderType: string;
  total: number;
  deliveryAddress?: string | null;
  deliveryDate?: string | null;
  deliveryTimeSlot?: string | null;
  items?: Array<{ productName: string; quantity: number; unitPrice?: number; subtotal?: number }>;
}

export async function sendOrderCompletedEmail(data: OrderCompletedEmailData): Promise<EmailResult> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not configured — skipping completion email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  if (!data.customerEmail || !data.customerEmail.includes("@")) {
    console.warn("[Email] No valid customer email provided for order completion alert");
    return { success: false, error: "No valid email" };
  }

  const from = process.env.EMAIL_FROM || "The Indulgent Spoon <onboarding@resend.dev>";
  const isDelivery = data.orderType === "delivery";
  const itemRowsHtml = (data.items || [])
    .map(
      (i) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #EFE5D7;font-size:13px;color:#29251F;">${i.productName}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #EFE5D7;font-size:13px;color:#29251F;text-align:center;">${i.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #EFE5D7;font-size:13px;font-weight:600;color:#29251F;text-align:right;">${i.subtotal ? formatINR(i.subtotal) : ""}</td>
    </tr>
  `
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Order Completed</title>
</head>
<body style="margin:0;padding:0;background-color:#F5EBDD;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#29251F;">
  <div style="max-width:600px;margin:24px auto;background:#FFFFFF;border-radius:24px;border:1px solid #EFE5D7;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#3e683f 0%,#2a4b2b 100%);padding:32px 24px;text-align:center;color:#FFFFFF;">
      <div style="font-size:42px;margin-bottom:8px;">🎉</div>
      <h1 style="margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Your Order is Completed!</h1>
      <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">Order #${data.orderNumber} • The Indulgent Spoon</p>
    </div>

    <!-- Content -->
    <div style="padding:32px 24px;">
      <p style="font-size:15px;line-height:1.6;color:#29251F;margin:0 0 16px;">
        Dear <strong>${data.customerName}</strong>,
      </p>
      <p style="font-size:14px;line-height:1.6;color:#696053;margin:0 0 20px;">
        ${
          isDelivery
            ? "We are thrilled to let you know that your order has been successfully delivered! Our freshly prepared artisanal baked goods have made their way to you."
            : "Your freshly baked artisanal order is now complete and ready for you! Thank you for picking up from The Indulgent Spoon."
        }
      </p>

      <!-- Details Box -->
      <div style="background:#FDFBF7;border:1px solid #EFE5D7;border-radius:16px;padding:20px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
          <span style="font-size:12px;color:#696053;text-transform:uppercase;font-weight:700;">Order Number</span>
          <span style="font-size:14px;font-weight:700;color:#A34B3D;">#${data.orderNumber}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
          <span style="font-size:12px;color:#696053;text-transform:uppercase;font-weight:700;">Fulfillment</span>
          <span style="font-size:13px;font-weight:600;color:#29251F;">${isDelivery ? "🛵 Home Delivery" : "🛍️ Takeaway / Pickup"}</span>
        </div>
        ${
          data.deliveryAddress
            ? `
        <div style="margin-top:8px;padding-top:8px;border-top:1px dashed #EFE5D7;">
          <span style="font-size:12px;color:#696053;text-transform:uppercase;font-weight:700;display:block;margin-bottom:4px;">Delivery Address</span>
          <span style="font-size:13px;color:#29251F;">${data.deliveryAddress}</span>
        </div>
        `
            : ""
        }
      </div>

      <!-- Items Table -->
      ${
        data.items && data.items.length > 0
          ? `
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#F5EBDD;">
            <th style="padding:10px 12px;font-size:11px;text-align:left;color:#696053;text-transform:uppercase;font-weight:700;">Item</th>
            <th style="padding:10px 12px;font-size:11px;text-align:center;color:#696053;text-transform:uppercase;font-weight:700;">Qty</th>
            <th style="padding:10px 12px;font-size:11px;text-align:right;color:#696053;text-transform:uppercase;font-weight:700;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemRowsHtml}
        </tbody>
      </table>
      `
          : ""
      }

      <!-- Total -->
      <div style="text-align:right;padding-top:12px;margin-bottom:24px;">
        <span style="font-size:13px;color:#696053;">Total: </span>
        <strong style="font-size:18px;color:#29251F;margin-left:8px;">${formatINR(data.total)}</strong>
      </div>

      <!-- Footer Note -->
      <div style="text-align:center;padding:24px 0 8px;border-top:1px solid #EFE5D7;">
        <p style="font-size:14px;color:#29251F;margin:0 0 6px;font-weight:600;">We hope you enjoy every single bite! ❤️</p>
        <p style="font-size:12px;color:#696053;margin:0;">
          Need help or feedback? Reach out on WhatsApp at <a href="https://wa.me/919717123510" style="color:#3e683f;font-weight:600;text-decoration:none;">+91 9717123510</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const { data: res, error } = await resend.emails.send({
      from,
      to: data.customerEmail,
      subject: `🎉 Your Order #${data.orderNumber} is Completed! — The Indulgent Spoon`,
      html,
    });

    if (error) {
      console.error("[Email] Resend order completed email error:", error);
      if (error.message && error.message.includes("only send testing emails to your own email address")) {
        const ownerEmail = "aadirao123i@gmail.com";
        console.log(`[Email] Sandbox mode: Forwarding order completion email to ${ownerEmail}`);
        const retryRes = await resend.emails.send({
          from,
          to: ownerEmail,
          subject: `[Customer Copy: ${data.customerEmail}] 🎉 Your Order #${data.orderNumber} is Completed!`,
          html,
        });
        if (!retryRes.error) {
          return { success: true, messageId: retryRes.data?.id };
        }
      }
      return { success: false, error: error.message };
    }

    console.log(`[Email] Order completed email sent to ${data.customerEmail} (ID: ${res?.id})`);
    return { success: true, messageId: res?.id };
  } catch (err: any) {
    console.error("[Email] sendOrderCompletedEmail exception:", err);
    return { success: false, error: err?.message || "Unknown email error" };
  }
}

