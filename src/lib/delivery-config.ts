import fs from "fs";
import path from "path";
import type {
  SurgeItem,
  DeliveryPricingConfig,
  StructuredAddress,
  DeliveryCalculationResult,
} from "./delivery-types";

export type {
  SurgeItem,
  DeliveryPricingConfig,
  StructuredAddress,
  DeliveryCalculationResult,
};

const DEFAULT_DELIVERY_PRICING: DeliveryPricingConfig = {
  baseFare: 50,
  baseDistanceKm: 1,
  perKmRate: 10,
  maxDistanceKm: 50,
  rainSurge: {
    enabled: false,
    amount: 25,
    label: "Rain Surcharge",
  },
  trafficSurge: {
    enabled: false,
    amount: 20,
    label: "Heavy Traffic Surcharge",
  },
  customSurge: {
    enabled: false,
    amount: 30,
    label: "Peak Rush Surcharge",
  },
};

export function getDeliveryPricing(): DeliveryPricingConfig {
  try {
    if (typeof window === "undefined") {
      const filePath = path.join(process.cwd(), "src", "lib", "delivery-pricing.json");
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(raw);
      }
    }
  } catch (err) {
    console.warn("Could not read dynamic delivery-pricing.json, using fallback:", err);
  }
  return DEFAULT_DELIVERY_PRICING;
}

export function saveDeliveryPricing(newConfig: DeliveryPricingConfig): boolean {
  try {
    if (typeof window === "undefined") {
      const filePath = path.join(process.cwd(), "src", "lib", "delivery-pricing.json");
      fs.writeFileSync(filePath, JSON.stringify(newConfig, null, 2), "utf-8");
      // Clear distance cache so new prices apply immediately
      distanceCache.clear();
      return true;
    }
  } catch (err) {
    console.error("Failed to write delivery-pricing.json:", err);
  }
  return false;
}

export const BAKERY_LOCATION = {
  name: "The Indulgent Spoon",
  address: "N 376, 2nd Floor, Mayfield Gardens, Sec 51, Gurgaon 122018",
  lat: 28.42749,
  lon: 77.06089,
};

export const DELIVERY_CONFIG = {
  get BASE_DELIVERY_FARE() { return getDeliveryPricing().baseFare; },
  get BASE_DISTANCE_KM() { return getDeliveryPricing().baseDistanceKm; },
  get PER_KM_RATE() { return getDeliveryPricing().perKmRate; },
  get MAX_DELIVERY_DISTANCE_KM() { return getDeliveryPricing().maxDistanceKm; },
  ROUND_TO: 1,
};

/**
 * Returns full breakdown of the delivery fee for a given distance,
 * including base fare, distance charge, and active surcharges (rain, traffic, custom).
 */
export function getDeliveryChargeBreakdown(distanceKm: number) {
  const config = getDeliveryPricing();
  const extraDistance = Math.max(0, distanceKm - config.baseDistanceKm);
  const baseCharge = config.baseFare;
  const distanceCharge = Math.round(extraDistance * config.perKmRate);

  const surges: Array<{ name: string; amount: number }> = [];
  if (config.rainSurge?.enabled && config.rainSurge.amount > 0) {
    surges.push({
      name: config.rainSurge.label || "Rain Surcharge",
      amount: config.rainSurge.amount,
    });
  }
  if (config.trafficSurge?.enabled && config.trafficSurge.amount > 0) {
    surges.push({
      name: config.trafficSurge.label || "Heavy Traffic Surcharge",
      amount: config.trafficSurge.amount,
    });
  }
  if (config.customSurge?.enabled && config.customSurge.amount > 0) {
    surges.push({
      name: config.customSurge.label || "Peak Surcharge",
      amount: config.customSurge.amount,
    });
  }

  const surgeTotal = surges.reduce((sum, s) => sum + s.amount, 0);
  const total = baseCharge + distanceCharge + surgeTotal;

  return {
    config,
    total,
    baseCharge,
    distanceCharge,
    extraDistanceKm: parseFloat(extraDistance.toFixed(1)),
    surges,
  };
}

/**
 * Calculate delivery charge based on road distance in kilometers.
 * Formula: Base Fare + max(0, Distance − Base Distance) × Per Km Rate + Active Surges
 */
export function calculateDeliveryCharge(distanceKm: number): number {
  return getDeliveryChargeBreakdown(distanceKm).total;
}




export interface DistanceCacheEntry {
  distanceKm: number;
  displayName?: string;
  timestamp: number;
  source?: "mappls" | "osrm" | "haversine_calibrated" | "haversine_precheck";
  provider?: "mappls" | "osrm" | "haversine_estimate";
}

// In-memory server-side cache for geocoded distance (30-minute TTL per server instance)
export const distanceCache = new Map<string, DistanceCacheEntry>();
export const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

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
 * High-precision registry of verified NCR locations, sectors, IT parks, malls, and townships.
 * Provides instant 0ms, zero-error geocoding for all popular delivery destinations.
 */
export const KNOWN_NCR_LOCATIONS: Record<
  string,
  { lat: number; lon: number; name: string }
