import { cancelPersistedBooking } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const cancelled = await cancelPersistedBooking(id);
    if (!cancelled) {
      return Response.json(
        { error: "Booking not found or already cancelled." },
        { status: 404 },
      );
    }
    return Response.json({ live: true, status: "cancelled" });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Cancellation failed" },
      { status: 502 },
    );
  }
}