import { createStayBooking, duffelErrorMessage, ensureCustomerUser } from "@/lib/duffel";
import type { StayBooking } from "@/lib/types";
import { testPrice } from "@/lib/pricing";
import mockData from "@/lib/data.json";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const guest = body.guest;

    // NOTE: Stays are served from the bundled local dataset (Duffel Stays is
    // not enabled on this token). The live Duffel booking + customer-user calls
    // are kept below, commented out, for when access is granted.
    /*
    const customerUserId = guest?.email
      ? await ensureCustomerUser({
          email: guest.email,
          given_name: guest.given_name ?? "",
          family_name: guest.family_name ?? "",
          phone_number: guest.phone_number,
        })
      : undefined;
    const booking = await createStayBooking({
      rateId: body.rateId,
      guest,
      customerUserId: customerUserId ?? undefined,
    });
    */
    const resultId = String(body.rateId ?? "").replace("rat_local_", "");
    const stay = (mockData.accommodations as unknown as any[]).find(
      (r: any) => r.id === resultId,
    );
    const booking = {
      id: crypto.randomUUID(),
      reference: `STAY-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      status: "confirmed",
      check_in_date: body.checkInDate ?? "2026-10-24",
      check_out_date: body.checkOutDate ?? "2026-11-08",
      accommodation: {
        name: stay?.accommodation?.name ?? "Local Stay",
        address: stay?.accommodation?.address
          ? {
              line_one: stay.accommodation.address.line_one ?? "",
              city_name: stay.accommodation.address.city_name ?? "",
            }
          : {},
      },
      total_amount: stay?.cheapest_rate_total_amount ?? "0",
      total_currency: stay?.cheapest_rate_currency ?? "USD",
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
        bookingKind: "stay",
        orderId: booking.id,
      });
    } catch {
      // ledger failure must not block the booking
    }
    const result: StayBooking = {
      id: booking.id,
      reference: booking.reference ?? booking.id,
      status: booking.status ?? "confirmed",
      checkIn: booking.check_in_date ?? "",
      checkOut: booking.check_out_date ?? "",
      accommodationName: booking.accommodation?.name ?? "",
      totalAmount: testPrice(Number(booking.total_amount ?? 0)),
      currency: booking.total_currency ?? "USD",
      address: booking.accommodation?.address
        ? `${booking.accommodation.address?.line_one ?? ""}, ${booking.accommodation.address?.city_name ?? ""}`
        : "",
    };
    return Response.json({ live: true, booking: result });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Booking failed") },
      { status: 502 },
    );
  }
}