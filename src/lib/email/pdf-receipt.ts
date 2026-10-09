/**
 * Server-side PDF receipt generator for The Indulgent Spoon
 * Uses jsPDF — already installed in package.json
 */

export interface ReceiptItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ReceiptData {
  orderNumber: string;
  orderId: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  orderType: "delivery" | "takeaway";
  deliveryAddress?: string | null;
  deliveryDate?: string | null;
  deliveryTimeSlot?: string | null;
  items: ReceiptItem[];
  subtotal: number;
  deliveryCharge: number;
  packagingFee: number;
  hasGiftNote?: boolean;
  giftNoteFee?: number;
  giftNote?: string | null;
  total: number;
  paymentStatus: string;
  paymentMethod?: string;
  razorpayPaymentId?: string | null;
}

/**
 * Generates a PDF receipt as a Buffer.
 */
export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 20;

  // ── Header Band ────────────────────────────────────────────────────
  doc.setFillColor(41, 37, 31);
  doc.rect(0, 0, pageW, 36, "F");

  doc.setTextColor(245, 235, 221);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("The Indulgent Spoon", margin, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(217, 188, 158);
  doc.text("DLF Phase 4, Gurugram  |  theindulgentspoon@okaxis", margin, 23);
  doc.text("Order Receipt", margin, 29);

  // PAID badge
  const isPaid = data.paymentStatus?.toLowerCase() === "paid";
  doc.setFillColor(...(isPaid ? ([77, 124, 71] as [number,number,number]) : ([169, 81, 69] as [number,number,number])));
  doc.roundedRect(pageW - margin - 26, 12, 26, 10, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(isPaid ? "PAID" : "PENDING", pageW - margin - 13, 18.5, { align: "center" });

  y = 46;

  // ── Order Meta ───────────────────────────────────────────────────
  doc.setTextColor(41, 37, 31);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Order #${data.orderNumber}`, margin, y);

  const dateStr = new Date(data.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(105, 96, 83);
  doc.text(dateStr, pageW - margin, y, { align: "right" });

  y += 8;
  doc.setDrawColor(217, 188, 158);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── Customer + Delivery columns ───────────────────────────────────
  const colW = contentW / 2 - 4;

  // Left: Customer
  doc.setFillColor(245, 235, 221);
  doc.roundedRect(margin, y, colW, 38, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(194, 107, 89);
  doc.text("CUSTOMER", margin + 4, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(41, 37, 31);
  doc.text(data.customerName, margin + 4, y + 14);
  doc.setFontSize(8);
  doc.setTextColor(105, 96, 83);
  doc.text(data.customerPhone, margin + 4, y + 21);
  if (data.customerEmail) {
    const emailLines = doc.splitTextToSize(data.customerEmail, colW - 8);
    doc.text(emailLines[0], margin + 4, y + 27);
  }

  // Right: Delivery
  const rightX = margin + colW + 8;
  doc.setFillColor(245, 235, 221);
  doc.roundedRect(rightX, y, colW, 38, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(194, 107, 89);
  doc.text(data.orderType === "delivery" ? "DELIVERY" : "PICKUP", rightX + 4, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(41, 37, 31);

  if (data.orderType === "delivery" && data.deliveryAddress) {
    const addrLines = doc.splitTextToSize(data.deliveryAddress, colW - 8);
    doc.text(addrLines.slice(0, 2), rightX + 4, y + 14);
  } else {
    doc.text("Store Pickup", rightX + 4, y + 14);
    doc.setFontSize(8);
    doc.setTextColor(105, 96, 83);
    doc.text("DLF Phase 4, Gurugram", rightX + 4, y + 21);
  }

  if (data.deliveryDate) {
    doc.setFontSize(8);
    doc.setTextColor(105, 96, 83);
    const slotLine = data.deliveryTimeSlot
      ? `${data.deliveryDate}  ${data.deliveryTimeSlot}`
      : data.deliveryDate;
    doc.text(slotLine, rightX + 4, y + 28);
  }

  y += 46;

  // ── Items Table ───────────────────────────────────────────────────
  doc.setFillColor(41, 37, 31);
  doc.rect(margin, y, contentW, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(245, 235, 221);
  doc.text("Item", margin + 3, y + 5.5);
  doc.text("Qty", margin + contentW * 0.62, y + 5.5, { align: "center" });
  doc.text("Unit Price", margin + contentW * 0.78, y + 5.5, { align: "center" });
  doc.text("Amount", margin + contentW - 3, y + 5.5, { align: "right" });
  y += 8;

  let rowAlt = false;
  for (const item of data.items) {
    const nameLines = doc.splitTextToSize(item.productName, contentW * 0.58);
    const rowH = 9 + Math.max(0, (nameLines.length - 1) * 4);

    if (rowAlt) {
      doc.setFillColor(250, 244, 235);
      doc.rect(margin, y, contentW, rowH, "F");
    }
    rowAlt = !rowAlt;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(41, 37, 31);
    doc.text(nameLines[0], margin + 3, y + 6);

    if (nameLines.length > 1) {
      doc.setFontSize(7.5);
      doc.setTextColor(105, 96, 83);
      for (let l = 1; l < Math.min(nameLines.length, 3); l++) {
        doc.text(nameLines[l], margin + 3, y + 6 + l * 4);
      }
    }

    doc.setFontSize(8.5);
    doc.setTextColor(41, 37, 31);
    doc.text(String(item.quantity), margin + contentW * 0.62, y + 6, { align: "center" });
    doc.text(`Rs.${item.unitPrice.toFixed(2)}`, margin + contentW * 0.78, y + 6, { align: "center" });
    doc.text(`Rs.${item.subtotal.toFixed(2)}`, margin + contentW - 3, y + 6, { align: "right" });
    y += rowH;
  }

  doc.setDrawColor(217, 188, 158);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  // ── Totals ────────────────────────────────────────────────────────
  const addLine = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 9.5 : 8.5);
    doc.setTextColor(41, 37, 31);
    doc.text(label, pageW - margin - 62, y);
    doc.text(value, pageW - margin, y, { align: "right" });
    y += 6;
  };

  addLine("Subtotal", `Rs.${data.subtotal.toFixed(2)}`);
  if (data.deliveryCharge > 0) addLine("Delivery Charge", `Rs.${data.deliveryCharge.toFixed(2)}`);
  if (data.packagingFee > 0) addLine("Packing & Handling", `Rs.${data.packagingFee.toFixed(2)}`);
  if (data.hasGiftNote && data.giftNoteFee && data.giftNoteFee > 0) {
    addLine("Gift Note", `Rs.${data.giftNoteFee.toFixed(2)}`);
  }

  y += 1;
  doc.setDrawColor(217, 188, 158);
  doc.line(pageW - margin - 62, y, pageW - margin, y);
  y += 4;

  doc.setFillColor(41, 37, 31);
  doc.roundedRect(pageW - margin - 66, y - 1, 66, 10, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(245, 235, 221);
  doc.text("TOTAL PAID", pageW - margin - 62, y + 6);
  doc.text(`Rs.${data.total.toFixed(2)}`, pageW - margin - 3, y + 6, { align: "right" });
  y += 16;

  // ── Payment Info ─────────────────────────────────────────────────
  doc.setFillColor(245, 235, 221);
  doc.roundedRect(margin, y, contentW, 20, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(194, 107, 89);
  doc.text("PAYMENT INFORMATION", margin + 4, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(41, 37, 31);
  doc.text(`Method: ${data.paymentMethod || "Online / UPI"}`, margin + 4, y + 13);
  doc.setTextColor(isPaid ? 77 : 169, isPaid ? 124 : 81, isPaid ? 71 : 69);
  doc.text(`Status: ${isPaid ? "Payment Received" : "Pending"}`, margin + 4 + 60, y + 13);
  if (data.razorpayPaymentId) {
    doc.setTextColor(105, 96, 83);
    doc.setFontSize(7.5);
    doc.text(`Ref: ${data.razorpayPaymentId}`, margin + 4, y + 18);
  }
  y += 28;

  // ── Gift Note ────────────────────────────────────────────────────
  if (data.hasGiftNote && data.giftNote) {
    const noteLines = doc.splitTextToSize(`"${data.giftNote}"`, contentW - 12);
    const noteH = Math.max(18, noteLines.length * 5 + 12);
    doc.setFillColor(254, 248, 239);
    doc.setDrawColor(194, 107, 89);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentW, noteH, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(194, 107, 89);
    doc.text("Gift Note", margin + 4, y + 8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(41, 37, 31);
    doc.text(noteLines, margin + 4, y + 14);
    y += noteH + 6;
  }

  // ── Footer ───────────────────────────────────────────────────────
  const footerY = 280;
  doc.setDrawColor(217, 188, 158);
  doc.setLineWidth(0.4);
  doc.line(margin, footerY, pageW - margin, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(105, 96, 83);
  doc.text(
    "Thank you for ordering from The Indulgent Spoon! Questions? WhatsApp us on +91 96916 39268",
    pageW / 2, footerY + 5, { align: "center" }
  );
  doc.text(
    `Computer-generated receipt. Order ID: ${data.orderId}`,
    pageW / 2, footerY + 9, { align: "center" }
  );

  const uint8 = doc.output("arraybuffer");
  return Buffer.from(uint8);
}
