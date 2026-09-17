import { duffelErrorMessage, searchFlights, type FlightSlice } from "@/lib/duffel";

const CABIN_CLASSES = ["economy", "premium_economy", "business", "first"] as const;

function isCabin(v: string): v is (typeof CABIN_CLASSES)[number] {
  return (CABIN_CLASSES as readonly string[]).includes(v);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      origin?: string;
      destination?: string;
      departureDate?: string;
      returnDate?: string;
      passengers?: number;
      cabinClass?: string;
      slices?: FlightSlice[];
    };

    const origin = String(body.origin ?? "").trim().toUpperCase();
    const destination = String(body.destination ?? "").trim().toUpperCase();
    const departureDate = String(body.departureDate ?? "").trim();
    const passengers = Math.max(1, Math.min(9, Number(body.passengers ?? 1) || 1));
    const cabinClass = body.cabinClass && isCabin(body.cabinClass) ? body.cabinClass : "economy";

    if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
      return Response.json(
        { error: "Origin and destination must be 3-letter IATA codes.", offers: [] },
        { status: 400 },
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(departureDate)) {
      return Response.json(
        { error: "A valid departure date is required.", offers: [] },
        { status: 400 },
      );
    }

    const offers = await searchFlights({
      origin,
      destination,
      departureDate,
      returnDate: body.returnDate,
      passengers,
      cabinClass,
      slices: body.slices,
    });
    return Response.json({ offers, live: offers.length > 0 });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Search failed"), offers: [] },
      { status: 500 },
    );
  }
}