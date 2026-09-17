/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import { Duffel } from "@duffel/api";
import { formatDuration, format24 } from "@/lib/format";
import { applyMarkup, realPrice, testPrice } from "@/lib/pricing";
import type { CityOption } from "@/lib/cities";

const TOKEN = process.env.DUFFEL_ACCESS_TOKEN;

let client: Duffel | null = null;

export function duffelEnabled() {
  return Boolean(TOKEN);
}

function getDuffel(): Duffel {
  if (!TOKEN) throw new Error("DUFFEL_ACCESS_TOKEN is not configured");
  if (!client) client = new Duffel({ token: TOKEN });
  return client;
}

const fmt24 = (iso: string | null) => format24(iso);

/** Parses an ISO-8601 duration (e.g. PT02H26M) into minutes. */
function parseIsoDuration(iso?: string | null): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(iso ?? "");
  if (!m) return 0;
  return (Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0)) || 0;
}

// ---- Flights ------------------------------------------------------------

export type FlightSlice = {
  origin: string;
  destination: string;
  departureDate: string;
};

export type FlightSearchParams = {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  passengers?: number;
  cabinClass?: "economy" | "premium_economy" | "business" | "first";
  slices?: FlightSlice[];
};

export type NormalizedFlight = {
  id: string;
  airline: string;
  airlineCode: string;
  airlineLogo?: string;
  flightNumber: string;
  price: number;
  currency: string;
  baseAmount: number;
  taxAmount: number;
  depTime: string;
  arrTime: string;
  origin: string;
  destination: string;
  originAirport?: string;
  destinationAirport?: string;
  originCity?: string;
  destinationCity?: string;
  depDate: string;
  arrDate: string;
  duration: string;
  durationMinutes: number;
  stops: string;
  stopsCount: number;
  direct: boolean;
  emissionsKg?: string;
  expiresAt?: string;
  passengerIds: string[];
  requiresInstantPayment?: boolean;
  paymentRequiredBy?: string;
  services: Array<{
    id: string;
    name: string;
    type: string;
    totalAmount: number;
    currency: string;
    maximumQuantity?: number;
  }>;
};

