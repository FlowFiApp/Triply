import { duffelErrorMessage, searchPlaces } from "@/lib/duffel";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("query") ?? "";
  if (q.trim().length < 2) {
    return Response.json({ places: [], live: false });
  }
  try {
    const places = await searchPlaces(q);
    return Response.json({ places, live: places.length > 0 });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Place search failed"), places: [] },
      { status: 502 },
    );
  }
}