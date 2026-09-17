import { confirmOrderChange, createOrderChange, duffelErrorMessage } from "@/lib/duffel";
import { requireUser, unauthorized } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const orderChangeRequestId = String(body.orderChangeRequestId ?? "");
    if (!orderChangeRequestId) {
      return Response.json(
        { error: "Missing orderChangeRequestId." },
        { status: 400 },
      );
    }
    const orderChange = await createOrderChange({
      orderChangeRequestId,
      orderChangeOfferId: String(body.orderChangeOfferId ?? ""),
      selectedOffers: body.selectedOffers ?? [],
      slices: body.slices ?? [],
    });
    if (!orderChange) {
      return Response.json({
        live: false,
        error: "Duffel is not configured. Set DUFFEL_ACCESS_TOKEN.",
      });
    }
    let confirmed = null;
    if (orderChange.id) {
      try {
        confirmed = await confirmOrderChange(orderChange.id);
      } catch {
        // some changes are confirmed immediately
      }
    }
    return Response.json({ live: true, orderId: id, orderChange, confirmed });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Order change failed") },
      { status: 502 },
    );
  }
}