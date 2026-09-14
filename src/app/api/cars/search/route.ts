/* eslint-disable @typescript-eslint/no-explicit-any */
import { duffelErrorMessage, geocode, searchCars } from "@/lib/duffel";
import type { CarOffer } from "@/lib/types";
import { testPrice } from "@/lib/pricing";

function normalizeCar(r: any): CarOffer {
  const car = r.car ?? {};
  const days = Math.max(1, Math.round(
    (new Date(r.dropoff_date ?? "").getTime() -
      new Date(r.pickup_date ?? "").getTime()) /
      86400000,
  ));
  const total = testPrice(Number(r.total_amount ?? 0));
  return {
    id: r.id ?? r.rate_id,
    name: car.name ?? car.category ?? "Car",
    category: car.category ?? "",
    transmission: car.transmission ?? "",
    fuel: car.fuel ?? "",
    seats: car.people_capacity ?? 0,
    pricePerDay: days ? total / days : total,
    totalAmount: total,
    currency: r.total_currency ?? "USD",
    supplier: r.supplier?.name ?? "",
    image: car.image_url ?? "",
pickup: r.pickup_location?.name ?? "",
    dropoff: r.dropoff_location?.name ?? "",
    pickupTime: r.pickup_time ?? "",
    dropoffTime: r.dropoff_time ?? "",
    pickupLatitude: Number(r.pickup_location?.geographic_coordinates?.latitude ?? 0),
    pickupLongitude: Number(r.pickup_location?.geographic_coordinates?.longitude ?? 0),
    dropoffLatitude: Number(r.dropoff_location?.geographic_coordinates?.latitude ?? 0),
    dropoffLongitude: Number(r.dropoff_location?.geographic_coordinates?.longitude ?? 0),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const testMode = Boolean(body.test);
    // Duffel Test Drive only appears in Test Mode at these exact coordinates.
    const place = testMode
      ? { latitude: -24.38, longitude: -128.32 }
      : body.latitude
        ? { latitude: body.latitude, longitude: body.longitude }
        : body.pickupLocation
          ? await geocode(body.pickupLocation)
          : { latitude: 51.47, longitude: -0.4543 };
    const rates = await searchCars({
      pickupDate: body.pickupDate ?? "2026-10-24",
      pickupTime: body.pickupTime ?? "10:30",
      dropoffDate: body.dropoffDate ?? "2026-10-29",
      dropoffTime: body.dropoffTime ?? "15:00",
      latitude: place?.latitude ?? 51.47,
      longitude: place?.longitude ?? -0.4543,
      driverAge: testMode ? 31 : (body.driverAge ?? 25),
      radiusKm: testMode ? 1 : (body.radiusKm ?? 20),
      residenceCountry: testMode ? "GB" : undefined,
    });
    return Response.json({
      cars: rates.map(normalizeCar),
      live: rates.length > 0,
      test: testMode,
    });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Car search failed"), cars: [], live: false },
      { status: 502 },
    );
  }
}
