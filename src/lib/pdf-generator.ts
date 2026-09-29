import { jsPDF } from "jspdf";
import type { Order, OrderItem } from "@/types/database";

export interface ReceiptData {
  orderNumber: string;
  orderId: string;
  createdAt: string;
  orderType: "delivery" | "takeaway";
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  deliveryAddress?: string | null;
  pickupLocation?: string | null;
  deliveryDate?: string | null;
  deliveryTimeSlot?: string | null;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    sizeLabel?: string;
    addons?: Array<{ label: string; price: number }>;
    subtotal: number;
  }>;
  subtotal: number;
  deliveryCharge: number;
  packagingFee?: number;
  giftNoteFee?: number;
  giftNote?: string | null;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentVerifiedAt?: string | null;
  trackingUrl: string;
  bakeryName?: string;
  bakeryPhone?: string;
  bakeryAddress?: string;
}

/**
 * Generate a luxury styled PDF receipt using jsPDF
 * Compatible with both Node.js (Server actions / API) and browser environments.
 */
export function generateOrderReceiptPdf(data: ReceiptData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // ── 1. Header Banner & Background ──
  // Header container
  doc.setFillColor(99, 72, 50); // #634832 warm dark chocolate
  doc.rect(0, 0, pageWidth, 42, "F");

  // Gold/terracotta accent stripe
  doc.setFillColor(194, 107, 89); // #C26B59
  doc.rect(0, 42, pageWidth, 2.5, "F");

  // Header Title
  doc.setTextColor(245, 235, 221); // #F5EBDD warm cream
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(data.bakeryName || "THE INDULGENT SPOON", pageWidth / 2, 18, { align: "center" });

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(232, 213, 188); // #E8D5BC
  doc.text("Artisanal Bakery & Patisserie • Official Payment Receipt", pageWidth / 2, 26, {
    align: "center",
  });

  doc.setFontSize(8);
  doc.text(
    `${data.bakeryAddress || "DLF Phase 4, Gurugram"} • Phone: ${data.bakeryPhone || "+91 9691639268"}`,
    pageWidth / 2,
    33,
    { align: "center" }
  );

  let y = 54;

  // ── 2. Order Reference & Payment Status Card ──
  doc.setFillColor(250, 246, 239); // #FAF6EF
  doc.setDrawColor(217, 188, 158); // #D9BC9E
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(41, 37, 31); // #29251F
  doc.text(`Order Reference: ${data.orderNumber}`, margin + 5, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(105, 96, 83); // #696053
  const formattedOrderDate = new Date(data.createdAt || Date.now()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Placed on: ${formattedOrderDate}`, margin + 5, y + 15);
  doc.text(`Payment: ${data.paymentMethod} (Verified)`, margin + 5, y + 21);

  // Status Badge on Right
  doc.setFillColor(77, 124, 71); // #4D7C47 Green
  doc.roundedRect(pageWidth - margin - 45, y + 6, 40, 14, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("✓ PAID & VERIFIED", pageWidth - margin - 25, y + 15, { align: "center" });

  y += 34;

  // ── 3. Customer & Fulfillment Information ──
  const colWidth = (contentWidth - 6) / 2;

  // Left Box: Customer Details
  doc.setFillColor(245, 235, 221); // #F5EBDD
  doc.roundedRect(margin, y, colWidth, 34, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(163, 75, 61); // #A34B3D
  doc.text("CUSTOMER DETAILS", margin + 5, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(41, 37, 31);
  doc.text(data.customerName, margin + 5, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(105, 96, 83);
  doc.text(`Phone: +91 ${data.customerPhone}`, margin + 5, y + 20);
  if (data.customerEmail) {
    doc.text(`Email: ${data.customerEmail}`, margin + 5, y + 25);
  }

  // Right Box: Fulfillment Details
  const rightX = margin + colWidth + 6;
  doc.setFillColor(245, 235, 221);
  doc.roundedRect(rightX, y, colWidth, 34, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(163, 75, 61);
  doc.text(
    data.orderType === "delivery" ? "DELIVERY SCHEDULE" : "TAKEAWAY / PICKUP",
    rightX + 5,
    y + 7
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(41, 37, 31);
  const formattedDeliveryDate = data.deliveryDate
    ? new Date(data.deliveryDate + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Scheduled";
  doc.text(`Date: ${formattedDeliveryDate}`, rightX + 5, y + 14);

  if (data.deliveryTimeSlot) {
    doc.text(`Slot: ${data.deliveryTimeSlot}`, rightX + 5, y + 20);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(105, 96, 83);
  if (data.orderType === "delivery") {
    const truncatedAddress = doc.splitTextToSize(
      `Address: ${data.deliveryAddress || "As provided"}`,
      colWidth - 10
    );
    doc.text(truncatedAddress, rightX + 5, y + 25);
  } else {
    doc.text(`Pickup: ${data.pickupLocation || "The Indulgent Spoon Bakery"}`, rightX + 5, y + 25);
  }

  y += 42;

  // ── 4. Items Table ──
  // Table Header
  doc.setFillColor(99, 72, 50);
  doc.rect(margin, y, contentWidth, 7, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("ITEM DESCRIPTION", margin + 4, y + 5);
  doc.text("QTY", margin + contentWidth - 40, y + 5, { align: "center" });
  doc.text("UNIT PRICE", margin + contentWidth - 20, y + 5, { align: "right" });
  doc.text("TOTAL", margin + contentWidth - 4, y + 5, { align: "right" });

  y += 7;

  // Item Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(41, 37, 31);

  data.items.forEach((item, index) => {
    const rowBg = index % 2 === 0 ? 255 : 250;
    doc.setFillColor(rowBg, rowBg === 255 ? 255 : 246, rowBg === 255 ? 255 : 239);
    doc.rect(margin, y, contentWidth, 8, "F");

    let itemTitle = item.name;
    if (item.sizeLabel) itemTitle += ` (${item.sizeLabel})`;

    doc.setFont("helvetica", "bold");
    doc.text(itemTitle, margin + 4, y + 5.5);

    doc.setFont("helvetica", "normal");
    doc.text(String(item.quantity), margin + contentWidth - 40, y + 5.5, { align: "center" });
    doc.text(`Rs. ${item.unitPrice}`, margin + contentWidth - 20, y + 5.5, { align: "right" });
    doc.text(`Rs. ${item.subtotal}`, margin + contentWidth - 4, y + 5.5, { align: "right" });

    y += 8;
  });

  // ── 5. Total Calculations ──
  y += 3;
  doc.setDrawColor(217, 188, 158);
  doc.line(margin, y, margin + contentWidth, y);
  y += 4;

  const totalLabelX = margin + contentWidth - 60;
  const totalValX = margin + contentWidth - 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(105, 96, 83);

  doc.text("Subtotal:", totalLabelX, y);
  doc.text(`Rs. ${data.subtotal}`, totalValX, y, { align: "right" });
  y += 5;

  doc.text(
    data.orderType === "delivery" ? "Delivery Charges:" : "Takeaway / Store Pickup:",
    totalLabelX,
    y
  );
  doc.text(
    data.orderType === "delivery" ? `Rs. ${data.deliveryCharge}` : "FREE (Rs. 0)",
    totalValX,
    y,
    { align: "right" }
  );
  y += 5;

  if (data.packagingFee && data.packagingFee > 0) {
    doc.text("Packaging & Handling:", totalLabelX, y);
    doc.text(`Rs. ${data.packagingFee}`, totalValX, y, { align: "right" });
    y += 5;
  }

  if (data.giftNoteFee && data.giftNoteFee > 0) {
    doc.text("Gift Ribbon & Note Card:", totalLabelX, y);
    doc.text(`Rs. ${data.giftNoteFee}`, totalValX, y, { align: "right" });
    y += 5;
  }

  // Grand Total Highlight
  y += 2;
  doc.setFillColor(245, 235, 221);
  doc.roundedRect(totalLabelX - 4, y - 4, contentWidth - (totalLabelX - margin) + 4, 10, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(163, 75, 61);
  doc.text("TOTAL PAID:", totalLabelX, y + 3);
  doc.text(`Rs. ${data.total}`, totalValX, y + 3, { align: "right" });

  y += 18;

  // ── 6. Track Order Box & Live Link ──
  doc.setFillColor(250, 246, 239);
  doc.setDrawColor(194, 107, 89);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(99, 72, 50);
  doc.text("📦 LIVE ORDER TRACKING", margin + 6, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(105, 96, 83);
  doc.text(
    "You can track the live kitchen & baking status of your fresh handcrafted order anytime:",
    margin + 6,
    y + 13
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(163, 75, 61);
  doc.textWithLink(data.trackingUrl, margin + 6, y + 19, { url: data.trackingUrl });

  // ── 7. Footer Note ──
  const footerY = pageHeight - 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(150, 140, 125);
  doc.text(
    "Thank you for ordering with The Indulgent Spoon. Handcrafted freshly on order.",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  return doc;
}
