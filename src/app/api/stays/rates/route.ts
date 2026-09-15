/* eslint-disable @typescript-eslint/no-explicit-any */
import { duffelErrorMessage, getStayRates } from "@/lib/duffel";
import { testPrice } from "@/lib/pricing";
import mockData from "@/lib/data.json";

export async function GET(request: Request) {
  const resultId = new URL(request.url).searchParams.get("resultId");
  if (!resultId) {
    return Response.json({ error: "resultId is required", rates: [] }, { status: 400 });
  }
  try {
    // NOTE: Stays are served from the bundled local dataset (Duffel Stays is
    // not enabled on this token). Live Duffel rates kept below, commented out.
    /*
    const rates = await getStayRates(resultId);
    */
    const stay = (mockData.accommodations as unknown as any[]).find(
      (r: any) => r.id === resultId,
    );
    const rates: any[] = stay
      ? [
          {
            id: `rat_local_${resultId}`,
            total_amount: stay.cheapest_rate_total_amount,
            total_currency: stay.cheapest_rate_currency ?? "USD",
            name: "Best Available Rate",
            description:
              "Free cancellation up to 24 hours before arrival. Complimentary breakfast included.",
          },
        ]
      : [];
    return Response.json({
      rates: rates.map((r: any) => ({
        id: r.id,
        amount: testPrice(Number(r.total_amount ?? 0)),
        currency: r.total_currency ?? "USD",
        name: r.name ?? r.board_type ?? "Room",
        description: r.description ?? "",
      })),
      live: rates.length > 0,
    });
} catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Rates fetch failed"), rates: [] },
      { status: 502 },
    );
  }
}