export async function searchFlights(
  params: FlightSearchParams,
): Promise<NormalizedFlight[]> {
  if (!duffelEnabled()) return [];
  const duffel = getDuffel();
  const toSlice = (s: FlightSlice) => ({
    origin: s.origin,
    destination: s.destination,
    departure_date: s.departureDate,
    departure_time: null,
    arrival_time: null,
  });
  const slices: any[] = params.slices?.length
    ? params.slices.map(toSlice)
    : [
        {
          origin: params.origin,
          destination: params.destination,
          departure_date: params.departureDate,
          departure_time: null,
          arrival_time: null,
        },
      ];
  if (!params.slices?.length && params.returnDate) {
    slices.push({
      origin: params.destination,
      destination: params.origin,
      departure_date: params.returnDate,
      departure_time: null,
      arrival_time: null,
    });
  }
  const passengers = Array.from({ length: params.passengers ?? 1 }, () => ({
    type: "adult" as const,
  }));

  const { data } = (await duffel.offerRequests.create({
    slices,
    passengers,
    cabin_class: params.cabinClass ?? "economy",
    return_offers: true,
  } as any)) as { data: any };

  const fallbackOrigin = params.slices?.[0]?.origin ?? params.origin ?? "";
  const fallbackDestination =
    params.slices?.[0]?.destination ?? params.destination ?? "";

  return (data.offers ?? []).slice(0, 50).map((offer: any) => {
    const slice = offer.slices?.[0] ?? {};
    const seg = slice.segments?.[0] ?? {};
    const tax = testPrice(Number(offer.tax_amount ?? offer.taxes?.[0]?.amount ?? 0));
    const total = testPrice(Number(offer.total_amount ?? 0));
    const stopsCount = (slice.segments?.length ?? 1) - 1;
    const owner = offer.owner ?? seg.marketing_carrier ?? {};
    const pr = offer.payment_requirements ?? {};
    return {
      id: offer.id,
      airline: seg.marketing_carrier?.name ?? seg.operating_carrier?.name ?? "",
      airlineCode: seg.marketing_carrier?.iata_code ?? "",
      airlineLogo:
        owner.logo_symbol_url ??
        owner.logo_lockup_url ??
        seg.marketing_carrier?.logo_symbol_url ??
        undefined,
      flightNumber: seg.marketing_carrier_flight_number ?? "",
      price: applyMarkup(total),
      currency: offer.total_currency ?? "USD",
      baseAmount: Math.max(0, applyMarkup(total) - applyMarkup(tax)),
      taxAmount: applyMarkup(tax),
      depTime: fmt24(seg.departing_at),
      arrTime: fmt24(seg.arriving_at),
      origin: seg.origin?.iata_code ?? fallbackOrigin,
      destination: seg.destination?.iata_code ?? fallbackDestination,
      originAirport: seg.origin?.name ?? undefined,
      destinationAirport: seg.destination?.name ?? undefined,
      originCity: seg.origin?.city_name ?? slice.origin?.city_name ?? undefined,
      destinationCity:
        seg.destination?.city_name ?? slice.destination?.city_name ?? undefined,
      depDate: (seg.departing_at ?? "").slice(0, 10),
      arrDate: (seg.arriving_at ?? "").slice(0, 10),
      duration: formatDuration(slice.duration),
      durationMinutes: parseIsoDuration(slice.duration),
      stops: stopsCount === 0 ? "Direct" : `${stopsCount} Stop${stopsCount > 1 ? "s" : ""}`,
      stopsCount,
      direct: stopsCount === 0,
      emissionsKg: offer.total_emissions_kg ?? undefined,
      expiresAt: offer.expires_at ?? undefined,
      aircraft: seg.aircraft?.name ?? seg.aircraft?.code ?? "",
      cabin: offer.passengers?.[0]?.cabin_class_marketing ?? "Economy",
      seatsRemaining: Number(offer.seats_remaining ?? 0),
      amenities: Array.isArray(offer.amenities) ? offer.amenities : [],
      totalBaggages: Number(offer.total_baggages ?? 0),
      partialRefundable: Boolean(offer.partial_refundable),
      partialChangeable: Boolean(offer.partial_changeable),
      passengerIds: (offer.passengers ?? [])
        .map((p: any) => p.id)
        .filter(Boolean),
      services: (offer.available_services ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        totalAmount: applyMarkup(testPrice(Number(s.total_amount ?? 0))),
        currency: s.total_currency ?? "USD",
        maximumQuantity: Number(s.maximum_quantity ?? 1),
      })),
      requiresInstantPayment: pr.requires_instant_payment !== false,
      paymentRequiredBy: pr.payment_required_by ?? undefined,
      conditions: offer.conditions ?? undefined,
    };
  });
}

export async function getFlightOffer(offerId: string) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  const { data } = await duffel.offers.get(offerId, {
    return_available_services: true,
  });
  return data as any;
}

// ---- Orders -------------------------------------------------------------

export type CreateOrderPassenger = {
  given_name: string;
  family_name: string;
  born_on: string;
  email: string;
  phone_number: string;
  gender: string;
  title?: string;
};

export async function ensureCustomerUser(input: {
  email: string;
  given_name: string;
  family_name: string;
  phone_number?: string;
}): Promise<string | null> {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  try {
    const { data: existing } = (await duffel.identity.customerUsers.list({
      email: input.email,
    } as any)) as { data: any[] };
    if (existing?.length) return existing[0].id;
  } catch {
    // fall through to create
  }
  try {
    const { data } = (await duffel.identity.customerUsers.create({
      email: input.email,
      given_name: input.given_name,
      family_name: input.family_name,
      phone_number: input.phone_number,
    } as any)) as { data: any };
    return data.id ?? null;
  } catch {
    return null;
  }
}

