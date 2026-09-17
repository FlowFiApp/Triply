import { duffelErrorMessage, listOrders } from "@/lib/duffel";
import { normalizeCarBooking, normalizeFlightBooking, normalizeStayBooking } from "@/lib/order-normalize";
import { listPersistedBookings } from "@/lib/db";
import type { Booking } from "@/lib/types";
import { requireUser, unauthorized } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  const email = new URL(request.url).searchParams.get("email")?.toLowerCase() ?? "";
  try {
    const [ordersRes, persistedRes] = await Promise.allSettled([
      listOrders(),
      listPersistedBookings(email || undefined),
    ]);
    const orders = ordersRes.status === "fulfilled" ? ordersRes.value : [];
    const persisted = persistedRes.status === "fulfilled" ? persistedRes.value : [];

    // Flights come from the Duffel test account; stays/cars are persisted and
    // scoped by email when one is provided. Past/cancelled bookings are kept so
    // the "Past" tab shows them.
    const flights: Booking[] = (orders ?? []).map(normalizeFlightBooking);
    const stays: Booking[] = persisted
      .filter((b) => b.kind === "stay")
      .map(normalizeStayBooking);
    const cars: Booking[] = persisted
      .filter((b) => b.kind === "car")
      .map(normalizeCarBooking);

    const all: Booking[] = [...flights, ...stays, ...cars];
    return Response.json({ bookings: all, live: all.length > 0 });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Failed to load bookings"), bookings: [], live: false },
      { status: 502 },
    );
  }
}