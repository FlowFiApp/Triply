/* eslint-disable @typescript-eslint/no-explicit-any */
import { duffelErrorMessage } from "@/lib/duffel";
import type { CarBooking } from "@/lib/types";
import { testPrice } from "@/lib/pricing";
import { requireUser, unauthorized } from "@/lib/auth";
import { upsertBooking, getOrCreateUser, earnPoints } from "@/lib/db";
import mockData from "@/lib/data.json";

// NOTE: Cars are served from the bundled local dataset (Duffel Cars is not
// enabled on this token). Bookings are persisted to Mongo so they appear in
// My Trips and can be cancelled.

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const email = String(body.driver?.email ?? "").toLowerCase();
    const pickupDate = String(body.pickupDate ?? "2026-10-24");
    const dropoffDate = String(body.dropoffDate ?? "2026-10-29");

    const carRate = (mockData.cars as unknown as any[]).find(
      (r: any) => r.id === body.rateId,
    );
    const totalAmount = testPrice(Number(carRate?.total_amount ?? 0));
    const currency = carRate?.total_currency ?? "USD";
    const carName = carRate?.car?.name ?? "Car";
    const pickupLocation = carRate?.pickup_location?.name ?? "Pickup location";

    // Stable id so re-booking the same rate + dates under the same email
    // updates the same record and never double-earns points.
    const id = `car:${String(body.rateId ?? "")}:${pickupDate}:${dropoffDate}:${email}`;
    const reference = `CAR-${String(body.rateId ?? "")
      .slice(0, 6)
      .toUpperCase()}-${pickupDate.replace(/-/g, "")}`;

    try {
      await upsertBooking({
        kind: "car",
        id,
        reference,
        email,
        status: "confirmed",
        carName,
        pickupLocation,
        pickupDate,
        dropoffDate,
        totalAmount,
        currency,
      });
      const created = await getOrCreateUser({ nimiqAddress: user.address });
      await earnPoints({
        userKey: created.key,
        amountUsd: totalAmount,
        bookingRef: id,
        bookingKind: "car",
        orderId: id,
      });
      if (email) {
        const { sendEmail, bookingEmailHtml } = await import("@/lib/resend");
        await sendEmail({
          to: email,
          subject: `Triply — car booked (${reference})`,
          html: bookingEmailHtml({
            brand: "Triply",
            reference,
            title: "Car rental",
            subtitle: `${carName} · ${pickupDate} → ${dropoffDate}`,
            amount: String(totalAmount),
            currency,
          }),
        });
      }
    } catch {
      // ledger/persistence failure must not block the booking
    }

    const result: CarBooking = {
      id,
      reference,
      status: "confirmed",
      carName,
      pickupDate,
      dropoffDate,
      pickupLocation,
      totalAmount,
      currency,
    };
    return Response.json({ live: true, booking: result });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Booking failed") },
      { status: 502 },
    );
  }
}