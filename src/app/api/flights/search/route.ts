import { duffelErrorMessage, searchFlights, type FlightSlice } from "@/lib/duffel";

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
    const offers = await searchFlights({
      origin: body.origin ?? "LOS",
      destination: body.destination ?? "LHR",
      departureDate: body.departureDate ?? "2026-10-24",
      returnDate: body.returnDate,
      passengers: body.passengers ?? 2,
      cabinClass: (body.cabinClass as "economy" | "business") ?? "economy",
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
