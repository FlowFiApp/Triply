import { duffelErrorMessage, redeliverWebhookEvent } from "@/lib/duffel";
import { requireUser, unauthorized } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const result = await redeliverWebhookEvent(body.eventId);
    if (!result) {
      return Response.json({
        live: false,
        error: "Duffel is not configured. Set DUFFEL_ACCESS_TOKEN.",
      });
    }
    return Response.json({ live: true, result });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Redelivery failed") },
      { status: 502 },
    );
  }
}