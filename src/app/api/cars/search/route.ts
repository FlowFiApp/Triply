/* eslint-disable @typescript-eslint/no-explicit-any */
import { duffelErrorMessage, geocode, searchCars } from "@/lib/duffel";
import type { CarOffer } from "@/lib/types";
import { testPrice } from "@/lib/pricing";
import mockData from "@/lib/data.json";

function normalizeCar(r: any): CarOffer {
  const car = r.car ?? {};
  const days = Math.max(1, Math.round(
    (new Date(r.dropoff_date ?? "").getTime() -
      new Date(r.pickup_date ?? "").getTime()) /
      86400000,
  ));
  const total = testPrice(Number(r.total_amount ?? 0));
  const features = Array.isArray(car.features) ? car.features : [];
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
    doors: Number(car.doors ?? 0),
    luggage: Number(car.luggage_capacity ?? 0),
    airCon: features.includes("air_conditioning"),
    gps: features.includes("gps"),
    bluetooth: features.includes("bluetooth"),
    usb: features.includes("usb"),
    mileage: r.mileage?.unlimited
      ? "Unlimited"
      : r.mileage?.free_km
        ? `${r.mileage.free_km} km`
        : "",
    fuelPolicy: r.fuel_policy ?? "",
    insuranceIncluded: Boolean(r.insurance?.included),
    additionalDriver: Boolean(r.additional_driver?.included),
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

    // NOTE: The Cars product is not enabled on this Duffel token
    // (Duffel returns "This Duffel token does not have access to this product").
    // Serving from the bundled local dataset instead. The live Duffel call is
    // kept below, commented out, for when access is granted.
    /*
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
    */
    const rates: any[] = mockData.cars as unknown as any[];

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
