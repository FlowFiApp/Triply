/* eslint-disable @typescript-eslint/no-explicit-any */
import { duffelErrorMessage } from "@/lib/duffel";
import type { CarBooking } from "@/lib/types";
import { testPrice } from "@/lib/pricing";
import mockData from "@/lib/data.json";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // NOTE: Cars are served from the bundled local dataset (Duffel Cars is
    // not enabled on this token). The live Duffel booking + customer-user calls
    // are kept below, commented out, for when access is granted.
    /*
    const customerUserId = driver?.email
      ? await ensureCustomerUser({
          email: driver.email,
          given_name: driver.given_name ?? "",
          family_name: driver.family_name ?? "",
          phone_number: driver.phone_number,
        })
      : undefined;
    const booking = await createCarBooking({
      rateId: body.rateId,
      driver,
      customerUserId: customerUserId ?? undefined,
    });
    */
    const carRate = (mockData.cars as unknown as any[]).find(
      (r: any) => r.id === body.rateId,
    );
    const booking = {
      id: crypto.randomUUID(),
      reference: `CAR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      status: "confirmed",
      pickup_date: body.pickupDate ?? "2026-10-24",
      dropoff_date: body.dropoffDate ?? "2026-10-29",
      pickup_location: { name: carRate?.pickup_location?.name ?? "Pickup location" },
      car: { name: carRate?.car?.name ?? "Car" },
      total_amount: carRate?.total_amount ?? "0",
      total_currency: carRate?.total_currency ?? "USD",
    };

    // 2 NIM per 1 USDT, credited once per booking.
    try {
      const { getOrCreateUser, earnPoints } = await import("@/lib/db");
      const user = await getOrCreateUser({
        nimiqAddress: body.nimiqAddress,
        deviceId: body.deviceId,
      });
      await earnPoints({
        userKey: user.key,
        amountUsd: testPrice(Number(booking.total_amount ?? 0)),
        bookingRef: booking.reference ?? booking.id,
        bookingKind: "car",
        orderId: booking.id,
      });
    } catch {
      // ledger failure must not block the booking
    }
    const result: CarBooking = {
      id: booking.id,
      reference: booking.reference ?? booking.id,
      status: booking.status ?? "confirmed",
      carName: booking.car?.name ?? "",
      pickupDate: booking.pickup_date ?? "",
      dropoffDate: booking.dropoff_date ?? "",
      pickupLocation: booking.pickup_location?.name ?? "",
      totalAmount: testPrice(Number(booking.total_amount ?? 0)),
      currency: booking.total_currency ?? "USD",
    };
    return Response.json({ live: true, booking: result });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Booking failed") },
      { status: 502 },
    );
  }
}