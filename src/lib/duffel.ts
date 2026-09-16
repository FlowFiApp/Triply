/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import { Duffel } from "@duffel/api";
import { formatDuration, format24 } from "@/lib/format";
import { realPrice, testPrice } from "@/lib/pricing";
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
  flightNumber: string;
  price: number;
  currency: string;
  baseAmount: number;
  taxAmount: number;
  depTime: string;
  arrTime: string;
  origin: string;
  destination: string;
  depDate: string;
  arrDate: string;
  duration: string;
  stops: string;
  direct: boolean;
  services: Array<{
    id: string;
    name: string;
    type: string;
    totalAmount: number;
    currency: string;
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
    return {
      id: offer.id,
      airline: seg.operating_carrier?.name ?? seg.marketing_carrier?.name ?? "",
      airlineCode: seg.marketing_carrier?.iata_code ?? "",
      flightNumber: seg.marketing_carrier_flight_number ?? "",
      price: total,
      currency: offer.total_currency ?? "USD",
      baseAmount: Math.max(0, total - tax),
      taxAmount: tax,
      depTime: fmt24(seg.departing_at),
      arrTime: fmt24(seg.arriving_at),
      origin: seg.origin?.iata_code ?? fallbackOrigin,
      destination: seg.destination?.iata_code ?? fallbackDestination,
      depDate: (seg.departing_at ?? "").slice(0, 10),
      arrDate: (seg.arriving_at ?? "").slice(0, 10),
      duration: formatDuration(slice.duration),
      stops: stopsCount === 0 ? "Direct" : `${stopsCount} Stop${stopsCount > 1 ? "s" : ""}`,
      direct: stopsCount === 0,
      aircraft: seg.aircraft?.name ?? seg.aircraft?.code ?? "",
      cabin: offer.passengers?.[0]?.cabin_class_marketing ?? "Economy",
      seatsRemaining: Number(offer.seats_remaining ?? 0),
      amenities: Array.isArray(offer.amenities) ? offer.amenities : [],
      totalBaggages: Number(offer.total_baggages ?? 0),
      partialRefundable: Boolean(offer.partial_refundable),
      partialChangeable: Boolean(offer.partial_changeable),
      services: (offer.available_services ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        totalAmount: testPrice(Number(s.total_amount ?? 0)),
        currency: s.total_currency ?? "USD",
      })),
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
  customerUserId,
  services,
}: {
  offerId: string;
  passengers: CreateOrderPassenger[];
  amount: number;
  currency?: string;
  txHash?: string;
  chain?: string;
  customerUserId?: string;
  services?: string[];
}) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  const cardId = process.env.DUFFEL_CARD_ID;
  const payments: any[] = cardId
    ? [{ type: "card", card_id: cardId }]
    : [
        {
          type: "balance",
          currency,
          amount: String(Math.round(realPrice(amount) * 100)),
        },
      ];
  const { data } = await duffel.orders.create({
    type: "instant",
    selected_offers: [offerId],
    ...(customerUserId ? { users: [customerUserId] } : {}),
    // Book the chosen add-ons (baggage, seat) alongside the offer. Only sent
    // when something is actually selected — Duffel rejects an empty array.
    ...(services?.length
      ? { services: services.map((id) => ({ id, quantity: 1 })) }
      : {}),
    passengers: passengers.map((p) => ({
      id: crypto.randomUUID(),
      ...(customerUserId ? { user_id: customerUserId } : {}),
      given_name: p.given_name,
      family_name: p.family_name,
      born_on: p.born_on,
      gender: p.gender === "female" ? "f" : p.gender === "male" ? "m" : "n",
      title: p.title ?? "mr",
      email: p.email,
      phone_number: p.phone_number,
    })),
    payments,
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

export async function cancelOrder(orderId: string) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  const { data } = await duffel.orderCancellations.create({
    order_id: orderId,
  } as any);
  try {
    await duffel.orderCancellations.confirm(data.id);
  } catch {
    // some cancellations are confirmed immediately
  }
  return data as any;
}

// ---- Stays --------------------------------------------------------------

export type StaySearchParams = {
  checkInDate: string;
  checkOutDate: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
  rooms?: number;
  guests?: number;
};

export async function searchStays(params: StaySearchParams) {
  if (!duffelEnabled()) return [];
  const duffel = getDuffel();
  const { data } = await duffel.stays.search({
    check_in_date: params.checkInDate,
    check_out_date: params.checkOutDate,
    rooms: params.rooms ?? 1,
    guests: Array.from({ length: params.guests ?? 2 }, () => ({ type: "adult" })),
    location: {
      radius: params.radiusKm ?? 20,
      geographic_coordinates: {
        latitude: params.latitude,
        longitude: params.longitude,
      },
    },
  } as any);
  return data.results ?? [];
}

export async function getStayRates(resultId: string) {
  if (!duffelEnabled()) return [];
  const duffel = getDuffel();
  const { data } = await duffel.stays.searchResults.fetchAllRates(resultId);
  return (data as any).rates ?? [];
}

export async function createStayBooking({
  rateId,
  guest,
  customerUserId,
}: {
  rateId: string;
  guest: { given_name: string; family_name: string; email: string; phone_number: string };
  customerUserId?: string;
}) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  const quote = await duffel.stays.quotes.create(rateId);
  const { data } = await duffel.stays.bookings.create({
    quote_id: quote.data.id,
    ...(customerUserId ? { users: [customerUserId] } : {}),
    guests: [
      {
        ...(customerUserId ? { user_id: customerUserId } : {}),
        given_name: guest.given_name,
        family_name: guest.family_name,
      },
    ],
    email: guest.email,
    phone_number: guest.phone_number,
  } as any);
  return data as any;
}

