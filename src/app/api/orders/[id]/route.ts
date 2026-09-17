import { getOrder, updateOrderMetadata, duffelErrorMessage } from "@/lib/duffel";
import type { OrderDetail } from "@/lib/types";
import { normalizeOrderDetail } from "@/lib/order-normalize";
import { requireUser, unauthorized } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const order = await getOrder(id);
    if (!order) {
      return Response.json(
        { error: "Duffel not configured or order not found" },
        { status: 404 },
      );
    }
    return Response.json({ order: normalizeOrderDetail(order), live: true });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Failed to load order") },
      { status: 502 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const metadata = body.metadata;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return Response.json({ error: "Missing metadata." }, { status: 400 });
    }
    const updated = await updateOrderMetadata(id, metadata);
    if (!updated) {
      return Response.json(
        { error: "Duffel is not configured." },
        { status: 502 },
      );
    }
    return Response.json({
      order: normalizeOrderDetail(updated),
      live: true,
    });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Failed to update order") },
      { status: 502 },
    );
  }
}

export type { OrderDetail };