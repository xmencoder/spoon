import { NextRequest, NextResponse } from "next/server";

// Curated instant suggestions for fast typing in Gurugram / Delhi NCR
const POPULAR_GURUGRAM_LOCALITIES = [
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
  { name: "Sector 53, DLF Phase 5", city: "Gurugram", postcode: "122009" },
  { name: "DLF Phase 1", city: "Gurugram", postcode: "122002" },
  { name: "DLF Phase 2, Cyber City", city: "Gurugram", postcode: "122002" },
  { name: "DLF Phase 3", city: "Gurugram", postcode: "122002" },
  { name: "DLF Phase 4", city: "Gurugram", postcode: "122009" },
  { name: "DLF Phase 5", city: "Gurugram", postcode: "122009" },
  { name: "Sushant Lok 1", city: "Gurugram", postcode: "122009" },
  { name: "Sushant Lok 2", city: "Gurugram", postcode: "122011" },
  { name: "Sushant Lok 3", city: "Gurugram", postcode: "122011" },
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
  const matchedLocal = POPULAR_GURUGRAM_LOCALITIES.filter((item) =>
    item.name.toLowerCase().includes(queryLower)
  );

  for (const item of matchedLocal.slice(0, 4)) {
    results.push({
      title: item.name,
      subtitle: `${item.city}, Haryana — ${item.postcode}`,
      city: item.city,
      postcode: item.postcode,
    });
  }

  // 2. Query Nominatim for live OpenStreetMap suggestions
  try {
    const nominatimQuery = q.toLowerCase().includes("gurugram") || q.toLowerCase().includes("gurgaon")
      ? q
      : `${q}, Gurugram, Haryana`;

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      nominatimQuery
    )}&format=json&addressdetails=1&limit=5&countrycodes=in`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

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
          const name = item.name || item.display_name.split(",")[0];
          const postcode = item.address?.postcode || "";
          const city =
            item.address?.city ||
            item.address?.town ||
            item.address?.state_district ||
            "Gurugram";

          // Avoid duplicate titles
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
  } catch {
    // Return whatever local matches we found if Nominatim times out
  }

  return NextResponse.json({ suggestions: results.slice(0, 6) });
}
