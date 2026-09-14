import { cancelOrder, duffelErrorMessage } from "@/lib/duffel";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const result = await cancelOrder(id);
    if (!result) {
      return Response.json({
        live: false,
        error: "Duffel is not configured. Set DUFFEL_ACCESS_TOKEN to cancel orders.",
      });
    }
    return Response.json({
      live: true,
      status: result.status ?? "cancelled",
      refundAmount: Number(result.refund_amount ?? 0),
      currency: result.refund_currency ?? "USD",
    });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Cancellation failed") },
      { status: 502 },
    );
  }
}