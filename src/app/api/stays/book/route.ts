import { createStayBooking, duffelErrorMessage, ensureCustomerUser } from "@/lib/duffel";
import type { StayBooking } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const guest = body.guest;
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
    if (!booking) {
      return Response.json({
        live: false,
        error: "Duffel is not configured. Set DUFFEL_ACCESS_TOKEN to book stays.",
      });
    }
    const result: StayBooking = {
      id: booking.id,
      reference: booking.reference ?? booking.id,
      status: booking.status ?? "confirmed",
      checkIn: booking.check_in_date ?? "",
      checkOut: booking.check_out_date ?? "",
      accommodationName: booking.accommodation?.name ?? "",
      totalAmount: Number(booking.total_amount ?? 0),
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