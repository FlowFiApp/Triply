/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatAMPM, formatDuration } from "@/lib/format";
import { testPrice } from "@/lib/pricing";
import type {
  Booking,
  OrderDetail,
  OrderRecord,
  OrderStatus,
} from "@/lib/types";

/** Derives the display status of a Duffel order. */
export function orderStatus(o: any): OrderStatus {
  if (o.cancelled_at || o.cancellation) return "cancelled";
  if (o.payment_status?.awaiting_payment === true) return "awaiting_payment";
  return "confirmed";
}

function marketingCarrier(seg: any) {
  return seg?.marketing_carrier ?? {};
}

/** Normalizes a raw Duffel order into the compact OrderRecord (list/ticket). */
export function normalizeOrderRecord(o: any): OrderRecord {
  const seg = o?.slices?.[0]?.segments?.[0] ?? {};
  const p = o?.passengers?.[0] ?? {};
  const dep = seg.origin ?? {};
  const arr = seg.destination ?? {};
  const slice = o?.slices?.[0] ?? {};
  const carrier = marketingCarrier(seg);
  return {
    id: o?.id ?? "",
    bookingRef: o?.booking_reference ?? o?.booking_ref ?? "",
    airline: carrier?.name ?? "",
    airlineCode: carrier?.iata_code ?? "",
    airlineLogo: carrier?.logo_symbol_url ?? carrier?.logo_lockup_url ?? undefined,
    flightNumber: seg.marketing_carrier_flight_number ?? "",
    cabin: p.cabin_class_marketing ?? "Economy",
    status: orderStatus(o),
    passengerName: `${p.given_name ?? ""} ${p.family_name ?? ""}`.trim(),
    depTime: formatAMPM(seg.departing_at),
    arrTime: formatAMPM(seg.arriving_at),
    depCode: dep.iata_code ?? "",
    depCity: dep.city_name ?? "",
    depAirport: dep.name ?? undefined,
    arrCode: arr.iata_code ?? "",
    arrCity: arr.city_name ?? "",
    arrAirport: arr.name ?? undefined,
    duration: formatDuration(slice.duration),
    seat: p.seat ?? "—",
    gate: seg.gate ?? "—",
    terminal: seg.departing_terminal ?? "—",
    departureDate: (seg.departing_at ?? "").slice(0, 10),
    amountUsd: testPrice(Number(o?.total_amount ?? 0)),
  };
}

/** Normalizes a raw Duffel order into a flight Booking list item. */
export function normalizeFlightBooking(o: any): Booking {
  const seg = o?.slices?.[0]?.segments?.[0] ?? {};
  const p = o?.passengers?.[0] ?? {};
  const carrier = marketingCarrier(seg);
  return {
    kind: "flight",
    id: o?.id ?? "",
    reference: o?.booking_reference ?? o?.booking_ref ?? "",
    email: p.email ?? "",
    title: carrier?.name ?? "Flight",
    subtitle: `${seg.marketing_carrier_flight_number ?? ""} • ${p.cabin_class_marketing ?? "Economy"}`,
    airlineLogo: carrier?.logo_symbol_url ?? carrier?.logo_lockup_url ?? undefined,
    status: orderStatus(o),
    actions: Array.isArray(o?.available_actions) ? o.available_actions : [],
    depTime: formatAMPM(seg.departing_at),
    arrTime: formatAMPM(seg.arriving_at),
    dep: seg.origin?.iata_code ?? "",
    arr: seg.destination?.iata_code ?? "",
    amount: testPrice(Number(o?.total_amount ?? 0)),
    date: (seg.departing_at ?? "").slice(0, 10) || undefined,
  };
}

/** Normalizes a persisted stay booking into a Booking list item. */
export function normalizeStayBooking(b: any): Booking {
  return {
    kind: "stay",
    id: b?.id ?? "",
    reference: b?.reference ?? b?.id ?? "",
    email: b?.email ?? "",
    title: b?.accommodationName ?? "Stay",
    subtitle: `${b?.checkIn ?? ""} → ${b?.checkOut ?? ""}`,
    status: b?.status === "cancelled" ? "cancelled" : "confirmed",
    actions: ["cancel"],
    depTime: b?.checkIn ?? "",
    arrTime: b?.checkOut ?? "",
    dep: "Check-in",
    arr: "Check-out",
    amount: testPrice(Number(b?.totalAmount ?? 0)),
    date: b?.checkIn ?? undefined,
  };
}

