import { createComponentClientKey } from "@/lib/duffel";
import { getUser } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";

// Creates an ephemeral Duffel Assistant client key for the signed-in user,
// optionally scoped to an order/booking for resource context.
export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const dbUser = await getUser(user.address);
    const customerUserId = dbUser?.customerUserId;
    if (!customerUserId) {
      return Response.json(
        { error: "No Duffel customer user is linked to your account yet." },
        { status: 400 },
      );
    }
    const clientKey = await createComponentClientKey(customerUserId, {
      orderId: body.orderId ? String(body.orderId) : undefined,
      bookingId: body.bookingId ? String(body.bookingId) : undefined,
    });
    if (!clientKey) {
      return Response.json(
        { error: "Could not create a support client key." },
        { status: 502 },
      );
    }
    return Response.json({ clientKey });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}