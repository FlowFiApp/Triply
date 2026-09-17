/* eslint-disable @typescript-eslint/no-explicit-any */
import { createOrderChangeRequest, listOrderChangeOffers } from "@/lib/duffel";
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
    const changeRequest = await createOrderChangeRequest(id, body.slices ?? []);
    const offers = await listOrderChangeOffers();
    const relevant = (offers ?? []).filter(
      (o: any) => o.order_change_request_id === changeRequest?.id,
    );
    return Response.json({
      live: true,
      changeRequest,
      changeRequestId: changeRequest?.id ?? "",
      offers: relevant,
    });
  } catch (err) {
    const e = err as {
      message?: string;
      errors?: Array<{ title?: string; detail?: string; source?: unknown }>;
      status?: number;
    };
    console.error("POST /api/orders/:id/change failed", {
      orderId: id,
      message: e?.message,
      status: e?.status,
      errors: e?.errors,
    });
    return Response.json(
      { error: e?.message || "Change request failed" },
      { status: 502 },
    );
  }
}