export async function createFlightOrder({
  offerId,
  passengers,
  amount,
  currency = "USD",
  txHash,
  chain,
  userIds,
  services,
  passengerIds,
  type = "instant",
}: {
  offerId: string;
  passengers: CreateOrderPassenger[];
  amount: number;
  currency?: string;
  txHash?: string;
  chain?: string;
  userIds?: (string | undefined)[];
  services?: Array<{ id: string; quantity: number }>;
  passengerIds?: string[];
  type?: "instant" | "hold";
}) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  const cardId = process.env.DUFFEL_CARD_ID;
  // The balance must exactly match the order total, and the order's passengers
  // must reference the offer's passenger records (pas_…). Both come from the
  // offer, so read it server-side once — falling back to the client values
  // (which may be stale if the flow predates these fields).
  let paymentTotal = realPrice(amount);
  let offerPassengerIds = passengerIds ?? [];
  try {
    const offer = await getFlightOffer(offerId);
    if (offer) {
      const base = Number(offer.total_amount ?? 0);
      const svc = (offer.available_services ?? [])
        .filter((s: any) => services?.some((x) => x.id === s.id))
        .reduce(
          (sum: number, s: any) =>
            sum +
            Number(s.total_amount ?? 0) *
              (services?.find((x) => x.id === s.id)?.quantity ?? 1),
          0,
        );
      if (base > 0) paymentTotal = base + svc;
      const ids = (offer.passengers ?? [])
        .map((p: any) => p.id)
        .filter(Boolean);
      if (ids.length) offerPassengerIds = ids;
    }
  } catch {
    // fall back to the client-provided values
  }
  const payments: any[] = cardId
    ? [{ type: "card", card_id: cardId }]
    : [
        {
          type: "balance",
          currency,
          // Balance payment amount is in major units (e.g. "329.61"), not cents.
          amount: (Math.round(paymentTotal * 100) / 100).toFixed(2),
        },
      ];
  const { data } = await duffel.orders.create({
    type,
    selected_offers: [offerId],
    // Customer users are attached per-passenger (user_id) — listing them in
    // the top-level `users` array too makes Duffel reject the order
    // ("user already associated with passenger").
    // Book the chosen add-ons (baggage, seat) alongside the offer. Only sent
    // when something is actually selected — Duffel rejects an empty array.
    ...(services?.length
      ? { services: services.map((s) => ({ id: s.id, quantity: s.quantity })) }
      : {}),
    passengers: passengers.map((p, i) => ({
      // Duffel requires the passenger id to reference the offer request's
      // passenger record (pas_…), not an arbitrary UUID.
      id: offerPassengerIds[i] ?? crypto.randomUUID(),
      // Flights are searched as adult passengers — keep the type explicit so
      // Duffel's DOB/type validation stays consistent.
      type: "adult",
      // Each passenger gets its OWN customer user id — Duffel rejects
      // duplicate user ids across passengers.
      ...(userIds?.[i] ? { user_id: userIds[i] } : {}),
      given_name: p.given_name,
      family_name: p.family_name,
      born_on: p.born_on,
      // Duffel only accepts f/m for passenger gender.
      gender: p.gender === "male" ? "m" : "f",
      title: p.title ?? "mr",
      email: p.email,
      phone_number: p.phone_number,
    })),
    // Hold orders are created without payment and settled later.
    ...(type === "hold" ? {} : { payments }),
    ...(txHash
      ? { metadata: { onchain_payment_tx: txHash, chain: chain ?? "" } }
      : {}),
  } as any);
  return data as any;
}

export async function listOrders() {
  if (!duffelEnabled()) return [];
  const duffel = getDuffel();
  const { data } = await duffel.orders.list({ limit: 50 });
  return data as any[];
}

export async function getOrder(orderId: string) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  const { data } = await duffel.orders.get(orderId);
  return data as any;
}

/** Services that can be added to an existing order (baggage, seats, …). */
export async function getOrderAvailableServices(orderId: string) {
  if (!duffelEnabled()) return [];
  const duffel = getDuffel();
  const { data } = await duffel.orders.getAvailableServices(orderId);
  return (data ?? []) as any[];
}

/** Adds services (by id) to an existing order. */
export async function addOrderServices(orderId: string, serviceIds: string[]) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  const { data } = await duffel.orders.addServices(orderId, {
    services: serviceIds.map((id) => ({ id, quantity: 1 })),
  } as any);
  return data as any;
}