> = {
  // DLF Cyber Hub & Cyber City
  "dlf cyber hub": { lat: 28.4951, lon: 77.0885, name: "DLF Cyber Hub, Sector 25A, Gurugram" },
  "cyber hub": { lat: 28.4951, lon: 77.0885, name: "DLF Cyber Hub, Sector 25A, Gurugram" },
  "dlf cyberhub": { lat: 28.4951, lon: 77.0885, name: "DLF Cyber Hub, Sector 25A, Gurugram" },
  "cyberhub": { lat: 28.4951, lon: 77.0885, name: "DLF Cyber Hub, Sector 25A, Gurugram" },
  "dlf cyber city": { lat: 28.4973, lon: 77.0918, name: "DLF Cyber City, DLF Phase 2, Gurugram" },
  "cyber city": { lat: 28.4973, lon: 77.0918, name: "DLF Cyber City, DLF Phase 2, Gurugram" },
  "dlf cybercity": { lat: 28.4973, lon: 77.0918, name: "DLF Cyber City, DLF Phase 2, Gurugram" },
  "cybercity": { lat: 28.4973, lon: 77.0918, name: "DLF Cyber City, DLF Phase 2, Gurugram" },
  "building 10 cyber city": { lat: 28.4973, lon: 77.0918, name: "Building 10, DLF Cyber City, Gurugram" },
  "building 9 cyber city": { lat: 28.4965, lon: 77.091, name: "Building 9, DLF Cyber City, Gurugram" },
  "building 8 cyber city": { lat: 28.4965, lon: 77.091, name: "Building 8, DLF Cyber City, Gurugram" },
  "infinity tower": { lat: 28.4958, lon: 77.0905, name: "Infinity Towers, DLF Cyber City, Gurugram" },

  // DLF Phases
  "dlf phase 1": { lat: 28.4757, lon: 77.0963, name: "DLF Phase 1, Gurugram" },
  "dlf phase 2": { lat: 28.487, lon: 77.086, name: "DLF Phase 2, Gurugram" },
  "dlf phase 3": { lat: 28.4965, lon: 77.1005, name: "DLF Phase 3, Gurugram" },
  "dlf phase 4": { lat: 28.4675, lon: 77.0864, name: "DLF Phase 4, Gurugram" },
  "dlf phase 5": { lat: 28.455, lon: 77.099, name: "DLF Phase 5, Gurugram" },

  // Major Malls & Commercial Hubs
  "ambience mall gurgaon": { lat: 28.5048, lon: 77.097, name: "Ambience Mall, NH-8, Gurugram" },
  "ambience mall gurugram": { lat: 28.5048, lon: 77.097, name: "Ambience Mall, NH-8, Gurugram" },
  "ambience mall": { lat: 28.5048, lon: 77.097, name: "Ambience Mall, NH-8, Gurugram" },
  "one horizon center": { lat: 28.4754, lon: 77.0935, name: "One Horizon Center, Golf Course Road, Gurugram" },
  "two horizon center": { lat: 28.476, lon: 77.094, name: "Two Horizon Center, Golf Course Road, Gurugram" },
  "horizon center": { lat: 28.4754, lon: 77.0935, name: "One Horizon Center, Golf Course Road, Gurugram" },
  "worldmark sector 65": { lat: 28.4011, lon: 77.0652, name: "Worldmark, Sector 65, Gurugram" },
  "worldmark gurgaon": { lat: 28.4011, lon: 77.0652, name: "Worldmark, Sector 65, Gurugram" },
  "galleria market": { lat: 28.4678, lon: 77.0818, name: "Galleria Market, DLF Phase 4, Gurugram" },
  "cross point mall": { lat: 28.4655, lon: 77.087, name: "Cross Point Mall, DLF Phase 4, Gurugram" },
  "south point mall": { lat: 28.4502, lon: 77.1008, name: "South Point Mall, Golf Course Road, Gurugram" },
  "ardee mall": { lat: 28.444, lon: 77.078, name: "Ardee Mall, Sector 52, Gurugram" },
  "good earth city centre": { lat: 28.4215, lon: 77.054, name: "Good Earth City Centre, Sector 50, Gurugram" },
  "baani square": { lat: 28.4205, lon: 77.0625, name: "Baani Square, Sector 50, Gurugram" },
  "airia mall": { lat: 28.397, lon: 77.045, name: "Airia Mall, Sector 68, Gurugram" },
  "sector 29 market": { lat: 28.4675, lon: 77.0645, name: "Sector 29 Market, Gurugram" },

  // Townships & Residential Localities
  "mayfield garden": { lat: 28.4285, lon: 77.062, name: "Mayfield Garden, Sector 51, Gurugram" },
  "mayfield gardens": { lat: 28.4285, lon: 77.062, name: "Mayfield Garden, Sector 51, Gurugram" },
  "nirvana country": { lat: 28.421, lon: 77.0665, name: "Nirvana Country, Sector 50, Gurugram" },
  "malibu towne": { lat: 28.425, lon: 77.045, name: "Malibu Towne, Sector 47, Gurugram" },
  "south city 1": { lat: 28.461, lon: 77.058, name: "South City 1, Gurugram" },
  "south city 2": { lat: 28.4225, lon: 77.054, name: "South City 2, Gurugram" },
  "sushant lok 1": { lat: 28.4682, lon: 77.0754, name: "Sushant Lok 1, Gurugram" },
  "sushant lok 2": { lat: 28.435, lon: 77.089, name: "Sushant Lok 2, Sector 56, Gurugram" },
  "sushant lok 3": { lat: 28.423, lon: 77.098, name: "Sushant Lok 3, Sector 57, Gurugram" },
  "ardee city": { lat: 28.444, lon: 77.078, name: "Ardee City, Sector 52, Gurugram" },
  "suncity": { lat: 28.435, lon: 77.108, name: "Suncity, Sector 54, Gurugram" },
  "palam vihar": { lat: 28.508, lon: 77.037, name: "Palam Vihar, Gurugram" },

  // Key Roads
  "golf course road": { lat: 28.461, lon: 77.097, name: "Golf Course Road, Gurugram" },
  "golf course ext road": { lat: 28.406, lon: 77.082, name: "Golf Course Extension Road, Gurugram" },
  "golf course extension road": { lat: 28.406, lon: 77.082, name: "Golf Course Extension Road, Gurugram" },
  "sohna road": { lat: 28.42, lon: 77.042, name: "Sohna Road, Gurugram" },
  "mg road gurgaon": { lat: 28.4795, lon: 77.0805, name: "MG Road, Gurugram" },
  "mg road gurugram": { lat: 28.4795, lon: 77.0805, name: "MG Road, Gurugram" },

  // Gurugram Sectors
  "sector 4 gurgaon": { lat: 28.478, lon: 77.016, name: "Sector 4, Gurugram" },
  "sector 14 gurgaon": { lat: 28.4735, lon: 77.0428, name: "Sector 14, Gurugram" },
  "sector 15 gurgaon": { lat: 28.464, lon: 77.044, name: "Sector 15, Gurugram" },
  "sector 21 gurgaon": { lat: 28.508, lon: 77.059, name: "Sector 21, Gurugram" },
  "sector 22 gurgaon": { lat: 28.507, lon: 77.07, name: "Sector 22, Gurugram" },
  "sector 23 gurgaon": { lat: 28.508, lon: 77.048, name: "Sector 23, Gurugram" },
  "sector 24 gurgaon": { lat: 28.49, lon: 77.108, name: "Sector 24, Gurugram" },
  "sector 25 gurgaon": { lat: 28.486, lon: 77.092, name: "Sector 25, Gurugram" },
  "sector 27 gurgaon": { lat: 28.469, lon: 77.087, name: "Sector 27, Gurugram" },
  "sector 28 gurgaon": { lat: 28.478, lon: 77.091, name: "Sector 28, Gurugram" },
  "sector 29 gurgaon": { lat: 28.4675, lon: 77.0645, name: "Sector 29, Gurugram" },
  "sector 30 gurgaon": { lat: 28.462, lon: 77.068, name: "Sector 30, Gurugram" },
  "sector 31 gurgaon": { lat: 28.455, lon: 77.054, name: "Sector 31, Gurugram" },
  "sector 32 gurgaon": { lat: 28.448, lon: 77.042, name: "Sector 32, Gurugram" },
  "sector 38 gurgaon": { lat: 28.442, lon: 77.04, name: "Sector 38, Gurugram" },
  "sector 39 gurgaon": { lat: 28.44, lon: 77.05, name: "Sector 39, Gurugram" },
  "sector 40 gurgaon": { lat: 28.453, lon: 77.068, name: "Sector 40, Gurugram" },
  "sector 41 gurgaon": { lat: 28.455, lon: 77.076, name: "Sector 41, Gurugram" },
  "sector 42 gurgaon": { lat: 28.465, lon: 77.099, name: "Sector 42, Gurugram" },
  "sector 43 gurgaon": { lat: 28.455, lon: 77.085, name: "Sector 43, Gurugram" },
  "sector 44 gurgaon": { lat: 28.448, lon: 77.072, name: "Sector 44, Gurugram" },
  "sector 45 gurgaon": { lat: 28.442, lon: 77.068, name: "Sector 45, Gurugram" },
  "sector 46 gurgaon": { lat: 28.435, lon: 77.058, name: "Sector 46, Gurugram" },
  "sector 47 gurgaon": { lat: 28.428, lon: 77.048, name: "Sector 47, Gurugram" },
  "sector 48 gurgaon": { lat: 28.418, lon: 77.041, name: "Sector 48, Gurugram" },
  "sector 49 gurgaon": { lat: 28.415, lon: 77.052, name: "Sector 49, Gurugram" },
  "sector 50 gurgaon": { lat: 28.421, lon: 77.0665, name: "Sector 50, Gurugram" },
  "sector 51 gurgaon": { lat: 28.4285, lon: 77.062, name: "Sector 51, Gurugram" },
  "sector 52 gurgaon": { lat: 28.444, lon: 77.078, name: "Sector 52, Gurugram" },
  "sector 53 gurgaon": { lat: 28.447, lon: 77.095, name: "Sector 53, Gurugram" },
  "sector 54 gurgaon": { lat: 28.441, lon: 77.102, name: "Sector 54, Gurugram" },
  "sector 55 gurgaon": { lat: 28.434, lon: 77.111, name: "Sector 55, Gurugram" },
  "sector 56 gurgaon": { lat: 28.431, lon: 77.101, name: "Sector 56, Gurugram" },
  "sector 57 gurgaon": { lat: 28.429, lon: 77.086, name: "Sector 57, Gurugram" },
  "sector 58 gurgaon": { lat: 28.412, lon: 77.105, name: "Sector 58, Gurugram" },
  "sector 60 gurgaon": { lat: 28.408, lon: 77.098, name: "Sector 60, Gurugram" },
  "sector 61 gurgaon": { lat: 28.406, lon: 77.092, name: "Sector 61, Gurugram" },
  "sector 62 gurgaon": { lat: 28.409, lon: 77.085, name: "Sector 62, Gurugram" },
  "sector 63 gurgaon": { lat: 28.403, lon: 77.078, name: "Sector 63, Gurugram" },
  "sector 65 gurgaon": { lat: 28.4011, lon: 77.0652, name: "Sector 65, Gurugram" },
  "sector 66 gurgaon": { lat: 28.397, lon: 77.062, name: "Sector 66, Gurugram" },
  "sector 67 gurgaon": { lat: 28.388, lon: 77.058, name: "Sector 67, Gurugram" },
  "sector 68 gurgaon": { lat: 28.392, lon: 77.042, name: "Sector 68, Gurugram" },
  "sector 69 gurgaon": { lat: 28.399, lon: 77.034, name: "Sector 69, Gurugram" },
  "sector 70 gurgaon": { lat: 28.397, lon: 77.021, name: "Sector 70, Gurugram" },
  "sector 71 gurgaon": { lat: 28.408, lon: 77.018, name: "Sector 71, Gurugram" },
  "sector 72 gurgaon": { lat: 28.418, lon: 77.025, name: "Sector 72, Gurugram" },
  "sector 82 gurgaon": { lat: 28.394, lon: 76.964, name: "Sector 82, Gurugram" },
  "sector 83 gurgaon": { lat: 28.391, lon: 76.975, name: "Sector 83, Gurugram" },
  "sector 84 gurgaon": { lat: 28.403, lon: 76.979, name: "Sector 84, Gurugram" },

  // Noida Sectors & Hubs
  "sector 18 noida": { lat: 28.57, lon: 77.324, name: "Sector 18, Atta Market, Noida" },
  "sector 15 noida": { lat: 28.583, lon: 77.311, name: "Sector 15, Noida" },
  "sector 16 noida": { lat: 28.578, lon: 77.317, name: "Sector 16, Film City, Noida" },
  "sector 29 noida": { lat: 28.568, lon: 77.338, name: "Sector 29, Noida" },
  "sector 44 noida": { lat: 28.552, lon: 77.336, name: "Sector 44, Noida" },
  "sector 50 noida": { lat: 28.576, lon: 77.368, name: "Sector 50, Noida" },
  "sector 52 noida": { lat: 28.586, lon: 77.368, name: "Sector 52, Noida" },
  "sector 62 noida": { lat: 28.625, lon: 77.365, name: "Sector 62, Noida" },
  "sector 63 noida": { lat: 28.631, lon: 77.379, name: "Sector 63, Noida" },
  "sector 75 noida": { lat: 28.576, lon: 77.382, name: "Sector 75, Noida" },
  "sector 76 noida": { lat: 28.568, lon: 77.385, name: "Sector 76, Noida" },
  "sector 78 noida": { lat: 28.563, lon: 77.391, name: "Sector 78, Noida" },
  "sector 93a noida": { lat: 28.514, lon: 77.375, name: "Sector 93A, Noida" },
  "supertech emerald": { lat: 28.514, lon: 77.375, name: "Sector 93A, Supertech Emerald, Noida" },
  "sector 100 noida": { lat: 28.536, lon: 77.362, name: "Sector 100, Noida" },
  "sector 104 noida": { lat: 28.541, lon: 77.368, name: "Sector 104, Noida" },
  "sector 128 noida": { lat: 28.52, lon: 77.372, name: "Sector 128, Jaypee Greens, Noida" },
  "jaypee greens noida": { lat: 28.52, lon: 77.372, name: "Sector 128, Jaypee Greens, Noida" },
  "sector 137 noida": { lat: 28.508, lon: 77.406, name: "Sector 137, Paras Tierea, Noida" },
  "paras tierea": { lat: 28.508, lon: 77.406, name: "Sector 137, Paras Tierea, Noida" },
  "sector 143 noida": { lat: 28.489, lon: 77.424, name: "Sector 143, Noida" },
  "sector 150 noida": { lat: 28.455, lon: 77.472, name: "Sector 150, Noida" },
  "dlf mall of india": { lat: 28.568, lon: 77.321, name: "DLF Mall of India, Sector 18, Noida" },

  // Delhi Destinations
  "vasant kunj": { lat: 28.529, lon: 77.151, name: "Vasant Kunj, New Delhi" },
  "vasant vihar": { lat: 28.56, lon: 77.162, name: "Vasant Vihar, New Delhi" },
  "saket": { lat: 28.524, lon: 77.206, name: "Saket, New Delhi" },
  "malviya nagar": { lat: 28.536, lon: 77.208, name: "Malviya Nagar, New Delhi" },
  "hauz khas": { lat: 28.549, lon: 77.2, name: "Hauz Khas, New Delhi" },
  "green park": { lat: 28.558, lon: 77.204, name: "Green Park, New Delhi" },
  "greater kailash 1": { lat: 28.548, lon: 77.234, name: "Greater Kailash 1, New Delhi" },
  "gk 1": { lat: 28.548, lon: 77.234, name: "Greater Kailash 1, New Delhi" },
  "greater kailash 2": { lat: 28.535, lon: 77.241, name: "Greater Kailash 2, New Delhi" },
  "gk 2": { lat: 28.535, lon: 77.241, name: "Greater Kailash 2, New Delhi" },
  "greater kailash": { lat: 28.548, lon: 77.234, name: "Greater Kailash, New Delhi" },
  "chhattarpur": { lat: 28.502, lon: 77.175, name: "Chhattarpur, New Delhi" },
  "chhatarpur": { lat: 28.502, lon: 77.175, name: "Chhattarpur, New Delhi" },
  "sultanpur": { lat: 28.498, lon: 77.158, name: "Sultanpur, New Delhi" },
  "ghitorni": { lat: 28.489, lon: 77.138, name: "Ghitorni, New Delhi" },
  "mahipalpur": { lat: 28.545, lon: 77.126, name: "Mahipalpur, New Delhi" },
  "aerocity": { lat: 28.551, lon: 77.1215, name: "Aerocity, New Delhi" },
  "worldmark aerocity": { lat: 28.551, lon: 77.1215, name: "Worldmark Aerocity, New Delhi" },
  "dwarka sector 6": { lat: 28.588, lon: 77.066, name: "Dwarka Sector 6, New Delhi" },
  "dwarka sector 10": { lat: 28.581, lon: 77.056, name: "Dwarka Sector 10, New Delhi" },
  "dwarka sector 12": { lat: 28.592, lon: 77.04, name: "Dwarka Sector 12, New Delhi" },
  "dwarka sector 21": { lat: 28.552, lon: 77.058, name: "Dwarka Sector 21, New Delhi" },
  "dwarka": { lat: 28.592, lon: 77.046, name: "Dwarka, New Delhi" },
  "rk puram": { lat: 28.566, lon: 77.178, name: "RK Puram, New Delhi" },
  "munirka": { lat: 28.556, lon: 77.174, name: "Munirka, New Delhi" },
  "lajpat nagar": { lat: 28.568, lon: 77.243, name: "Lajpat Nagar, New Delhi" },
  "defence colony": { lat: 28.573, lon: 77.23, name: "Defence Colony, New Delhi" },
  "south extension": { lat: 28.572, lon: 77.22, name: "South Extension, New Delhi" },
  "sainik farm": { lat: 28.509, lon: 77.202, name: "Sainik Farm, New Delhi" },
  "aya nagar": { lat: 28.475, lon: 77.135, name: "Aya Nagar, New Delhi" },
  "janakpuri": { lat: 28.622, lon: 77.086, name: "Janakpuri, New Delhi" },
  "connaught place": { lat: 28.6315, lon: 77.2167, name: "Connaught Place, New Delhi" },
};

