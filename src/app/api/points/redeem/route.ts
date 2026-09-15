import { redeemPoints, updateRewardStatus } from "@/lib/db";
import { sendNimReward } from "@/lib/nimiq-payout";
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
  try {
    const body = await request.json();
    const key = String(body.key ?? "");
    const amount = Math.round(Number(body.amount ?? 0) * 10) / 10; // 1-decimal precision
    const recipient = cleanRecipient(String(body.recipient ?? "")); // user's Nimiq address

    if (!key) return Response.json({ ok: false, error: "Missing identity." }, { status: 400 });
    if (amount <= 0) return Response.json({ ok: false, error: "Invalid amount." }, { status: 400 });

    const redeemed = await redeemPoints({ userKey: key, amount });
    if (!redeemed.ok || !redeemed.recordId) {
      return Response.json({ ok: false, error: redeemed.error ?? "Redeem failed." }, { status: 400 });
    }
    const recordId = redeemed.recordId;

    // Attempt a real NIM payout if configured; otherwise the ledger entry stays pending.
    let txHash: string | undefined;
    let status: "sent" | "pending" = "pending";
    if (recipient) {
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
        // Ledger stays pending; record the failure so it can be retried/refunded.
        status = "pending";
        await updateRewardStatus(recordId, {
          status: "failed",
          recipient,
          error: err instanceof Error ? err.message : "send_failed",
        });
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