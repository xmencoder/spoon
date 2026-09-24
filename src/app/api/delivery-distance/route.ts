import { NextRequest, NextResponse } from "next/server";
import { calculateRoadDistanceAndCharge } from "@/lib/delivery-config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address = body?.address;

    if (!address || typeof address !== "string" || address.trim().length < 3) {
      return NextResponse.json(
        {
          success: false,
          available: false,
          distanceKm: null,
          deliveryCharge: null,
          error: "Please enter a valid delivery address.",
        },
        { status: 400 }
      );
    }

    const result = await calculateRoadDistanceAndCharge(address);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error calculating delivery distance:", error);
    return NextResponse.json(
      {
        success: false,
        available: false,
        distanceKm: null,
        deliveryCharge: null,
        error: "Unable to check delivery right now. Please try again.",
      },
      { status: 500 }
    );
  }
}
