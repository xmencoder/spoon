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

// Curated instant suggestions for fast typing in Gurugram, Delhi & Noida (NCR delivery radius)
const POPULAR_NCR_LOCALITIES = [
  // Gurugram
  { name: "DLF Cyber Hub", city: "Gurugram", postcode: "122002" },
  { name: "DLF Cyber City", city: "Gurugram", postcode: "122002" },
  { name: "Cyber Hub", city: "Gurugram", postcode: "122002" },
  { name: "Cyber City", city: "Gurugram", postcode: "122002" },
  { name: "Ambience Mall", city: "Gurugram", postcode: "122002" },
  { name: "One Horizon Center, Golf Course Road", city: "Gurugram", postcode: "122002" },
  { name: "Two Horizon Center, Golf Course Road", city: "Gurugram", postcode: "122002" },
  { name: "Worldmark, Sector 65", city: "Gurugram", postcode: "122018" },
  { name: "Galleria Market, DLF Phase 4", city: "Gurugram", postcode: "122009" },
  { name: "Cross Point Mall, DLF Phase 4", city: "Gurugram", postcode: "122009" },
  { name: "South Point Mall, Golf Course Road", city: "Gurugram", postcode: "122011" },
  { name: "Good Earth City Centre, Sector 50", city: "Gurugram", postcode: "122018" },
  { name: "Baani Square, Sector 50", city: "Gurugram", postcode: "122018" },
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
  // Noida (Comprehensive list within delivery radius)
  { name: "Sector 100", city: "Noida", postcode: "201304" },
  { name: "Sector 104", city: "Noida", postcode: "201304" },
  { name: "Sector 18, Atta Market", city: "Noida", postcode: "201301" },
  { name: "Sector 15", city: "Noida", postcode: "201301" },
  { name: "Sector 16, Film City", city: "Noida", postcode: "201301" },
  { name: "Sector 29", city: "Noida", postcode: "201301" },
  { name: "Sector 50", city: "Noida", postcode: "201301" },
  { name: "Sector 52", city: "Noida", postcode: "201301" },
  { name: "Sector 62", city: "Noida", postcode: "201309" },
  { name: "Sector 63", city: "Noida", postcode: "201301" },
  { name: "Sector 75", city: "Noida", postcode: "201304" },
  { name: "Sector 76", city: "Noida", postcode: "201304" },
  { name: "Sector 78", city: "Noida", postcode: "201305" },
  { name: "Sector 93A, Supertech Emerald", city: "Noida", postcode: "201304" },
  { name: "Sector 128, Jaypee Greens", city: "Noida", postcode: "201304" },
  { name: "Sector 137, Paras Tierea", city: "Noida", postcode: "201305" },
  { name: "Sector 143", city: "Noida", postcode: "201305" },
  { name: "Sector 150", city: "Noida", postcode: "201310" },
  { name: "Sector 44", city: "Noida", postcode: "201301" },
  { name: "Sector 45", city: "Noida", postcode: "201303" },
  { name: "Greater Noida West (Noida Extension)", city: "Noida", postcode: "201318" },
  // Delhi (Within delivery radius)
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
  const requestedCity = searchParams.get("city")?.trim() || "";

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
  const matchedLocal = POPULAR_NCR_LOCALITIES.filter((item) => {
    const nameMatch = item.name.toLowerCase().includes(queryLower);
    const cityMatch = item.city.toLowerCase().includes(queryLower);
    return nameMatch || cityMatch;
  });

  // Sort matches: if requestedCity is provided, put that city's items first
  if (requestedCity) {
    matchedLocal.sort((a, b) => {
      const aMatchesCity = a.city.toLowerCase() === requestedCity.toLowerCase() ? 1 : 0;
      const bMatchesCity = b.city.toLowerCase() === requestedCity.toLowerCase() ? 1 : 0;
      return bMatchesCity - aMatchesCity;
    });
  }

  for (const item of matchedLocal.slice(0, 5)) {
    results.push({
      title: item.name,
      subtitle: `${item.name}, ${item.city}${item.postcode ? ` — ${item.postcode}` : ""}`,
      city: item.city,
      postcode: item.postcode,
    });
  }

  // 2. Query Nominatim for live OpenStreetMap suggestions with viewbox around bakery and NCR
  try {
    const isNoidaTarget =
      requestedCity.toLowerCase() === "noida" || queryLower.includes("noida");

    const viewboxParam = isNoidaTarget
      ? "&viewbox=77.20,28.75,77.65,28.25&bounded=0"
      : "&viewbox=76.60,28.95,77.65,28.00&bounded=0";

    const cleanQ = q.replace(/[\/\\|&#\-]/g, " ").replace(/\s+/g, " ").trim();
    let nominatimQuery = cleanQ;
    if (isNoidaTarget && !cleanQ.toLowerCase().includes("noida")) {
      nominatimQuery = `${cleanQ}, Noida, Uttar Pradesh, India`;
    } else if (!cleanQ.toLowerCase().includes("india")) {
      nominatimQuery = `${cleanQ}, India`;
    }

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

          // Filter by 50km delivery radius
          if (!isNaN(lat) && !isNaN(lon)) {
            const distanceKm = calculateHaversineDistanceKm(
              BAKERY_LOCATION.lat,
              BAKERY_LOCATION.lon,
              lat,
              lon
            );

            if (distanceKm <= 52) {
              const name = item.name || item.display_name.split(",")[0].trim();
              const postcode = item.address?.postcode || "";

              // Determine city/state accurately
              const displayNameLower = (item.display_name || "").toLowerCase();
              let city = "Gurugram";
              if (displayNameLower.includes("noida") || postcode.startsWith("201")) {
                city = "Noida";
              } else if (displayNameLower.includes("delhi") || postcode.startsWith("11")) {
                city = "Delhi";
              } else if (displayNameLower.includes("faridabad") || postcode.startsWith("121")) {
                city = "Faridabad";
              } else if (displayNameLower.includes("gurgaon") || displayNameLower.includes("gurugram") || postcode.startsWith("122")) {
                city = "Gurugram";
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

              // Deduplicate by title AND city (so Sector 100 Noida and Sector 100 Gurugram can both exist)
              const dedupKey = `${name.toLowerCase()} - ${city.toLowerCase()}`;
              if (!results.some((r) => `${r.title.toLowerCase()} - ${r.city.toLowerCase()}` === dedupKey)) {
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
