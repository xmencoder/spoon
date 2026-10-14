/**
 * Delivery Pricing and Location Configuration
 * High-reliability distance-based delivery charge calculation using OpenStreetMap (Nominatim), OSRM, and Haversine road curvature fallback.
 */

export const BAKERY_LOCATION = {
  name: "The Indulgent Spoon",
  address: "N 376, 2nd Floor, Mayfield Gardens, Sec 51, Gurgaon 122018",
  lat: 28.42749,
  lon: 77.06089,
};

export const DELIVERY_CONFIG = {
  BASE_DELIVERY_FARE: 50,
  BASE_DISTANCE_KM: 1,
  PER_KM_RATE: 10,
  MAX_DELIVERY_DISTANCE_KM: 40,
  ROUND_TO: 1,
};

/**
 * Calculate delivery charge based on road distance in kilometers.
 *
 * Formula:
 * Delivery Fee = ₹50 + max(0, Distance − 1) × ₹10
 *
 * Examples:
 * - If distance <= 1 km: ₹50
 * - If distance = 3 km: ₹50 + (3 - 1) * 10 = ₹70
 * - If distance = 3.5 km: ₹50 + (3.5 - 1) * 10 = ₹75
 */
export function calculateDeliveryCharge(distanceKm: number): number {
  const extraDistance = Math.max(0, distanceKm - DELIVERY_CONFIG.BASE_DISTANCE_KM);
  const charge =
    DELIVERY_CONFIG.BASE_DELIVERY_FARE +
    extraDistance * DELIVERY_CONFIG.PER_KM_RATE;
  return Math.round(charge);
}

