import { confirmOrderChange, createOrderChange, duffelErrorMessage } from "@/lib/duffel";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  void id;
  try {
    const body = await request.json();
    const orderChange = await createOrderChange({
      orderChangeOfferId: body.orderChangeOfferId,
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
    return Response.json({ live: true, orderChange, confirmed });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Order change failed") },
      { status: 502 },
    );
  }
}