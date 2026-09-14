import { redeemPoints } from "@/lib/db";
import { sendNimReward } from "@/lib/nimiq-payout";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const key = String(body.key ?? "");
    const amount = Math.round(Number(body.amount ?? 0));
    const recipient = String(body.recipient ?? ""); // user's Nimiq address

    if (!key) return Response.json({ ok: false, error: "Missing identity." }, { status: 400 });
    if (amount <= 0) return Response.json({ ok: false, error: "Invalid amount." }, { status: 400 });

    const redeemed = await redeemPoints({ userKey: key, amount });
    if (!redeemed.ok) {
      return Response.json({ ok: false, error: redeemed.error ?? "Redeem failed." }, { status: 400 });
    }

    // Attempt a real NIM payout if configured; otherwise the ledger entry stays pending.
    let txHash: string | undefined;
    let status: "sent" | "pending" = "pending";
    if (recipient) {
      try {
        txHash = await sendNimReward({ recipient, amountNim: amount });
        status = "sent";
      } catch {
        // ledger stays pending; client is told it will be paid out when funded/configured
        status = "pending";
      }
    }

    return Response.json({ ok: true, amount, txHash, status });
} catch {
    return Response.json(
      { ok: false, error: "Redeem failed. Please try again." },
      { status: 500 },
    );
  }
}