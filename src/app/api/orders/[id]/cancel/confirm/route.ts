import { confirmOrderCancellation, duffelErrorMessage } from "@/lib/duffel";
import { requireUser, unauthorized } from "@/lib/auth";

// Confirms a pending order cancellation (created via POST /api/orders/:id/cancel),
// cancelling the booking and applying the refund.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const cancellationId = String(body.cancellationId ?? "");
    if (!cancellationId) {
      return Response.json(
        { error: "Missing cancellationId." },
        { status: 400 },
      );
    }
    const result = await confirmOrderCancellation(cancellationId);
    if (!result) {
      return Response.json({
        live: false,
        error: "Duffel is not configured. Set DUFFEL_ACCESS_TOKEN to confirm cancellations.",
      });
    }
    return Response.json({
      live: true,
      orderId: id,
      status: result.confirmed_at ? "cancelled" : result.status ?? "cancelled",
      refundAmount: Number(result.refund_amount ?? 0),
      currency: result.refund_currency ?? "USD",
      refundTo: result.refund_to ?? "balance",
      confirmedAt: result.confirmed_at ?? null,
    });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Cancellation confirmation failed") },
      { status: 502 },
    );
  }
}