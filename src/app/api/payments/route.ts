import { getOrder, payHeldOrder, duffelErrorMessage } from "@/lib/duffel";
import { verifyUsdtPayment } from "@/lib/payments-verify";
import { consumeVerifiedPayment } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";

// Settles a held (awaiting_payment) order: verifies the customer's on-chain
// USDT payment once, then pays the Duffel order at its real total.
export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const orderId = String(body.orderId ?? "");
    const txHash = String(body.txHash ?? "");
    const amount = Number(body.amount ?? 0); // what the customer paid on-chain

    if (!orderId || !txHash || amount <= 0) {
      return Response.json({ error: "Missing payment details." }, { status: 400 });
    }

    const treasury = process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS;
    if (!treasury) {
      return Response.json({ error: "Treasury address is not configured." }, { status: 400 });
    }

    let verified = false;
    try {
      verified = await verifyUsdtPayment(txHash, amount, treasury);
    } catch {
      verified = false;
    }
    if (!verified) {
      return Response.json({ error: "Payment not verified on-chain." }, { status: 400 });
    }
    const consumed = await consumeVerifiedPayment(txHash, amount, user.address);
    if (!consumed) {
      return Response.json({ error: "This payment has already been used." }, { status: 400 });
    }

    // Pay Duffel at the order's real total.
    const order = await getOrder(orderId);
    if (!order) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }
    const realTotal = Number(order.total_amount ?? 0);
    const paid = await payHeldOrder(orderId, realTotal, order.total_currency ?? "USD");
    if (!paid) {
      return Response.json({ error: "Duffel is not configured." }, { status: 502 });
    }

    return Response.json({ ok: true, orderId, status: "paid" });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Payment failed") },
      { status: 502 },
    );
  }
}