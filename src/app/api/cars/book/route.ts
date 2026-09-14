import { createCarBooking, duffelErrorMessage, ensureCustomerUser } from "@/lib/duffel";
import type { CarBooking } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const driver = body.driver;
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
    if (!booking) {
      return Response.json({
        live: false,
        error: "Duffel is not configured. Set DUFFEL_ACCESS_TOKEN to book cars.",
      });
    }
    const result: CarBooking = {
      id: booking.id,
      reference: booking.reference ?? booking.id,
      status: booking.status ?? "confirmed",
      carName: booking.car?.name ?? "",
      pickupDate: booking.pickup_date ?? "",
      dropoffDate: booking.dropoff_date ?? "",
      pickupLocation: booking.pickup_location?.name ?? "",
      totalAmount: Number(booking.total_amount ?? 0),
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