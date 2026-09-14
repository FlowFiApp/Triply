/* eslint-disable @typescript-eslint/no-explicit-any */
import { createOrderChangeRequest, duffelErrorMessage, listOrderChangeOffers } from "@/lib/duffel";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const changeRequest = await createOrderChangeRequest(id, body.slices ?? []);
    const offers = await listOrderChangeOffers();
    const relevant = (offers ?? []).filter(
      (o: any) => o.order_change_request_id === changeRequest?.id,
    );
    return Response.json({ live: true, changeRequest, offers: relevant });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Change request failed") },
      { status: 502 },
    );
  }
}