export interface StructuredAddress {
  address?: string;
  flatBuilding?: string;
  areaStreet?: string;
  landmark?: string;
  pincode?: string;
  city?: string;
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
 * Calculate Great-Circle Haversine distance between two coordinates
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Build an intelligent, prioritized list of candidate search queries for Indian addresses
 */
export function buildGeocodingCandidates(input: string | StructuredAddress): string[] {
  let fullStr = typeof input === "string" ? input : input.address || "";
  let flat = typeof input === "object" ? input.flatBuilding || "" : "";
  let area = typeof input === "object" ? input.areaStreet || "" : "";
  let landmark = typeof input === "object" ? input.landmark || "" : "";
  let pincode = typeof input === "object" ? input.pincode || "" : "";
  let city = typeof input === "object" ? input.city || "Gurugram" : "Gurugram";

  const allText = `${area} ${fullStr} ${landmark}`.toLowerCase();

  // Intelligent city detection for 40km NCR delivery radius
  let detectedCity = city.trim() || "Gurugram";
  if (allText.includes("delhi") || allText.includes("new delhi") || (pincode && pincode.startsWith("11"))) {
    detectedCity = "Delhi";
  } else if (allText.includes("faridabad") || (pincode && pincode.startsWith("121"))) {
    detectedCity = "Faridabad";
  } else if (allText.includes("noida") || (pincode && (pincode.startsWith("201301") || pincode.startsWith("201303")))) {
    detectedCity = "Noida";
  } else if (allText.includes("gurugram") || allText.includes("gurgaon") || (pincode && pincode.startsWith("122"))) {
    detectedCity = "Gurugram";
  }

  const queries: string[] = [];

  // 1. Clean area string by stripping apartment/unit prefixes if present
  const cleanFlatPrefix = (str: string) =>
    str
      .replace(
        /^(?:flat|house|h\.?no|apt|unit|villa|tower|room|plot|shop|bldg|building|ww|w|a|b|c|d|e|f)\s*[\w\d\-\/\#\.]+\s*,?\s*/i,
        ""
      )
      .trim();

  const cleanedArea = cleanFlatPrefix(area || fullStr);

  // 2. Add raw cleaned area directly (e.g. "sultanpur delhi", "sultanpur delhi, India")
  if (cleanedArea && cleanedArea.length >= 3) {
    queries.push(cleanedArea);
    queries.push(`${cleanedArea}, India`);
    queries.push(`${cleanedArea}, ${detectedCity}`);
    if (pincode && pincode.length === 6 && pincode !== "122001") {
      queries.push(`${cleanedArea}, ${pincode}, ${detectedCity}`);
      queries.push(`${cleanedArea}, ${pincode}`);
    }
  }

  // 3. Comma subparts from areaStreet (e.g. "Sector 47, Malibu Towne" -> ["Sector 47", "Malibu Towne"])
  const areaParts = (area || fullStr)
    .split(",")
    .map((p) => cleanFlatPrefix(p.trim()))
    .filter((p) => p.length >= 3);

  for (const part of areaParts) {
    queries.push(`${part}, ${detectedCity}`);
    queries.push(`${part}, India`);
    if (pincode && pincode.length === 6 && pincode !== "122001") {
      queries.push(`${part}, ${pincode}, ${detectedCity}`);
    }
  }

  // 4. Sector extraction (e.g. "Sector 47, Gurugram" or "Dwarka Sector 10")
  const sectorMatch = (area || fullStr).match(/(?:Sector|Sec\.?)\s*(\d+[a-zA-Z]?)/i);
  if (sectorMatch) {
    queries.push(`Sector ${sectorMatch[1]}, ${detectedCity}`);
    if (pincode && pincode.length === 6) {
      queries.push(`Sector ${sectorMatch[1]}, ${pincode}, ${detectedCity}`);
    }
  }

  // 5. DLF Phase extraction
  const phaseMatch = (area || fullStr).match(/(?:DLF Phase|Phase)\s*(\d+[a-zA-Z]?)/i);
  if (phaseMatch) {
    queries.push(`DLF Phase ${phaseMatch[1]}, Gurugram`);
  }

  // 6. Landmark + City
  if (landmark && landmark.trim().length >= 3) {
    const cleanLandmark = landmark.replace(/^(?:near|opp|opposite|behind)\s+/i, "").trim();
    queries.push(`${cleanLandmark}, ${detectedCity}`);
    queries.push(`${cleanLandmark}, India`);
  }

  // 7. Full raw string
  if (fullStr && fullStr.length >= 3) {
    queries.push(fullStr);
    if (!fullStr.toLowerCase().includes("india")) {
      queries.push(`${fullStr}, India`);
    }
  }

  // 8. Pincode + City + India
  if (pincode && /^[1-9][0-9]{5}$/.test(pincode.trim())) {
    queries.push(`${pincode.trim()}, ${detectedCity}, India`);
    queries.push(`${pincode.trim()}, India`);
  }

  // Fallback to detected city center if nothing else
  queries.push(`${detectedCity}, India`);

  return [...new Set(queries.filter((q) => q && q.trim().length >= 3))];
}

/**
 * Server-side function to geocode customer address and compute road distance and delivery fee
 */
export async function calculateRoadDistanceAndCharge(
  input: string | StructuredAddress
): Promise<DeliveryCalculationResult> {
  const fullAddress =
    typeof input === "string"
      ? input.trim()
      : (
          input.address ||
          [input.flatBuilding, input.areaStreet, input.landmark, input.city, input.pincode]
            .filter(Boolean)
            .join(", ")
        ).trim();

  if (!fullAddress || fullAddress.length < 3) {
    return {
      success: false,
      available: false,
      distanceKm: null,
      deliveryCharge: null,
      error: "Please enter a valid delivery address.",
    };
  }

  const cacheKey = fullAddress.toLowerCase().replace(/\s+/g, " ");
  const cached = distanceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const queryCandidates = buildGeocodingCandidates(input);

  let customerLat: number | null = null;
  let customerLon: number | null = null;
  let displayName: string | undefined = undefined;

  // 1. Geocode candidate queries using OpenStreetMap Nominatim
  for (const query of queryCandidates) {
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query
      )}&format=json&limit=1&countrycodes=in&viewbox=76.60,28.85,77.52,28.00&bounded=0`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(nominatimUrl, {
        headers: {
          "User-Agent": "TheIndulgentSpoonBakery/1.0 (contact@theindulgentspoon.com)",
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          // Verify coordinates are in reasonable India/NCR bounding region
          if (!isNaN(lat) && !isNaN(lon) && lat >= 8 && lat <= 36 && lon >= 68 && lon <= 98) {
            customerLat = lat;
            customerLon = lon;
            displayName = data[0].display_name;
            break;
          }
        }
      }
    } catch {
      // Continue to next candidate query if one times out or errors
    }
  }

  // If geocoding completely failed
  if (customerLat === null || customerLon === null) {
    return {
      success: false,
      available: false,
      distanceKm: null,
      deliveryCharge: null,
      error: "We couldn't locate this address. Please check the area, sector, or pincode.",
    };
  }

  // 2. Calculate Road Distance via OSRM with Haversine Road-Curvature Fallback
  let distanceKm: number | null = null;

  try {
    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${BAKERY_LOCATION.lon},${BAKERY_LOCATION.lat};${customerLon},${customerLat}?overview=false`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const osrmRes = await fetch(osrmUrl, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (osrmRes.ok) {
      const osrmData = await osrmRes.json();
      if (osrmData.code === "Ok" && osrmData.routes && osrmData.routes.length > 0) {
        const roadDistanceMeters = osrmData.routes[0].distance;
        distanceKm = parseFloat((roadDistanceMeters / 1000).toFixed(1));
      }
    }
  } catch {
    // OSRM failed or timed out — proceed to Haversine fallback below
  }

  // Fallback: If OSRM was unavailable, calculate straight line * 1.28 (standard urban road factor)
  if (distanceKm === null || isNaN(distanceKm)) {
    const straightLineKm = calculateHaversineDistanceKm(
      BAKERY_LOCATION.lat,
      BAKERY_LOCATION.lon,
      customerLat,
      customerLon
    );
    distanceKm = parseFloat((straightLineKm * 1.28).toFixed(1));
  }

  // 3. Check 40 km limit
  if (distanceKm > DELIVERY_CONFIG.MAX_DELIVERY_DISTANCE_KM) {
    const result: DeliveryCalculationResult = {
      success: true,
      available: false,
      distanceKm,
      deliveryCharge: null,
      formattedAddress: displayName,
      error: `Sorry, we currently deliver only within 40 km (Your location is ${distanceKm} km away).`,
    };
    distanceCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  // 4. Calculate delivery charge
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
