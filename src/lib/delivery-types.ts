export interface SurgeItem {
  enabled: boolean;
  amount: number;
  label: string;
}

export interface DeliveryPricingConfig {
  baseFare: number;
  baseDistanceKm: number;
  perKmRate: number;
  maxDistanceKm: number;
  rainSurge: SurgeItem;
  trafficSurge: SurgeItem;
  customSurge: SurgeItem;
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
  baseCharge?: number;
  distanceCharge?: number;
  surges?: Array<{ name: string; amount: number }>;
  source?: "cache" | "mappls" | "osrm" | "haversine_calibrated" | "haversine_precheck";
  provider?: "mappls" | "osrm" | "haversine_estimate";
}
