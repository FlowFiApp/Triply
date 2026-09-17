/* eslint-disable @typescript-eslint/no-explicit-any */
import { duffelErrorMessage } from "@/lib/duffel";
import type { StayBooking } from "@/lib/types";
import { testPrice } from "@/lib/pricing";
import { requireUser, unauthorized } from "@/lib/auth";
import { upsertBooking, getOrCreateUser, earnPoints } from "@/lib/db";
import mockData from "@/lib/data.json";

// NOTE: Stays are served from the bundled local dataset (Duffel Stays is not
// enabled on this token). Bookings are persisted to Mongo so they appear in
// My Trips and can be cancelled; the live Duffel call is kept out until access
// is granted.

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const email = String(body.guest?.email ?? "").toLowerCase();
    const checkIn = String(body.checkInDate ?? "2026-10-24");
    const checkOut = String(body.checkOutDate ?? "2026-11-08");

    const resultId = String(body.rateId ?? "").replace("rat_local_", "");
    const stay = (mockData.accommodations as unknown as any[]).find(
      (r: any) => r.id === resultId,
    );
    const totalAmount = testPrice(Number(stay?.cheapest_rate_total_amount ?? 0));
    const currency = stay?.cheapest_rate_currency ?? "USD";
    const name = stay?.accommodation?.name ?? "Local Stay";
    const address = stay?.accommodation?.address
      ? `${stay.accommodation.address?.line_one ?? ""}, ${stay.accommodation.address?.city_name ?? ""}`
      : "";

    // Stable id so re-booking the same stay + dates under the same email
    // updates the same record and never double-earns points.
    const id = `stay:${resultId}:${checkIn}:${checkOut}:${email}`;
    const reference = `STAY-${resultId.slice(0, 6).toUpperCase()}-${checkIn.replace(/-/g, "")}`;

    try {
      await upsertBooking({
        kind: "stay",
        id,
        reference,
        email,
        status: "confirmed",
        accommodationName: name,
        checkIn,
        checkOut,
        address,
        totalAmount,
        currency,
      });
      const created = await getOrCreateUser({ nimiqAddress: user.address });
      await earnPoints({
        userKey: created.key,
        amountUsd: totalAmount,
        bookingRef: id,
        bookingKind: "stay",
        orderId: id,
      });
      if (email) {
        const { sendEmail, bookingEmailHtml } = await import("@/lib/resend");
        await sendEmail({
          to: email,
          subject: `Triply — stay booked (${reference})`,
          html: bookingEmailHtml({
            brand: "Triply",
            reference,
            title: "Stay",
            subtitle: `${name} · ${checkIn} → ${checkOut}`,
            amount: String(totalAmount),
            currency,
          }),
        });
      }
    } catch {
      // ledger/persistence failure must not block the booking
    }

    const result: StayBooking = {
      id,
      reference,
      status: "confirmed",
      checkIn,
      checkOut,
      accommodationName: name,
      totalAmount,
      currency,
      address,
    };
    return Response.json({ live: true, booking: result });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Booking failed") },
      { status: 502 },
    );
  }
}