/* eslint-disable @typescript-eslint/no-explicit-any */
import { duffelErrorMessage, geocode, searchStays } from "@/lib/duffel";
import type { StayOffer } from "@/lib/types";
import { testPrice } from "@/lib/pricing";

function normalizeStay(r: any): StayOffer {
  const acc = r.accommodation ?? {};
  const city = acc.location?.city ?? acc.address?.city_name ?? "";
  const amount = testPrice(Number(r.cheapest_rate_total_amount ?? 0));
  const nights = Math.max(
    1,
    Math.round(
      (new Date(r.check_out_date ?? "").getTime() -
        new Date(r.check_in_date ?? "").getTime()) /
        86400000,
    ),
  );
  return {
    id: acc.id ?? r.id,
    resultId: r.id,
    name: acc.name ?? "Accommodation",
    rating: acc.rating?.overall_rating ?? 0,
    reviews: acc.rating?.total_reviews ?? 0,
    city,
    location: acc.address
      ? `${acc.address?.line_one ?? ""}, ${city}`.replace(/^, /, "") || city
      : city,
    pricePerNight: nights ? amount / nights : amount,
    totalAmount: amount,
    currency: r.cheapest_rate_currency ?? "USD",
    image: acc.images?.[0]?.url ?? "",
    images: (acc.images ?? [])
      .map((im: any) => im.url)
      .filter((u: unknown): u is string => typeof u === "string" && Boolean(u)),
    checkIn: r.check_in_date ?? "",
    checkOut: r.check_out_date ?? "",
    latitude: Number(acc.coordinates?.latitude ?? 0),
    longitude: Number(acc.coordinates?.longitude ?? 0),
    description: acc.description ?? "",
    amenities: Array.isArray(acc.amenities) ? acc.amenities : [],
    starRating: Number(acc.star_rating ?? 0),
    supplierName: acc.supplier?.name ?? "",
    checkInTime: acc.check_in_time ?? "",
    checkOutTime: acc.check_out_time ?? "",
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const testMode = Boolean(body.test);
    const query = body.destination ?? "London, UK";
    // Duffel Test Hotels only appear in Test Mode at these exact coordinates.
    const place = testMode
      ? { latitude: -24.38, longitude: -128.32 }
      : body.latitude
        ? { latitude: body.latitude, longitude: body.longitude }
        : await geocode(query);

    const stays = await searchStays({
      checkInDate: body.checkInDate ?? "2026-10-24",
      checkOutDate: body.checkOutDate ?? "2026-11-08",
      latitude: place?.latitude ?? 51.5072,
      longitude: place?.longitude ?? -0.1276,
      radiusKm: testMode ? 2 : (body.radiusKm ?? 20),
      rooms: body.rooms ?? 1,
      guests: body.guests ?? 2,
    });

    return Response.json({
      stays: stays.map(normalizeStay),
      live: stays.length > 0,
      test: testMode,
    });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Stay search failed"), stays: [], live: false },
      { status: 502 },
    );
  }
}
