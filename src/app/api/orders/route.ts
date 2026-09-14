/* eslint-disable @typescript-eslint/no-explicit-any */
import { listOrders } from "@/lib/duffel";
import { formatAMPM, formatDuration } from "@/lib/format";
import type { OrderRecord } from "@/lib/types";

function normalizeOrder(o: any): OrderRecord {
  const seg = o.slices?.[0]?.segments?.[0] ?? {};
  const p = o.passengers?.[0] ?? {};
  const dep = seg.origin ?? {};
  const arr = seg.destination ?? {};
  const slice = o.slices?.[0] ?? {};
  return {
    id: o.id,
    bookingRef: o.booking_ref ?? "",
    airline: seg.marketing_carrier?.name ?? "",
    airlineCode: seg.marketing_carrier?.iata_code ?? "",
    flightNumber: seg.marketing_carrier_flight_number ?? "",
    cabin: p.cabin_class_marketing ?? "Economy",
    status: o.state ?? "confirmed",
    passengerName: `${p.given_name ?? ""} ${p.family_name ?? ""}`.trim(),
    depTime: formatAMPM(seg.departing_at),
    arrTime: formatAMPM(seg.arriving_at),
    depCode: dep.iata_code ?? "",
    depCity: dep.city_name ?? "",
    arrCode: arr.iata_code ?? "",
    arrCity: arr.city_name ?? "",
    duration: formatDuration(slice.duration),
    seat: p.seat ?? "—",
    gate: seg.gate ?? "—",
    terminal: seg.departing_terminal ?? "—",
    departureDate: (seg.departing_at ?? "").slice(0, 10),
    amountUsd: Number(o.total_amount ?? 0),
  };
}

export async function GET() {
  try {
    const orders = await listOrders();
    return Response.json({ orders: orders.map(normalizeOrder), live: true });
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : "failed",
        orders: [],
        live: false,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { createFlightOrder, ensureCustomerUser } = await import("@/lib/duffel");
    const p = body.passengers?.[0];
    const customerUserId = p?.email
      ? await ensureCustomerUser({
          email: p.email,
          given_name: p.given_name ?? "",
          family_name: p.family_name ?? "",
          phone_number: p.phone_number,
        })
      : undefined;
    const order = await createFlightOrder({
      offerId: body.offerId,
      passengers: body.passengers,
      amount: body.amount ?? 885,
      currency: body.currency ?? "USD",
      txHash: body.txHash,
      chain: body.chain,
      customerUserId: customerUserId ?? undefined,
    });
    if (!order) {
      return Response.json({
        live: false,
        error: "Duffel is not configured. Set DUFFEL_ACCESS_TOKEN to create orders.",
      });
    }
    return Response.json({ live: true, order: normalizeOrder(order) });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "order failed" },
      { status: 500 },
    );
  }
}
