import { verifyUsdtPayment } from "@/lib/payments-verify";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tx = String(body.tx ?? "");
    const amount = Number(body.amount ?? 0);
    const chain = String(body.chain ?? "polygon");
    const treasury = process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS;

    if (chain !== "polygon") {
      return Response.json({ verified: false, error: "Unsupported network." }, { status: 400 });
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(tx)) {
      return Response.json({ verified: false, error: "Invalid transaction hash." }, { status: 400 });
    }
    if (!treasury) {
      return Response.json({ verified: false, error: "Treasury address is not configured." }, { status: 400 });
    }

    const verified = await verifyUsdtPayment(tx, amount, treasury);
    return Response.json({
      verified,
      tx,
      chain,
      error: verified ? undefined : "No matching USDT transfer found to the treasury.",
    });
  } catch (err) {
    return Response.json(
      { verified: false, error: err instanceof Error ? err.message : "Verification failed" },
      { status: 502 },
    );
  }
}