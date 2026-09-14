import { duffelErrorMessage, getSeatMap } from "@/lib/duffel";

export async function GET(request: Request) {
  const offer = new URL(request.url).searchParams.get("offer");
  if (!offer) {
    return Response.json({ error: "offer is required", seatMap: null }, { status: 400 });
  }
  try {
    const seatMap = await getSeatMap(offer);
    return Response.json({ seatMap, live: (seatMap ?? []).length > 0 });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Seat map fetch failed"), seatMap: null },
      { status: 502 },
    );
  }
}