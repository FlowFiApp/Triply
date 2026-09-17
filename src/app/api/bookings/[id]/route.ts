import { getPersistedBooking } from "@/lib/db";
import { normalizeCarBooking, normalizeStayBooking } from "@/lib/order-normalize";
import { requireUser, unauthorized } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const booking = await getPersistedBooking(id);
    if (!booking) {
      return Response.json({ error: "Booking not found." }, { status: 404 });
    }
    const item =
      booking.kind === "stay"
        ? normalizeStayBooking(booking)
        : normalizeCarBooking(booking);
    return Response.json({ booking: item, live: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load booking" },
      { status: 502 },
    );
  }
}