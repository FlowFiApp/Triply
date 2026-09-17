import { createOrderCancellation, duffelErrorMessage } from "@/lib/duffel";
import { requireUser, unauthorized } from "@/lib/auth";

// Creates a PENDING order cancellation and returns the refund quote. The user
// must confirm via POST /api/orders/:id/cancel/confirm for it to take effect.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const result = await createOrderCancellation(id);
    if (!result) {
      return Response.json({
        live: false,
        error: "Duffel is not configured. Set DUFFEL_ACCESS_TOKEN to cancel orders.",
      });
    }
    return Response.json({
      live: true,
      status: "pending",
      cancellationId: result.id,
      refundAmount: Number(result.refund_amount ?? 0),
      currency: result.refund_currency ?? "USD",
      refundTo: result.refund_to ?? "balance",
      expiresAt: result.expires_at ?? null,
    });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Cancellation failed") },
      { status: 502 },
    );
  }
}