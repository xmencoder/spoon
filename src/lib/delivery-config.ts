/**
 * Delivery Pricing and Location Configuration
 * Distance-based delivery charge calculation using OpenStreetMap (Nominatim) and OSRM
 */

export const BAKERY_LOCATION = {
  name: "The Indulgent Spoon",
  address: "Mayfield Garden, Sector 51, Gurugram, Haryana, India",
  lat: 28.42749,
  lon: 77.06089,
};

export const DELIVERY_CONFIG = {
  BASE_DELIVERY_FARE: 60,
  BASE_DISTANCE_KM: 1,
  PER_KM_RATE: 26.25,
  MAX_DELIVERY_DISTANCE_KM: 15,
  ROUND_TO: 5,
};

/**
 * Calculate delivery charge based on road distance in kilometers.
 *
 * Formula:
 * - If distance <= 1 km: ₹60
 * - If distance > 1 km: 60 + ((distanceKm - 1) * 26.25)
 * - Rounded UP to the nearest ₹5
 */
export function calculateDeliveryCharge(distanceKm: number): number {
  if (distanceKm <= DELIVERY_CONFIG.BASE_DISTANCE_KM) {
    return DELIVERY_CONFIG.BASE_DELIVERY_FARE;
  }
  const charge =
    DELIVERY_CONFIG.BASE_DELIVERY_FARE +
    (distanceKm - DELIVERY_CONFIG.BASE_DISTANCE_KM) * DELIVERY_CONFIG.PER_KM_RATE;
  return Math.ceil(charge / DELIVERY_CONFIG.ROUND_TO) * DELIVERY_CONFIG.ROUND_TO;
}

export interface DeliveryCalculationResult {
  success: boolean;
  available: boolean;
  distanceKm: number | null;
  deliveryCharge: number | null;
  formattedAddress?: string;
  error?: string;
}

// In-memory server-side cache for geocoding & road distance queries
const distanceCache = new Map<string, { result: DeliveryCalculationResult; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

/**
 * Server-side function to geocode customer address and compute OSRM road distance
 */
export async function calculateRoadDistanceAndCharge(
  rawAddress: string
): Promise<DeliveryCalculationResult> {
  const address = rawAddress?.trim();
  if (!address || address.length < 3) {
    return {
      success: false,
      available: false,
      distanceKm: null,
      deliveryCharge: null,
      error: "Please enter a valid delivery address.",
    };
  }

  const cacheKey = address.toLowerCase().replace(/\s+/g, " ");
  const cached = distanceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // 1. Build geocoding search queries (smart fallbacks for Indian addresses)
  const queryCandidates: string[] = [];
  queryCandidates.push(address);

  if (!address.toLowerCase().includes("india")) {
    queryCandidates.push(`${address}, India`);
  }

  // Strip flat/house/unit prefix if present to help OpenStreetMap find the building/sector/street
  const cleaned = address.replace(
    /^(flat|house|h\.?no|apt|unit|villa|tower|room|plot|shop)\s*[\w\d\-\/\#]+\s*,?\s*/i,
    ""
  );
  if (cleaned !== address && cleaned.length > 3) {
    queryCandidates.push(cleaned);
    if (!cleaned.toLowerCase().includes("india")) {
      queryCandidates.push(`${cleaned}, India`);
    }
  }

  // If comma-separated, try broader search (e.g. Sector/Locality, City)
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    queryCandidates.push(parts.slice(1).join(", "));
  }

  const uniqueQueries = [...new Set(queryCandidates)];

  let customerLat: number | null = null;
  let customerLon: number | null = null;
  let displayName: string | undefined = undefined;

  // 2. Geocode using OpenStreetMap Nominatim
  for (const query of uniqueQueries) {
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query
      )}&format=json&limit=1`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(nominatimUrl, {
        headers: {
          "User-Agent": "TheIndulgentSpoonBakery/1.0 (delivery-charge-calculator)",
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
          customerLat = parseFloat(data[0].lat);
          customerLon = parseFloat(data[0].lon);
          displayName = data[0].display_name;
          break;
        }
      }
    } catch {
      // Continue to next candidate query if one times out or errors
    }
  }

  if (customerLat === null || customerLon === null) {
    return {
      success: false,
      available: false,
      distanceKm: null,
      deliveryCharge: null,
      error: "We couldn't find this address. Please check your address and try again.",
    };
  }

  // 3. Calculate ROAD distance using OSRM (Open Source Routing Machine)
  let roadDistanceMeters: number | null = null;
  try {
    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${BAKERY_LOCATION.lon},${BAKERY_LOCATION.lat};${customerLon},${customerLat}?overview=false`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const osrmRes = await fetch(osrmUrl, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (osrmRes.ok) {
      const osrmData = await osrmRes.json();
      if (osrmData.code === "Ok" && osrmData.routes && osrmData.routes.length > 0) {
        roadDistanceMeters = osrmData.routes[0].distance;
      }
    }
  } catch {
    return {
      success: false,
      available: false,
      distanceKm: null,
      deliveryCharge: null,
      error: "Unable to calculate delivery distance right now. Please try again.",
    };
  }

  if (roadDistanceMeters === null) {
    return {
      success: false,
      available: false,
      distanceKm: null,
      deliveryCharge: null,
      error: "Unable to calculate delivery distance right now. Please try again.",
    };
  }

  // 4. Convert meters to km
  const distanceKm = parseFloat((roadDistanceMeters / 1000).toFixed(1));

  // 5. Check 15 km limit
  if (distanceKm > DELIVERY_CONFIG.MAX_DELIVERY_DISTANCE_KM) {
    const result: DeliveryCalculationResult = {
      success: true,
      available: false,
      distanceKm,
      deliveryCharge: null,
      formattedAddress: displayName,
      error: "Sorry, we currently deliver only within 15 km.",
    };
    distanceCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  // 6. Calculate delivery charge
  const deliveryCharge = calculateDeliveryCharge(distanceKm);
  const result: DeliveryCalculationResult = {
    success: true,
    available: true,
    distanceKm,
    deliveryCharge,
    formattedAddress: displayName,
  };

  distanceCache.set(cacheKey, { result, timestamp: Date.now() });
  return result;
}
