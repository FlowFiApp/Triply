import { getDestinations } from "@/lib/duffel";

export async function GET() {
  try {
    const destinations = await getDestinations(["Ibiza", "Zanzibar", "Tokyo"]);
    return Response.json({ destinations, live: destinations.length > 0 });
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : "failed",
        destinations: [],
        live: false,
      },
      { status: 500 },
    );
  }
}