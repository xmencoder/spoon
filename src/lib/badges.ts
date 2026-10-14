/**
 * Utility functions for product ribbon badges.
 * Products can have single or multiple badges stored as comma-separated values
 * (e.g. "CHEF'S PICK,SUGAR FREE" or "POPULAR,GLUTEN FREE").
 */

export function parseBadges(badge?: string | null): string[] {
  if (!badge) return [];
  return badge
    .split(",")
    .map((b) => b.trim())
    .filter((b) => Boolean(b) && b.toUpperCase() !== "NONE");
}

export function getBadgeColorClass(badge: string): string {
  const normalized = badge.trim().toUpperCase();

  switch (normalized) {
    case "SUNDAY SPECIAL":
    case "SUNDAY BAKE":
    case "SUNDAY SPECIAL BAKE":
      // Warm Amber-Terracotta Badge
      return "bg-[#8A3B2F] text-[#FFF9F3] ring-1 ring-[#D8A287]/40";
    case "BESTSELLER":
      // Maroon
      return "bg-[#8E2822] text-[#F5EBDD]";
    case "POPULAR":
      // Red / Crimson
      return "bg-[#A33D31] text-[#F5EBDD]";
    case "NEW!":
    case "NEW":
      // Terracotta
      return "bg-[#C26B59] text-white";
    case "CHEF'S PICK":
    case "CHEF PICK":
    case "CHEF'S SPECIAL":
      // Gold / Warm Ochre
      return "bg-[#B4832E] text-white";
    case "SUGAR FREE":
    case "ZERO SUGAR":
    case "NO SUGAR":
      // Teal / Cyan
      return "bg-[#0E7490] text-white";
    case "GLUTEN FREE":
      // Emerald / Fresh Green
      return "bg-[#15803D] text-white";
    case "EGGLESS":
    case "100% EGGLESS":
      // Leaf Olive
      return "bg-[#3B6E34] text-white";
    case "ORGANIC":
      // Forest Green
      return "bg-[#4D7C47] text-white";
    case "INDULGENT":
      // Deep Plum / Velvet
      return "bg-[#6B3A74] text-white";
    default:
      // Elegant Terracotta / Russet fallback
      return "bg-[#B04336] text-white";
  }
}
