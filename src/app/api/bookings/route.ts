/* eslint-disable @typescript-eslint/no-explicit-any */
import { duffelErrorMessage, listOrders, listStayBookings } from "@/lib/duffel";

function normalizeOrder(o: any) {
  const seg = o.slices?.[0]?.segments?.[0] ?? {};
  const p = o.passengers?.[0] ?? {};
  return {
    kind: "flight" as const,
    id: o.id,
    reference: o.booking_ref ?? "",
    title: seg.marketing_carrier?.name ?? "Flight",
    subtitle: `${seg.marketing_carrier_flight_number ?? ""} • ${p.cabin_class_marketing ?? "Economy"}`,
    status: o.state ?? "confirmed",
    depTime: seg.departing_at ?? "",
    arrTime: seg.arriving_at ?? "",
    dep: seg.origin?.iata_code ?? "",
    arr: seg.destination?.iata_code ?? "",
    amount: Number(o.total_amount ?? 0),
  };
}

function normalizeStay(b: any) {
  const acc = b.accommodation ?? {};
  return {
    kind: "stay" as const,
    id: b.id,
    reference: b.reference ?? b.id,
    title: acc.name ?? "Stay",
    subtitle: `${b.check_in_date ?? ""} → ${b.check_out_date ?? ""}`,
    status: b.status ?? "confirmed",
    depTime: b.check_in_date ?? "",
    arrTime: b.check_out_date ?? "",
    dep: "Check-in",
    arr: "Check-out",
    amount: Number(b.total_amount ?? 0),
  };
}

export async function GET() {
  try {
    const [orders, stayBookings] = await Promise.all([
      listOrders(),
      listStayBookings(),
    ]);
    const bookings = [
      ...(orders ?? []).map(normalizeOrder),
      ...(stayBookings ?? []).map(normalizeStay),
    ];
    return Response.json({ bookings, live: true });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Failed to load bookings"), bookings: [], live: false },
      { status: 502 },
    );
  }
}