/** Normalizes a persisted car booking into a Booking list item. */
export function normalizeCarBooking(b: any): Booking {
  return {
    kind: "car",
    id: b?.id ?? "",
    reference: b?.reference ?? b?.id ?? "",
    email: b?.email ?? "",
    title: b?.carName ?? "Car",
    subtitle: `${b?.pickupLocation ?? ""} • ${b?.pickupDate ?? ""}`,
    status: b?.status === "cancelled" ? "cancelled" : "confirmed",
    actions: ["cancel"],
    depTime: b?.pickupDate ?? "",
    arrTime: b?.dropoffDate ?? "",
    dep: "Pickup",
    arr: "Return",
    amount: testPrice(Number(b?.totalAmount ?? 0)),
    date: b?.pickupDate ?? undefined,
  };
}

function cond(c: any) {
  if (!c) return undefined;
  return {
    allowed: Boolean(c.allowed),
    type: typeof c.type === "string" ? c.type : undefined,
    penaltyAmount: c.penalty_amount ? Number(c.penalty_amount) : undefined,
    penaltyCurrency: c.penalty_currency ?? undefined,
  };
}

/** Normalizes a raw Duffel order into the rich OrderDetail (booking page). */
export function normalizeOrderDetail(o: any): OrderDetail {
  const seg0 = o?.slices?.[0]?.segments?.[0] ?? {};
  const owner = o?.owner ?? seg0.marketing_carrier ?? {};
  const slices = (o?.slices ?? []).map((sl: any) => {
    const first = sl?.segments?.[0] ?? {};
    const last = sl?.segments?.[sl.segments.length - 1] ?? first;
    const carrier = marketingCarrier(first);
    return {
      id: sl?.id ?? "",
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
      duration: formatDuration(sl?.duration),
      stops: Math.max(0, (sl?.segments?.length ?? 1) - 1),
      carrier: carrier?.name ?? "",
      carrierCode: carrier?.iata_code ?? "",
      flightNumber: first.marketing_carrier_flight_number ?? "",
      aircraft: first.aircraft?.name ?? "",
    };
  });
  const passengers = (o?.passengers ?? []).map((p: any) => ({
    id: p?.id ?? "",
    givenName: p?.given_name ?? "",
    familyName: p?.family_name ?? "",
    title: p?.title ?? "",
    gender: p?.gender ?? "",
    bornOn: p?.born_on ?? "",
    email: p?.email ?? "",
    phone: p?.phone_number ?? "",
    seat: p?.seat ?? undefined,
    cabin: p?.cabin_class_marketing ?? "Economy",
  }));
  const services = (o?.services ?? []).map((s: any) => ({
    id: s?.id ?? "",
    name: s?.name ?? "",
    type: s?.type ?? "",
    totalAmount: testPrice(Number(s?.total_amount ?? 0)),
    currency: s?.total_currency ?? "USD",
    quantity: Number(s?.quantity ?? 1),
    segmentIds: s?.segment_ids ?? [],
    passengerIds: s?.passenger_ids ?? [],
  }));
  return {
    id: o?.id ?? "",
    bookingRef: o?.booking_reference ?? o?.booking_ref ?? "",
    status: orderStatus(o),
    airline: owner?.name ?? "",
    airlineCode: owner?.iata_code ?? "",
    airlineLogo: owner?.logo_symbol_url ?? owner?.logo_lockup_url ?? undefined,
    totalAmount: testPrice(Number(o?.total_amount ?? 0)),
    currency: o?.total_currency ?? "USD",
    createdAt: o?.created_at ?? "",
    slices,
    passengers,
    services,
    conditions: {
      refund: cond(o?.conditions?.refund_before_departure),
      change: cond(o?.conditions?.change_before_departure),
      advanceSeatSelection: o?.conditions?.advance_seat_selection === "true",
      priorityBoarding: o?.conditions?.priority_boarding === "true",
      priorityCheckIn: o?.conditions?.priority_check_in === "true",
    },
    metadata: o?.metadata ?? {},
    availableActions: o?.available_actions ?? [],
    documents: (o?.documents ?? []).map((d: any) => ({
      type: d?.type ?? "",
      uniqueIdentifier: d?.unique_identifier ?? "",
    })),
  };
}