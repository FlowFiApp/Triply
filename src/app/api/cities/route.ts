import { duffelErrorMessage, searchCities } from "@/lib/duffel";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("query") ?? "";
  try {
    const cities = await searchCities(q, 100);
    return Response.json({ cities, live: cities.length > 0 });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "City lookup failed"), cities: [] },
      { status: 502 },
    );
  }
}