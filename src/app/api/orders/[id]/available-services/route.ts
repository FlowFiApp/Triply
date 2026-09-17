/* eslint-disable @typescript-eslint/no-explicit-any */
import { duffelErrorMessage, getOrderAvailableServices } from "@/lib/duffel";
import { testPrice } from "@/lib/pricing";
import { requireUser, unauthorized } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const services = await getOrderAvailableServices(id);
    return Response.json({
      services: (services ?? []).map((s: any) => ({
        id: s.id ?? "",
        name: s.name ?? "",
        type: s.type ?? "",
        totalAmount: testPrice(Number(s.total_amount ?? 0)),
        currency: s.total_currency ?? "USD",
        maximumQuantity: Number(s.maximum_quantity ?? 1),
        segmentIds: s.segment_ids ?? [],
        passengerIds: s.passenger_ids ?? [],
      })),
      live: (services ?? []).length > 0,
    });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Failed to load order services"), services: [] },
      { status: 502 },
    );
  }
}