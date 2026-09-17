import { redeemPoints, restoreRedeemPoints, updateRewardStatus } from "@/lib/db";
import { sendNimReward } from "@/lib/nimiq-payout";
import { requireUser, unauthorized } from "@/lib/auth";
import { ValidationUtils } from "@nimiq/utils/validation-utils";

function cleanRecipient(raw: string): string {
  if (!raw) return "";
  try {
    if (!ValidationUtils.isValidAddress(raw)) return "";
    return ValidationUtils.normalizeAddress(raw);
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const key = user.key;
    const amount = Math.round(Number(body.amount ?? 0) * 10) / 10; // 1-decimal precision
    const recipient = cleanRecipient(String(body.recipient ?? "")); // user's Nimiq address

    if (amount <= 0) return Response.json({ ok: false, error: "Invalid amount." }, { status: 400 });
    // Without a valid payout wallet the points would be burned with no payout.
    if (!recipient) {
      return Response.json(
        { ok: false, error: "Connect a valid Nimiq Pay wallet to redeem." },
        { status: 400 },
      );
    }

    const redeemed = await redeemPoints({ userKey: key, amount });
    if (!redeemed.ok || !redeemed.recordId) {
      return Response.json({ ok: false, error: redeemed.error ?? "Redeem failed." }, { status: 400 });
    }
    const recordId = redeemed.recordId;

    // Attempt a real NIM payout; on failure, return the points to the user.
    let txHash: string | undefined;
    let status: "sent" | "pending" = "pending";
    try {
      const result = await sendNimReward({
        recipient,
        amountNim: amount,
      });
      txHash = result.hash;
      status = "sent";
      await updateRewardStatus(recordId, {
        status: "sent",
        txHash: result.hash,
        recipient,
      });
    } catch (err) {
      status = "pending";
      try {
        await restoreRedeemPoints(recordId, key, amount);
      } catch {
        // ledger restore is best-effort
      }
      return Response.json(
        {
          ok: false,
          error: err instanceof Error ? err.message : "Payout failed — points refunded.",
        },
        { status: 502 },
      );
    }

    return Response.json({ ok: true, amount, txHash, status });
  } catch {
    return Response.json(
      { ok: false, error: "Redeem failed. Please try again." },
      { status: 500 },
    );
  }
}