import { NextRequest, NextResponse } from "next/server";
import { calculateRoadDistanceAndCharge } from "@/lib/delivery-config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address = body?.address;
    const flatBuilding = body?.flatBuilding;
    const areaStreet = body?.areaStreet;
    const landmark = body?.landmark;
    const pincode = body?.pincode;
    const city = body?.city;

    const queryInput = {
      address: typeof address === "string" ? address : undefined,
      flatBuilding: typeof flatBuilding === "string" ? flatBuilding : undefined,
      areaStreet: typeof areaStreet === "string" ? areaStreet : undefined,
      landmark: typeof landmark === "string" ? landmark : undefined,
      pincode: typeof pincode === "string" ? pincode : undefined,
      city: typeof city === "string" ? city : undefined,
    };

    const hasAnyAddress =
      (queryInput.address && queryInput.address.trim().length >= 3) ||
      (queryInput.areaStreet && queryInput.areaStreet.trim().length >= 3) ||
      (queryInput.pincode && queryInput.pincode.trim().length >= 5);

    if (!hasAnyAddress) {
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

    const result = await calculateRoadDistanceAndCharge(queryInput);
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
