/* eslint-disable @typescript-eslint/no-explicit-any */
import { getOrder, updateOrderMetadata, duffelErrorMessage } from "@/lib/duffel";
import { formatAMPM, formatDuration } from "@/lib/format";
import { testPrice } from "@/lib/pricing";
import type { OrderDetail } from "@/lib/types";

function orderStatus(o: any): string {
  if (o.cancelled_at || o.cancellation) return "cancelled";
  if (o.payment_status?.awaiting_payment === true) return "awaiting_payment";
  return "confirmed";
}

function normalizeOrderDetail(o: any): OrderDetail {
  const seg0 = o.slices?.[0]?.segments?.[0] ?? {};
  const owner = o.owner ?? seg0.marketing_carrier ?? {};
  const slices = (o.slices ?? []).map((sl: any) => {
    const first = sl.segments?.[0] ?? {};
    const last = sl.segments?.[sl.segments.length - 1] ?? first;
    return {
      id: sl.id ?? "",
      origin: {
        code: first.origin?.iata_code ?? "",
        name: first.origin?.name ?? "",
        city: first.origin?.city_name ?? "",
        terminal: first.origin_terminal ?? "",
      },
      destination: {
        code: last.destination?.iata_code ?? "",
        name: last.destination?.name ?? "",
        city: last.destination?.city_name ?? "",
        terminal: last.destination_terminal ?? "",
      },
      depTime: formatAMPM(first.departing_at),
      arrTime: formatAMPM(last.arriving_at),
      depDate: (first.departing_at ?? "").slice(0, 10),
      arrDate: (last.arriving_at ?? "").slice(0, 10),
      duration: formatDuration(sl.duration),
      stops: Math.max(0, (sl.segments?.length ?? 1) - 1),
      carrier: first.marketing_carrier?.name ?? "",
      carrierCode: first.marketing_carrier?.iata_code ?? "",
      flightNumber: first.marketing_carrier_flight_number ?? "",
      aircraft: first.aircraft?.name ?? "",
    };
  });
  const passengers = (o.passengers ?? []).map((p: any) => ({
    id: p.id ?? "",
    givenName: p.given_name ?? "",
    familyName: p.family_name ?? "",
    title: p.title ?? "",
    gender: p.gender ?? "",
    bornOn: p.born_on ?? "",
    email: p.email ?? "",
    phone: p.phone_number ?? "",
    seat: p.seat ?? undefined,
    cabin: p.cabin_class_marketing ?? "Economy",
  }));
  const services = (o.services ?? []).map((s: any) => ({
    id: s.id ?? "",
    name: s.name ?? "",
    type: s.type ?? "",
    totalAmount: testPrice(Number(s.total_amount ?? 0)),
    currency: s.total_currency ?? "USD",
    quantity: Number(s.quantity ?? 1),
    segmentIds: s.segment_ids ?? [],
    passengerIds: s.passenger_ids ?? [],
  }));
  const cond = (c: any) =>
    c
      ? {
          allowed: Boolean(c.allowed),
          penaltyAmount: c.penalty_amount ? Number(c.penalty_amount) : undefined,
          penaltyCurrency: c.penalty_currency ?? undefined,
        }
      : undefined;
  return {
    id: o.id ?? "",
    bookingRef: o.booking_reference ?? o.booking_ref ?? "",
    status: orderStatus(o),
    airline: owner.name ?? "",
    airlineCode: owner.iata_code ?? "",
    airlineLogo: owner.logo_symbol_url ?? owner.logo_lockup_url ?? undefined,
    totalAmount: testPrice(Number(o.total_amount ?? 0)),
    currency: o.total_currency ?? "USD",
    createdAt: o.created_at ?? "",
    slices,
    passengers,
    services,
    conditions: {
      refund: cond(o.conditions?.refund_before_departure),
      change: cond(o.conditions?.change_before_departure),
    },
    metadata: o.metadata ?? {},
    availableActions: o.available_actions ?? [],
    documents: (o.documents ?? []).map((d: any) => ({
      type: d.type ?? "",
      uniqueIdentifier: d.unique_identifier ?? "",
    })),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const order = await getOrder(id);
    if (!order) {
      return Response.json(
        { error: "Duffel not configured or order not found" },
        { status: 404 },
      );
    }
    return Response.json({ order: normalizeOrderDetail(order), live: true });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Failed to load order") },
      { status: 502 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const metadata = body.metadata;
    if (!metadata || typeof metadata !== "object") {
      return Response.json({ error: "Missing metadata." }, { status: 400 });
    }
    const updated = await updateOrderMetadata(id, metadata);
    if (!updated) {
      return Response.json(
        { error: "Duffel is not configured." },
        { status: 502 },
      );
    }
    return Response.json({ order: normalizeOrderDetail(updated), live: true });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Failed to update order") },
      { status: 502 },
    );
  }
}