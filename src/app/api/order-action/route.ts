import { NextRequest, NextResponse } from "next/server";
import {
  verifyActionToken,
  approveOrderPaymentAction,
  rejectOrderPaymentAction,
} from "@/lib/order-approval-service";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const token = searchParams.get("token");
  const id = searchParams.get("id");
  const a = searchParams.get("a");
  const s = searchParams.get("s");

  const verification = verifyActionToken({
    token,
    id,
    action: a,
    sig: s,
  });

  if (!verification.valid || !verification.orderId || !verification.action) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#FAF6EF;color:#29251F;">
        <h2 style="color:#C26B59;">Unauthorized or Invalid Link</h2>
        <p>${verification.error || "The link is invalid or has expired."}</p>
        <div style="margin-top:20px;">
          <a href="/admin/orders" style="background:#634832;color:#FFF;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;font-size:12px;">
            Go to Admin Orders
          </a>
        </div>
      </body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 403 }
    );
  }

  try {
    if (verification.action === "approve") {
      const result = await approveOrderPaymentAction({
        orderId: verification.orderId,
        adminId: verification.adminId || "whatsapp-admin",
        approvalSource: "WHATSAPP",
      });

      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:50px 20px;text-align:center;background:#FAF6EF;color:#29251F;">
          <div style="max-width:500px;margin:0 auto;background:#FFFFFF;border:1px solid #D9BC9E;border-radius:20px;padding:36px;box-shadow:0 8px 30px rgba(99,72,50,0.08);">
            <div style="font-size:48px;margin-bottom:12px;">✅</div>
            <h2 style="color:#4D7C47;margin:0 0 10px 0;">Payment Approved!</h2>
            <p style="font-size:14px;color:#696053;margin:0 0 20px 0;">
              Order <strong>${result.orderNumber}</strong> payment has been verified.
            </p>
            <p style="font-size:12.5px;color:#54483B;line-height:1.5;">
              ✓ Order Confirmed<br/>
              ✓ Customer WhatsApp Sent<br/>
              ✓ Customer Email & PDF Receipt Dispatched<br/>
              ✓ Live Order Tracking Active
            </p>
            <div style="margin-top:28px;">
              <a href="/admin/orders" style="background:#634832;color:#FFF;text-decoration:none;padding:10px 20px;border-radius:10px;font-weight:bold;font-size:13px;">
                Open Admin Dashboard
              </a>
            </div>
          </div>
        </body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    } else {
      await rejectOrderPaymentAction({
        orderId: verification.orderId,
        adminId: verification.adminId || "whatsapp-admin",
        rejectionSource: "WHATSAPP",
      });

      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:50px 20px;text-align:center;background:#FAF6EF;color:#29251F;">
          <div style="max-width:500px;margin:0 auto;background:#FFFFFF;border:1px solid #D9BC9E;border-radius:20px;padding:36px;box-shadow:0 8px 30px rgba(99,72,50,0.08);">
            <div style="font-size:48px;margin-bottom:12px;">❌</div>
            <h2 style="color:#C26B59;margin:0 0 10px 0;">Payment Rejected</h2>
            <p style="font-size:14px;color:#696053;margin:0 0 20px 0;">
              Order has been marked as <strong>Payment Not Received</strong>.
            </p>
            <div style="margin-top:28px;">
              <a href="/admin/orders" style="background:#634832;color:#FFF;text-decoration:none;padding:10px 20px;border-radius:10px;font-weight:bold;font-size:13px;">
                Open Admin Dashboard
              </a>
            </div>
          </div>
        </body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }
  } catch (err: any) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#FAF6EF;color:#29251F;">
        <h2 style="color:#C26B59;">Action Failed</h2>
        <p>${err.message || "An error occurred while processing the action."}</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 500 }
    );
  }
}