/** Updates an order's metadata (Duffel PATCH /air/orders/{id}). */
export async function updateOrderMetadata(
  orderId: string,
  metadata: Record<string, unknown>,
) {
  if (!duffelEnabled()) return null;
  const res = await fetch(`https://api.duffel.com/air/orders/${orderId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "Duffel-Version": "v2",
      Accept: "application/json",
    },
    body: JSON.stringify({ data: { metadata } }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Duffel order update failed (${res.status}): ${body.slice(0, 300)}`,
    );
  }
  const json = await res.json();
  return json.data as any;
}

/** Creates a PENDING order cancellation — returns the refund quote. */
export async function createOrderCancellation(orderId: string) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  const { data } = await duffel.orderCancellations.create({
    order_id: orderId,
  } as any);
  return data as any;
}

/** Confirms a pending order cancellation — the order is cancelled + refunded. */
export async function confirmOrderCancellation(cancellationId: string) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  const { data } = await duffel.orderCancellations.confirm(cancellationId);
  return data as any;
}

export async function searchAccommodationSuggestions(query: string) {
  if (!duffelEnabled() || query.trim().length < 2) return [];
  const duffel = getDuffel();
  const { data } = (await duffel.stays.accommodation.suggestions(
    query,
    undefined as any,
  )) as { data: any[] };
  return (data ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    city: s.location?.city ?? s.address?.city_name ?? "",
    country: s.location?.country ?? s.address?.country_code ?? "",
    latitude: Number(s.location?.latitude ?? s.coordinates?.latitude ?? 0),
    longitude: Number(s.location?.longitude ?? s.coordinates?.longitude ?? 0),
  }));
}


// ---- Seat maps ------------------------------------------------------------

export async function getSeatMap(offerId: string) {
  if (!duffelEnabled()) return [];
  const duffel = getDuffel();
  const { data } = await duffel.seatMaps.get({ offer_id: offerId });
  return (data ?? []) as any[];
}


// ---- Webhooks admin -------------------------------------------------------

export async function listWebhooks() {
  if (!duffelEnabled()) return [];
  const duffel = getDuffel();
  const { data } = await duffel.webhooks.list({ limit: 50 } as any);
  return (data ?? []) as any[];
}

export async function listWebhookDeliveries(webhookId: string) {
  if (!duffelEnabled()) return [];
  const duffel = getDuffel();
  const { data } = (await duffel.webhooks.listDeliveries({
    webhook_id: webhookId,
    limit: 30,
  } as any)) as { data: any[] };
  return data ?? [];
}

export async function redeliverWebhookEvent(eventId: string) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  const res = await duffel.webhooks.redeliver(eventId);
  return res as any;
}

// ---- Order changes --------------------------------------------------------

export async function createOrderChangeRequest(
  orderId: string,
  slices: Array<{
    origin: string;
    destination: string;
    departure_date: string;
  }>,
) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  // Duffel's create order change request takes a `slices` OBJECT with `add`
// (list of new itinerary slices) and/or `remove` (list of existing slice ids).
  const slice = slices?.[0] ?? {
    origin: "",
    destination: "",
    departure_date: "",
  };
  const { data } = await duffel.orderChangeRequests.create({
    order_id: orderId,
    slices: {
      add: [
        {
          origin: slice.origin,
          destination: slice.destination,
          departure_date: slice.departure_date,
          departure_time: null,
          arrival_time: null,
        },
      ],
    },
  } as any);
  return data as any;
}

export async function listOrderChangeOffers() {
  if (!duffelEnabled()) return [];
  const duffel = getDuffel();
  const { data } = await duffel.orderChangeOffers.list({ limit: 50 } as any);
  return (data ?? []) as any[];
}

export async function createOrderChange({
  orderChangeOfferId,
}: {
  orderChangeOfferId: string;
}) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  // Duffel's create order change only needs the selected order change offer.
  const { data } = await duffel.orderChanges.create({
    selected_order_change_offer: orderChangeOfferId,
  } as any);
  return data as any;
}

export async function confirmOrderChange(changeId: string) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  const { data } = await duffel.orderChanges.confirm(changeId, {} as any);
  return data as any;
}