/**
 * Instant registry matcher that inspects the user input against verified NCR locations.
 * Returns exact coordinates and clean display name if a known landmark is found.
 */
export function lookupKnownNcrLocation(
  input: string | StructuredAddress
): { lat: number; lon: number; displayName: string } | null {
  const fullStr =
    typeof input === "string"
      ? input
      : [input.flatBuilding, input.areaStreet, input.landmark, input.city, input.pincode]
          .filter(Boolean)
          .join(" ");

  // Normalize: lower case and replace punctuation / delimiters with space
  const normalized = fullStr
    .toLowerCase()
    .replace(/[,\/\\|&\-#()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Detect city context from input to distinguish Gurugram sectors vs Noida sectors
  const isNoidaIntent =
    normalized.includes("noida") ||
    (typeof input === "object" && Boolean(input.pincode?.startsWith("201")));

  let bestMatch: { key: string; loc: (typeof KNOWN_NCR_LOCATIONS)[string] } | null = null;

  for (const [key, loc] of Object.entries(KNOWN_NCR_LOCATIONS)) {
    // If the key is a generic sector without city, ensure city context aligns
    if (key.includes("noida") && !isNoidaIntent) continue;
    if (key.includes("gurgaon") && isNoidaIntent) continue;

    if (normalized.includes(key)) {
      if (!bestMatch || key.length > bestMatch.key.length) {
        bestMatch = { key, loc };
      }
    }
  }

  // Also check sectors directly if sector string like "sector 57" was extracted
  if (!bestMatch) {
    const secMatch = normalized.match(/sector\s*(\d+[a-zA-Z]?)/i);
    if (secMatch) {
      const secNum = secMatch[1].toLowerCase();
      const lookupKey = isNoidaIntent
        ? `sector ${secNum} noida`
        : `sector ${secNum} gurgaon`;
      if (KNOWN_NCR_LOCATIONS[lookupKey]) {
        bestMatch = { key: lookupKey, loc: KNOWN_NCR_LOCATIONS[lookupKey] };
      }
    }
  }

  if (bestMatch) {
    return {
      lat: bestMatch.loc.lat,
      lon: bestMatch.loc.lon,
      displayName: bestMatch.loc.name,
    };
  }

  return null;
}

/**
 * Clean flat/unit prefix without stripping developer/landmark names (e.g., DLF, Ambience, Cyber)
 */
export function cleanUnitPrefix(str: string): string {
  return str
    .replace(
      /^(?:flat|house|h\.?no|apt|apartment|unit|villa|tower|room|plot|shop|bldg|building|floor)\s*[\w\d\-\/\#\.]+\s*,?\s*/i,
      ""
    )
    .replace(/^[A-Za-z]\s*[-/]\s*\d+[\w/-]*\s*,?\s*/i, "")
    .replace(/^\d+[-/]\w+\s*,?\s*/i, "")
    .replace(/^[#\d]+\s*,?\s*/i, "")
    .trim();
}

/**
 * Build an intelligent, prioritized list of candidate search queries for Indian addresses.
 * Cleans slashes, splits multi-phrase tokens (e.g., "DLF Cyber Hub / Cyber City"),
 * and avoids false city center fallbacks.
 */
export function buildGeocodingCandidates(input: string | StructuredAddress): string[] {
  const fullStr = typeof input === "string" ? input : input.address || "";
  const area = typeof input === "object" ? input.areaStreet || "" : "";
  const landmark = typeof input === "object" ? input.landmark || "" : "";
  const pincode = typeof input === "object" ? input.pincode || "" : "";
  const city = typeof input === "object" ? input.city || "" : "";

  const allText = `${area} ${fullStr} ${landmark}`.toLowerCase();
  const cityLower = city.trim().toLowerCase();

  // Intelligent city detection for NCR delivery radius
  let detectedCity = city.trim() || "Gurugram";
  if (
    cityLower === "noida" ||
    cityLower.includes("noida") ||
    allText.includes("noida") ||
    (pincode && pincode.startsWith("201"))
  ) {
    detectedCity = "Noida";
  } else if (
    cityLower === "delhi" ||
    cityLower === "new delhi" ||
    allText.includes("delhi") ||
    allText.includes("new delhi") ||
    (pincode && pincode.startsWith("11"))
  ) {
    detectedCity = "Delhi";
  } else if (
    cityLower === "faridabad" ||
    allText.includes("faridabad") ||
    (pincode && pincode.startsWith("121"))
  ) {
    detectedCity = "Faridabad";
  } else if (
    cityLower === "gurugram" ||
    cityLower === "gurgaon" ||
    allText.includes("gurugram") ||
    allText.includes("gurgaon") ||
    (pincode && pincode.startsWith("122"))
  ) {
    detectedCity = "Gurugram";
  }

  const queries: string[] = [];
  const stateContext =
    detectedCity === "Noida"
      ? "Uttar Pradesh, India"
      : detectedCity === "Delhi"
      ? "Delhi, India"
      : "Haryana, India";

  // Split multi-part strings separated by slashes, commas, pipes, or dashes
  const sourceText = [area, fullStr].filter(Boolean).join(", ");
  const rawSegments = sourceText
    .split(/[,\/|&—\-]+/)
    .map((s) => cleanUnitPrefix(s.trim()))
    .filter((s) => s.length >= 3);

  // DLF Phase extraction (Gurugram only)
  const phaseMatch = sourceText.match(/(?:DLF Phase|Phase)\s*(\d+[a-zA-Z]?)/i);
  if (phaseMatch && detectedCity === "Gurugram") {
    queries.push(`DLF Phase ${phaseMatch[1]}, Gurugram`);
    queries.push(`DLF Phase ${phaseMatch[1]}, Gurugram, ${stateContext}`);
  }

  // Sector extraction
  const sectorMatch = sourceText.match(/(?:Sector|Sec\.?)\s*(\d+[a-zA-Z]?)/i);
  if (sectorMatch) {
    const sec = `Sector ${sectorMatch[1]}`;
    if (pincode && pincode.length === 6) {
      queries.push(`${sec}, ${pincode}, ${detectedCity}`);
    }
    queries.push(`${sec}, ${detectedCity}`);
    queries.push(`${sec}, ${detectedCity}, ${stateContext}`);
  }

  // Add clean sub-segments
  for (const seg of rawSegments) {
    const cleanSeg = seg.replace(/[,\/\\|&\-#()]/g, " ").replace(/\s+/g, " ").trim();
    if (cleanSeg.length < 3) continue;

    const hasCity = cleanSeg.toLowerCase().includes(detectedCity.toLowerCase());
    if (hasCity) {
      queries.push(cleanSeg);
      queries.push(`${cleanSeg}, ${stateContext}`);
    } else {
      queries.push(`${cleanSeg}, ${detectedCity}`);
      queries.push(`${cleanSeg}, ${detectedCity}, ${stateContext}`);
      if (pincode && pincode.length === 6 && pincode !== "122001") {
        queries.push(`${cleanSeg}, ${pincode}, ${detectedCity}`);
      }
    }
  }

  // Landmark + City
  if (landmark && landmark.trim().length >= 3) {
    const cleanLandmark = landmark
      .replace(/^(?:near|opp|opposite|behind)\s+/i, "")
      .replace(/[,\/\\|&\-#()]/g, " ")
      .trim();
    queries.push(`${cleanLandmark}, ${detectedCity}`);
    queries.push(`${cleanLandmark}, ${detectedCity}, ${stateContext}`);
  }

  // Pincode + City (only if pincode is valid and not generic)
  if (pincode && /^[1-9][0-9]{5}$/.test(pincode.trim())) {
    queries.push(`${pincode.trim()}, ${detectedCity}, India`);
  }

  // Clean, unique candidates — NOTE: DO NOT append generic city center fallback!
  return [...new Set(queries.filter((q) => q && q.trim().length >= 3))];
}


// Cached Mappls OAuth token (if using Client ID / Client Secret flow)
let mapplsOAuthToken: { token: string; expiresAt: number } | null = null;

/**
 * Retrieve Mappls authentication credentials (REST Key or OAuth Bearer Token)
 */
async function getMapplsAuth(): Promise<{ restKey?: string; bearerToken?: string } | null> {
  const restKey = process.env.MAPPLS_REST_KEY || process.env.MAPPLS_API_KEY;
  if (restKey && restKey.trim().length > 0) {
    return { restKey: restKey.trim() };
  }

  const clientId = process.env.MAPPLS_CLIENT_ID;
  const clientSecret = process.env.MAPPLS_CLIENT_SECRET;
  if (clientId && clientSecret) {
    if (mapplsOAuthToken && Date.now() < mapplsOAuthToken.expiresAt) {
      return { bearerToken: mapplsOAuthToken.token };
    }
    try {
      const tokenController = new AbortController();
      const tokenTimeout = setTimeout(() => tokenController.abort(), 3500);

      const res = await fetch("https://outpost.mappls.com/api/security/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId.trim(),
          client_secret: clientSecret.trim(),
        }),
        signal: tokenController.signal,
      });
      clearTimeout(tokenTimeout);

      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 86400;
          mapplsOAuthToken = {
            token: data.access_token,
            expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
          };
          return { bearerToken: data.access_token };
        }
      }
    } catch {
      // Safe fallback if token generation fails
    }
  }

  return null;
}

/**
 * Primary Road Distance Provider: Mappls (MapmyIndia) Distance Matrix / Route API
 * Returns driving road distance in kilometers, or null on failure/timeout.
 */
export async function fetchMapplsRoadDistance(
  customerLat: number,
  customerLon: number
): Promise<{ distanceKm: number } | null> {
  const auth = await getMapplsAuth();
  if (!auth) {
    // Mappls credentials not configured in environment
    return null;
  }

  const configuredTimeout = parseInt(process.env.MAPPLS_TIMEOUT_MS || "3500", 10);
  const timeoutMs = isNaN(configuredTimeout) || configuredTimeout <= 0 ? 3500 : configuredTimeout;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // 1. Try Mappls Driving Distance Matrix API (standard distance matrix endpoint)
    const distanceMatrixUrl = auth.restKey
      ? `https://apis.mappls.com/advancedmaps/v1/${encodeURIComponent(
          auth.restKey
        )}/distance_matrix/driving/${BAKERY_LOCATION.lon},${BAKERY_LOCATION.lat};${customerLon},${customerLat}`
      : `https://apis.mappls.com/advancedmaps/v1/distance_matrix/driving/${BAKERY_LOCATION.lon},${BAKERY_LOCATION.lat};${customerLon},${customerLat}`;

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(auth.bearerToken ? { Authorization: `Bearer ${auth.bearerToken}` } : {}),
    };

    const res = await fetch(distanceMatrixUrl, {
      headers,
      signal: controller.signal,
    });

    if (res.ok) {
      const data = await res.json();

      // Check Distance Matrix response format
      const matrixDistanceMeters = data?.results?.distances?.[0]?.[1];
      if (
        typeof matrixDistanceMeters === "number" &&
        Number.isFinite(matrixDistanceMeters) &&
        matrixDistanceMeters > 0
      ) {
        const km = parseFloat((matrixDistanceMeters / 1000).toFixed(1));
        if (km >= 0 && km < 1000) {
          return { distanceKm: km };
        }
      }

      // Check Route Adv format if returned by endpoint
      const routeDistanceMeters = data?.routes?.[0]?.distance;
      if (
        typeof routeDistanceMeters === "number" &&
        Number.isFinite(routeDistanceMeters) &&
        routeDistanceMeters > 0
      ) {
        const km = parseFloat((routeDistanceMeters / 1000).toFixed(1));
        if (km >= 0 && km < 1000) {
          return { distanceKm: km };
        }
      }
    }

    // 2. If Distance Matrix was not enabled on the key (404/403/400), try Mappls Route Adv API
    if (res.status === 404 || res.status === 400 || res.status === 403) {
      const routeAdvUrl = auth.restKey
        ? `https://apis.mappls.com/advancedmaps/v1/${encodeURIComponent(
            auth.restKey
          )}/route_adv/driving/${BAKERY_LOCATION.lon},${BAKERY_LOCATION.lat};${customerLon},${customerLat}?overview=simplified`
        : `https://apis.mappls.com/advancedmaps/v1/route_adv/driving/${BAKERY_LOCATION.lon},${BAKERY_LOCATION.lat};${customerLon},${customerLat}?overview=simplified`;

      const routeRes = await fetch(routeAdvUrl, {
        headers,
        signal: controller.signal,
      });

      if (routeRes.ok) {
        const routeData = await routeRes.json();
        const distMeters = routeData?.routes?.[0]?.distance;
        if (typeof distMeters === "number" && Number.isFinite(distMeters) && distMeters > 0) {
          const km = parseFloat((distMeters / 1000).toFixed(1));
          if (km >= 0 && km < 1000) {
            return { distanceKm: km };
          }
        }
      }
    }
  } catch {
    // Mappls timed out, network error or invalid JSON - proceed safely to fallback
  } finally {
    clearTimeout(timer);
  }

  return null;
}

/**
 * Secondary Road Distance Provider: OSRM Driving Route
 * Returns driving road distance in kilometers, or null on failure/timeout.
 */
export async function fetchOsrmRoadDistance(
  customerLat: number,
  customerLon: number
): Promise<{ distanceKm: number } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${BAKERY_LOCATION.lon},${BAKERY_LOCATION.lat};${customerLon},${customerLat}?overview=false`;
    const osrmRes = await fetch(osrmUrl, { signal: controller.signal });

    if (osrmRes.ok) {
      const osrmData = await osrmRes.json();
      if (osrmData.code === "Ok" && osrmData.routes && osrmData.routes.length > 0) {
        const roadDistanceMeters = osrmData.routes[0].distance;
        if (
          typeof roadDistanceMeters === "number" &&
          Number.isFinite(roadDistanceMeters) &&
          roadDistanceMeters > 0
        ) {
          const distanceKm = parseFloat((roadDistanceMeters / 1000).toFixed(1));
          return { distanceKm };
        }
      }
    }
  } catch {
    // OSRM failed or timed out — caller will proceed to calibrated fallback
  } finally {
    clearTimeout(timeout);
  }

  return null;
}

/**
 * Server-side function to geocode customer address and compute road distance and delivery fee
 * Pipeline:
 * 1. 30-minute in-memory cache check (zero external requests on hit)
 * 2. High-precision NCR verified location registry (Tier A, zero external requests)
 * 3. Nominatim geocoding (Tier B, only if not in registry)
 * 4. Haversine straight-line pre-check: rejects >50 km before calling paid routing APIs
 * 5. Mappls Driving API (Primary road-distance provider)
 * 6. OSRM Driving Route (Secondary fallback provider)
 * 7. Calibrated Haversine * 1.45 (Tertiary fallback)
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

  // 1. Check existing 30-minute distance cache
  const cacheKey = fullAddress.toLowerCase().replace(/\s+/g, " ");
  const cached = distanceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    const maxLimit = DELIVERY_CONFIG.MAX_DELIVERY_DISTANCE_KM;
    if (cached.distanceKm > maxLimit) {
      return {
        success: true,
        available: false,
        distanceKm: cached.distanceKm,
        deliveryCharge: null,
        formattedAddress: cached.displayName,
        error: `Sorry, we currently deliver only within ${maxLimit} km (Your location is ${cached.distanceKm} km away).`,
        source: cached.source || "cache",
        provider: cached.provider,
      };
    }
    const breakdown = getDeliveryChargeBreakdown(cached.distanceKm);
    return {
      success: true,
      available: true,
      distanceKm: cached.distanceKm,
      deliveryCharge: breakdown.total,
      baseCharge: breakdown.baseCharge,
      distanceCharge: breakdown.distanceCharge,
      surges: breakdown.surges,
      formattedAddress: cached.displayName,
      source: cached.source || "cache",
      provider: cached.provider,
    };
  }

  let customerLat: number | null = null;
  let customerLon: number | null = null;
  let displayName: string | undefined = undefined;

  // 2. Instant check against verified high-precision NCR registry (Tier A)
  const knownMatch = lookupKnownNcrLocation(input);
  if (knownMatch) {
    customerLat = knownMatch.lat;
    customerLon = knownMatch.lon;
    displayName = knownMatch.displayName;
  }

  // 3. If not found in known registry, query OpenStreetMap Nominatim with clean candidate queries (Tier B)
  if (customerLat === null || customerLon === null) {
    const queryCandidates = buildGeocodingCandidates(input);
    const isNoidaIntent =
      (typeof input === "object" &&
        (input.city?.toLowerCase() === "noida" ||
          input.areaStreet?.toLowerCase().includes("noida") ||
          Boolean(input.pincode?.startsWith("201")))) ||
      (typeof input === "string" && input.toLowerCase().includes("noida"));

    for (const query of queryCandidates) {
      try {
        const isQueryNoida = query.toLowerCase().includes("noida") || isNoidaIntent;
        const viewbox = isQueryNoida
          ? "77.20,28.75,77.65,28.25"
          : "76.60,28.95,77.65,28.00";

        const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&limit=1&countrycodes=in&viewbox=${viewbox}&bounded=0`;

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
            const foundName = (data[0].display_name || "").toLowerCase();

            // If looking for a Noida address, do not falsely accept Gurgaon/Gurugram results
            if (
              isNoidaIntent &&
              (foundName.includes("gurgaon") || foundName.includes("gurugram")) &&
              !query.toLowerCase().includes("gurugram") &&
              !query.toLowerCase().includes("gurgaon")
            ) {
              continue;
            }

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
  }

  // If geocoding completely failed to locate any valid sector/landmark/pincode
  if (customerLat === null || customerLon === null) {
    return {
      success: false,
      available: false,
      distanceKm: null,
      deliveryCharge: null,
      error: "We couldn't accurately locate this address. Please include your sector, landmark, or pincode.",
    };
  }

  const maxLimit = DELIVERY_CONFIG.MAX_DELIVERY_DISTANCE_KM;

  // 4. Haversine Straight-Line Pre-check (Cost Optimization)
  // Straight-line distance is a mathematical lower bound on road distance.
  // If straight-line > 50km, road distance is guaranteed > 50km.
  // Reject immediately to avoid unnecessary calls to paid routing APIs.
  const straightLineKm = calculateHaversineDistanceKm(
    BAKERY_LOCATION.lat,
    BAKERY_LOCATION.lon,
    customerLat,
    customerLon
  );

  if (straightLineKm > maxLimit) {
    const formattedStraight = parseFloat(straightLineKm.toFixed(1));
    const result: DeliveryCalculationResult = {
      success: true,
      available: false,
      distanceKm: formattedStraight,
      deliveryCharge: null,
      formattedAddress: displayName,
      error: `Sorry, we currently deliver only within ${maxLimit} km (Your location is ${formattedStraight} km away).`,
      source: "haversine_precheck",
      provider: "haversine_estimate",
    };
    distanceCache.set(cacheKey, {
      distanceKm: formattedStraight,
      displayName,
      timestamp: Date.now(),
      source: "haversine_precheck",
      provider: "haversine_estimate",
    });
    return result;
  }

  // 5. Road Distance Calculation: Mappls (Primary) -> OSRM (Secondary) -> Calibrated Haversine (Tertiary)
  let distanceKm: number | null = null;
  let source: "mappls" | "osrm" | "haversine_calibrated" = "haversine_calibrated";
  let provider: "mappls" | "osrm" | "haversine_estimate" = "haversine_estimate";

  // Tier 1: Primary provider - Mappls Driving API
  const mapplsResult = await fetchMapplsRoadDistance(customerLat, customerLon);
  if (mapplsResult && typeof mapplsResult.distanceKm === "number" && !isNaN(mapplsResult.distanceKm)) {
    distanceKm = mapplsResult.distanceKm;
    source = "mappls";
    provider = "mappls";
  }

  // Tier 2: Secondary provider - OSRM Driving Route (if Mappls fails, times out or is unconfigured)
  if (distanceKm === null || isNaN(distanceKm)) {
    const osrmResult = await fetchOsrmRoadDistance(customerLat, customerLon);
    if (osrmResult && typeof osrmResult.distanceKm === "number" && !isNaN(osrmResult.distanceKm)) {
      distanceKm = osrmResult.distanceKm;
      source = "osrm";
      provider = "osrm";
    }
  }

  // Tier 3: Tertiary fallback - Calibrated urban road factor (Haversine * 1.45) if both APIs fail
  if (distanceKm === null || isNaN(distanceKm)) {
    distanceKm = parseFloat((straightLineKm * 1.45).toFixed(1));
    source = "haversine_calibrated";
    provider = "haversine_estimate";
  }

  // 6. Check max delivery distance limit on final calculated road distance
  if (distanceKm > maxLimit) {
    const result: DeliveryCalculationResult = {
      success: true,
      available: false,
      distanceKm,
      deliveryCharge: null,
      formattedAddress: displayName,
      error: `Sorry, we currently deliver only within ${maxLimit} km (Your location is ${distanceKm} km away).`,
      source,
      provider,
    };
    distanceCache.set(cacheKey, {
      distanceKm,
      displayName,
      timestamp: Date.now(),
      source,
      provider,
    });
    return result;
  }

  // 7. Calculate final delivery charge using established pricing formula
  const breakdown = getDeliveryChargeBreakdown(distanceKm);
  const result: DeliveryCalculationResult = {
    success: true,
    available: true,
    distanceKm,
    deliveryCharge: breakdown.total,
    baseCharge: breakdown.baseCharge,
    distanceCharge: breakdown.distanceCharge,
    surges: breakdown.surges,
    formattedAddress: displayName,
    source,
    provider,
  };

  // Cache successful result for 30 minutes
  distanceCache.set(cacheKey, {
    distanceKm,
    displayName,
    timestamp: Date.now(),
    source,
    provider,
  });

  return result;
}