export async function cancelStayBooking(bookingId: string) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  const { data } = await duffel.stays.bookings.cancel(bookingId);
  return data as any;
}

export async function listStayBookings() {
  if (!duffelEnabled()) return [];
  const duffel = getDuffel();
  const { data } = await duffel.stays.bookings.list({ limit: 50 } as any);
  return data as any[];
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

export async function getAccommodationReviews(accommodationId: string) {
  if (!duffelEnabled()) return [];
  const duffel = getDuffel();
  const { data } = (await duffel.stays.accommodation.reviews(
    accommodationId,
  )) as { data: any };
  return (data?.reviews ?? []) as any[];
}

// ---- Seat maps ------------------------------------------------------------

export async function getSeatMap(offerId: string) {
  if (!duffelEnabled()) return [];
  const duffel = getDuffel();
  const { data } = await duffel.seatMaps.get({ offer_id: offerId });
  return (data ?? []) as any[];
}

// ---- Cars ---------------------------------------------------------------

export type CarSearchParams = {
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  latitude: number;
  longitude: number;
  driverAge?: number;
  radiusKm?: number;
  residenceCountry?: string;
};

export async function searchCars(params: CarSearchParams) {
  if (!duffelEnabled()) return [];
  const duffel = getDuffel();
  const radius = params.radiusKm ?? 20;
  const { data } = await duffel.cars.search({
    pickup_date: params.pickupDate,
    pickup_time: params.pickupTime,
    dropoff_date: params.dropoffDate,
    dropoff_time: params.dropoffTime,
    pickup_location: {
      radius,
      geographic_coordinates: {
        latitude: params.latitude,
        longitude: params.longitude,
      },
    },
    dropoff_location: {
      radius,
      geographic_coordinates: {
        latitude: params.latitude,
        longitude: params.longitude,
      },
    },
    driver: {
      age: params.driverAge ?? 25,
      residence_country_code: params.residenceCountry ?? "NG",
    },
  } as any);
  return (data as any).rates ?? [];
}

export async function createCarBooking({
  rateId,
  driver,
  customerUserId,
}: {
  rateId: string;
  driver: {
    given_name: string;
    family_name: string;
    date_of_birth: string;
    email: string;
    phone_number: string;
  };
  customerUserId?: string;
}) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  const quote = await duffel.cars.quotes.create(rateId);
  const { data } = await duffel.cars.bookings.create({
    quote_id: quote.data.id,
    ...(customerUserId ? { users: [customerUserId] } : {}),
    driver: {
      ...(customerUserId ? { user_id: customerUserId } : {}),
      ...driver,
    },
  } as any);
  return data as any;
}

export async function cancelCarBooking(bookingId: string) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  const { data } = await duffel.cars.bookings.cancel(bookingId);
  return data as any;
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
  const { data } = await duffel.orderChangeRequests.create({
    order_id: orderId,
    slices: slices.map((s) => ({
      origin: s.origin,
      destination: s.destination,
      departure_date: s.departure_date,
      departure_time: null,
      arrival_time: null,
    })),
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
  selectedOffers,
  slices,
}: {
  orderChangeOfferId: string;
  selectedOffers: string[];
  slices: string[];
}) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  const { data } = await duffel.orderChanges.create({
    selected_order_change_offer: orderChangeOfferId,
    selected_offers: selectedOffers,
    slices,
  } as any);
  return data as any;
}

export async function confirmOrderChange(changeId: string) {
  if (!duffelEnabled()) return null;
  const duffel = getDuffel();
  const { data } = await duffel.orderChanges.confirm(changeId, {} as any);
  return data as any;
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

export async function geocode(query: string): Promise<{
  latitude: number;
  longitude: number;
  name: string;
} | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
        query,
      )}`,
      { headers: { "User-Agent": "triply-mini-app" } },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    const first = rows[0];
    if (!first) return null;
    return {
      latitude: Number(first.lat),
      longitude: Number(first.lon),
      name: first.display_name,
    };
  } catch {
    return null;
  }
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

