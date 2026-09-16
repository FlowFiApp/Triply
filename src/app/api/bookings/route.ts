/* eslint-disable @typescript-eslint/no-explicit-any */
import { duffelErrorMessage, listOrders, listStayBookings } from "@/lib/duffel";
import { testPrice } from "@/lib/pricing";

function normalizeOrder(o: any) {
  const seg = o.slices?.[0]?.segments?.[0] ?? {};
  const p = o.passengers?.[0] ?? {};
  return {
    kind: "flight" as const,
    id: o.id,
    reference: o.booking_reference ?? o.booking_ref ?? "",
    email: p.email ?? "",
    title: seg.marketing_carrier?.name ?? "Flight",
    subtitle: `${seg.marketing_carrier_flight_number ?? ""} • ${p.cabin_class_marketing ?? "Economy"}`,
    airlineLogo:
      seg.marketing_carrier?.logo_symbol_url ??
      seg.marketing_carrier?.logo_lockup_url ??
      undefined,
    status: o.cancelled_at || o.cancellation
      ? "cancelled"
      : o.payment_status?.awaiting_payment === true
        ? "awaiting_payment"
        : "confirmed",
    actions: Array.isArray(o.available_actions) ? o.available_actions : [],
    depTime: seg.departing_at ?? "",
    arrTime: seg.arriving_at ?? "",
    dep: seg.origin?.iata_code ?? "",
    arr: seg.destination?.iata_code ?? "",
    amount: testPrice(Number(o.total_amount ?? 0)),
  };
}

function normalizeStay(b: any) {
  const acc = b.accommodation ?? {};
  return {
    kind: "stay" as const,
    id: b.id,
    reference: b.reference ?? b.id,
    email: b.guest?.email ?? b.email ?? "",
    title: acc.name ?? "Stay",
    subtitle: `${b.check_in_date ?? ""} → ${b.check_out_date ?? ""}`,
    status: b.status ?? "confirmed",
    depTime: b.check_in_date ?? "",
    arrTime: b.check_out_date ?? "",
    dep: "Check-in",
    arr: "Check-out",
    amount: testPrice(Number(b.total_amount ?? 0)),
  };
}

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email")?.toLowerCase() ?? "";
  try {
    const [ordersRes, stayRes] = await Promise.allSettled([
      listOrders(),
      listStayBookings(),
    ]);
    const orders = ordersRes.status === "fulfilled" ? ordersRes.value : [];
    const stays = stayRes.status === "fulfilled" ? stayRes.value : [];
    const all = [
      ...(orders ?? []).map(normalizeOrder),
      ...(stays ?? []).map(normalizeStay),
    ];
    // Scope to the signed-in customer's own bookings when an email is provided.
    const bookings = email
      ? all.filter((b) => b.email?.toLowerCase() === email)
      : all;
    return Response.json({ bookings, live: true });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Failed to load bookings"), bookings: [], live: false },
      { status: 502 },
    );
  }
}