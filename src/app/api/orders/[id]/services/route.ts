/* eslint-disable @typescript-eslint/no-explicit-any */
import { addOrderServices, duffelErrorMessage } from "@/lib/duffel";
import { testPrice } from "@/lib/pricing";
import { requireUser, unauthorized } from "@/lib/auth";

// Adds services (baggage, seats, …) to an existing order.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const serviceIds: string[] = Array.isArray(body.services)
      ? body.services.filter((s: unknown) => typeof s === "string")
      : [];
    if (!serviceIds.length) {
      return Response.json({ error: "Missing services." }, { status: 400 });
    }
    const order = await addOrderServices(id, serviceIds);
    if (!order) {
      return Response.json(
        { error: "Duffel is not configured." },
        { status: 502 },
      );
    }
    return Response.json({
      orderId: id,
      totalAmount: testPrice(Number(order.total_amount ?? 0)),
      currency: order.total_currency ?? "USD",
      services: (order.services ?? []).map((s: any) => ({
        id: s.id ?? "",
        name: s.name ?? "",
        type: s.type ?? "",
        totalAmount: testPrice(Number(s.total_amount ?? 0)),
        currency: s.total_currency ?? "USD",
      })),
      live: true,
    });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Failed to add services") },
      { status: 502 },
    );
  }
}