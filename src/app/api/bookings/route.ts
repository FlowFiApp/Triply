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

    // Merge flights + stays + cars and order by booking time (most recent
    // first), falling back to the travel date when created_at is unknown.
    const all: Booking[] = [...flights, ...stays, ...cars].sort((a, b) => {
      const ta = a.createdAt
        ? new Date(a.createdAt).getTime()
        : a.date
          ? new Date(`${a.date}T00:00:00Z`).getTime()
          : 0;
      const tb = b.createdAt
        ? new Date(b.createdAt).getTime()
        : b.date
          ? new Date(`${b.date}T00:00:00Z`).getTime()
          : 0;
      return tb - ta;
    });
    return Response.json({ bookings: all, live: all.length > 0 });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Failed to load bookings"), bookings: [], live: false },
      { status: 502 },
    );
  }
}