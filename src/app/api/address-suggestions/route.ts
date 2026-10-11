import { NextRequest, NextResponse } from "next/server";

// Bakery coordinates (Mayfield Garden, Sector 51, Gurugram)
const BAKERY_LOCATION = {
  lat: 28.42749,
  lon: 77.06089,
};

function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Curated instant suggestions for fast typing in Gurugram & Delhi NCR (within 40km)
const POPULAR_NCR_LOCALITIES = [
  // Gurugram
  { name: "Mayfield Garden, Sector 51", city: "Gurugram", postcode: "122018" },
  { name: "Sector 51", city: "Gurugram", postcode: "122018" },
  { name: "Sector 57", city: "Gurugram", postcode: "122003" },
  { name: "Sector 52, Ardee City", city: "Gurugram", postcode: "122003" },
  { name: "Sector 43, Golf Course Road", city: "Gurugram", postcode: "122002" },
  { name: "Sector 44", city: "Gurugram", postcode: "122003" },
  { name: "Sector 45", city: "Gurugram", postcode: "122003" },
  { name: "Sector 46", city: "Gurugram", postcode: "122003" },
  { name: "Sector 47, Malibu Towne", city: "Gurugram", postcode: "122018" },
  { name: "Sector 48, Sohna Road", city: "Gurugram", postcode: "122018" },
  { name: "Sector 49, South City 2", city: "Gurugram", postcode: "122018" },
  { name: "Sector 50, Nirvana Country", city: "Gurugram", postcode: "122018" },
  { name: "Sector 54, Golf Course Road", city: "Gurugram", postcode: "122011" },
  { name: "Sector 56", city: "Gurugram", postcode: "122011" },
  { name: "DLF Phase 1", city: "Gurugram", postcode: "122002" },
  { name: "DLF Phase 2, Cyber City", city: "Gurugram", postcode: "122002" },
  { name: "DLF Phase 3", city: "Gurugram", postcode: "122002" },
  { name: "DLF Phase 4", city: "Gurugram", postcode: "122009" },
  { name: "DLF Phase 5", city: "Gurugram", postcode: "122009" },
  { name: "Sushant Lok 1", city: "Gurugram", postcode: "122009" },
  { name: "Sushant Lok 2", city: "Gurugram", postcode: "122011" },
  { name: "South City 1", city: "Gurugram", postcode: "122001" },
  { name: "South City 2", city: "Gurugram", postcode: "122018" },
  { name: "Sector 14", city: "Gurugram", postcode: "122001" },
  { name: "Sector 15", city: "Gurugram", postcode: "122001" },
  { name: "Sector 29", city: "Gurugram", postcode: "122002" },
  { name: "Sector 31", city: "Gurugram", postcode: "122001" },
  { name: "Sector 65, Golf Course Ext Road", city: "Gurugram", postcode: "122018" },
  { name: "Sector 66", city: "Gurugram", postcode: "122018" },
  { name: "Sector 67", city: "Gurugram", postcode: "122018" },
  { name: "Sector 70, Sohna Road", city: "Gurugram", postcode: "122101" },
  // Delhi (Within 40km radius)
  { name: "Sultanpur", city: "Delhi", postcode: "110074" },
  { name: "Chhattarpur", city: "Delhi", postcode: "110074" },
  { name: "Chhatarpur Farms", city: "Delhi", postcode: "110074" },
  { name: "Vasant Kunj", city: "Delhi", postcode: "110070" },
  { name: "Vasant Vihar", city: "Delhi", postcode: "110057" },
  { name: "Mehrauli", city: "Delhi", postcode: "110030" },
  { name: "Saket", city: "Delhi", postcode: "110017" },
  { name: "Malviya Nagar", city: "Delhi", postcode: "110017" },
  { name: "Hauz Khas", city: "Delhi", postcode: "110016" },
  { name: "Green Park", city: "Delhi", postcode: "110016" },
  { name: "Greater Kailash 1", city: "Delhi", postcode: "110048" },
  { name: "Greater Kailash 2", city: "Delhi", postcode: "110048" },
  { name: "Mahipalpur", city: "Delhi", postcode: "110037" },
  { name: "Aerocity", city: "Delhi", postcode: "110037" },
  { name: "Dwarka Sector 6", city: "Delhi", postcode: "110075" },
  { name: "Dwarka Sector 10", city: "Delhi", postcode: "110075" },
  { name: "Dwarka Sector 12", city: "Delhi", postcode: "110078" },
  { name: "Dwarka Sector 21", city: "Delhi", postcode: "110077" },
  { name: "Ghitorni", city: "Delhi", postcode: "110030" },
  { name: "Aya Nagar", city: "Delhi", postcode: "110047" },
  { name: "Sainik Farm", city: "Delhi", postcode: "110062" },
  { name: "Munirka", city: "Delhi", postcode: "110067" },
  { name: "RK Puram", city: "Delhi", postcode: "110022" },
  { name: "Lajpat Nagar", city: "Delhi", postcode: "110024" },
  { name: "Defence Colony", city: "Delhi", postcode: "110024" },
  { name: "South Extension", city: "Delhi", postcode: "110049" },
  { name: "Janakpuri", city: "Delhi", postcode: "110058" },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";

  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const results: Array<{
    title: string;
    subtitle: string;
    city: string;
    postcode: string;
  }> = [];

  // 1. Check instant local list first
  const queryLower = q.toLowerCase();
  const matchedLocal = POPULAR_NCR_LOCALITIES.filter((item) =>
    item.name.toLowerCase().includes(queryLower)
  );

  for (const item of matchedLocal.slice(0, 4)) {
    results.push({
      title: item.name,
      subtitle: `${item.name}, ${item.city}${item.postcode ? ` — ${item.postcode}` : ""}`,
      city: item.city,
      postcode: item.postcode,
    });
  }

  // 2. Query Nominatim for live OpenStreetMap suggestions with 40km viewbox around bakery
  try {
    // 40km viewbox around bakery (lat: 28.42749, lon: 77.06089)
    // format: minLon, maxLat, maxLon, minLat
    const viewboxParam = "&viewbox=76.60,28.85,77.52,28.00&bounded=0";

    const cleanQ = q.trim();
    const nominatimQuery = cleanQ.toLowerCase().includes("india")
      ? cleanQ
      : `${cleanQ}, India`;

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      nominatimQuery
    )}&format=json&addressdetails=1&limit=8&countrycodes=in${viewboxParam}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "TheIndulgentSpoonBakery/1.0 (address-suggestions)",
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);

          // Filter by 40km delivery radius (allow up to 45km buffer for straight-line vs road)
          if (!isNaN(lat) && !isNaN(lon)) {
            const distanceKm = calculateHaversineDistanceKm(
              BAKERY_LOCATION.lat,
              BAKERY_LOCATION.lon,
              lat,
              lon
            );

            if (distanceKm <= 46) {
              const name = item.name || item.display_name.split(",")[0].trim();
              const postcode = item.address?.postcode || "";

              // Determine city/state accurately
              const displayNameLower = (item.display_name || "").toLowerCase();
              let city = "Gurugram";
              if (displayNameLower.includes("delhi") || postcode.startsWith("11")) {
                city = "Delhi";
              } else if (displayNameLower.includes("faridabad")) {
                city = "Faridabad";
              } else if (displayNameLower.includes("noida")) {
                city = "Noida";
              } else if (
                item.address?.city ||
                item.address?.town ||
                item.address?.state_district
              ) {
                city =
                  item.address.city ||
                  item.address.town ||
                  item.address.state_district;
              }

              // Avoid duplicates
              if (!results.some((r) => r.title.toLowerCase() === name.toLowerCase())) {
                results.push({
                  title: name,
                  subtitle: item.display_name,
                  city,
                  postcode,
                });
              }
            }
          }
        }
      }
    }
  } catch {
    // Return whatever local matches we found if Nominatim times out
  }

  return NextResponse.json({ suggestions: results.slice(0, 6) });
}