/** Pays a held (awaiting_payment) order via Duffel balance. */
export async function payHeldOrder(
  orderId: string,
  amountReal: number,
  currency = "USD",
) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  const { data } = await duffel.payments.create({
    order_id: orderId,
    payment: {
      type: "balance",
      currency,
      amount: (Math.round(amountReal * 100) / 100).toFixed(2),
    },
  } as any);
  return data as any;
}

/**
 * Creates an ephemeral Duffel Assistant client key for a customer user,
 * optionally scoped to a resource (order/booking) for resource context.
 */
export async function createComponentClientKey(
  userId: string,
  resource?: { orderId?: string; bookingId?: string },
): Promise<string | null> {
  if (!duffelEnabled() || !userId) return null;
  const body: Record<string, string> = { user_id: userId };
  if (resource?.orderId) body.order_id = resource.orderId;
  if (resource?.bookingId) body.booking_id = resource.bookingId;
  const res = await fetch("https://api.duffel.com/identity/component_client_keys", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "Duffel-Version": "v1",
      Accept: "application/json",
    },
    body: JSON.stringify({ data: body }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data?.component_client_key ?? null;
}

// ---- Places / suggestions ------------------------------------------------

export async function searchCities(query: string, limit = 100): Promise<CityOption[]> {
  if (!duffelEnabled()) return [];
  const q = query.trim().toLowerCase();
  const results: CityOption[] = [];
  let after: string | undefined;
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({ limit: "200" });
    if (after) params.set("after", after);
    const res = await fetch(`https://api.duffel.com/air/cities?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Duffel-Version": "v2",
        Accept: "application/json",
      },
    });
    if (!res.ok) break;
    const json = (await res.json()) as {
      data: Array<{
        id: string;
        name: string;
        iata_country_code?: string;
        iata_code?: string;
        airports?: Array<{
          iata_code?: string;
          name?: string;
          latitude?: number;
          longitude?: number;
        }>;
      }>;
      meta?: { after?: string };
    };
    for (const c of json.data ?? []) {
      const name = c.name ?? "";
      const iata = c.iata_code ?? "";
      const airports = (c.airports ?? []).filter((a) => a.iata_code);
      const airport = airports[0];
      if (q && !name.toLowerCase().includes(q) && !iata.toLowerCase().includes(q)) {
        continue;
      }
      results.push({
        id: c.id,
        name,
        country: c.iata_country_code ?? "",
        code: iata || airport?.iata_code || "",
        latitude: airport ? Number(airport.latitude) : undefined,
        longitude: airport ? Number(airport.longitude) : undefined,
      });
      if (results.length >= limit) return results;
    }
    after = json.meta?.after;
    if (!after) break;
  }
  return results;
}

export async function getDestinations(queries: string[]) {
  if (!duffelEnabled()) return [];
  const duffel = getDuffel();
  const results: Array<{ city: string; iata: string; name: string; country: string }> =
    [];
  for (const q of queries) {
    try {
      const { data } = (await duffel.suggestions.list({
        query: q,
        type: "airport",
      } as any)) as { data: any[] };
      const first = (data ?? []).find((p: any) => p.iata_code) ?? (data ?? [])[0];
      if (first) {
        results.push({
          city: q,
          iata: first.iata_code ?? "",
          name: first.name ?? q,
          country: first.country_name ?? "",
        });
      }
    } catch {
      // skip destinations the supplier cannot resolve
    }
  }
  return results;
}


// ---- Fiat -> USDT proxy -------------------------------------------------

export function duffelErrorMessage(
  err: unknown,
  fallback = "Request failed",
): string {
  const e = err as {
    status?: number;
    message?: string;
    errors?: Array<{ title?: string; detail?: string }>;
  };
  if (e?.errors?.length) {
    const first = e.errors[0];
    if (first.title) return first.title;
    if (first.detail) return first.detail;
  }
  if (e?.status === 403) {
    return "This Duffel token does not have access to this product (HTTP 403).";
  }
  if (e?.status) return `Duffel API error (HTTP ${e.status}).`;
  if (e?.message) return e.message;
  return fallback;
}

