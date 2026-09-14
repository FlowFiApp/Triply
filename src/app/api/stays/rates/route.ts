/* eslint-disable @typescript-eslint/no-explicit-any */
import { duffelErrorMessage, getStayRates } from "@/lib/duffel";
import { testPrice } from "@/lib/pricing";

export async function GET(request: Request) {
  const resultId = new URL(request.url).searchParams.get("resultId");
  if (!resultId) {
    return Response.json({ error: "resultId is required", rates: [] }, { status: 400 });
  }
  try {
    const rates = await getStayRates(resultId);
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
