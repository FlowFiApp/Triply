import { getSenderBalanceLuna, rewardSenderAddress } from "@/lib/nimiq-payout";

const LUNA_PER_NIM = 100_000n;

export async function GET() {
  const configured = Boolean(process.env.NIMIQ_REWARD_MNEMONIC && process.env.NIMIQ_RPC_URL);
  try {
    const sender = await rewardSenderAddress();
    const balanceLuna = configured && sender ? await getSenderBalanceLuna(sender) : null;
    return Response.json({
      configured,
      sender,
      balanceNim:
        balanceLuna == null ? null : Number(BigInt(balanceLuna) / LUNA_PER_NIM),
      rpcConfigured: Boolean(process.env.NIMIQ_RPC_URL),
    });
  } catch (err) {
    return Response.json(
      {
        configured,
        sender: "",
        balanceNim: null,
        rpcConfigured: Boolean(process.env.NIMIQ_RPC_URL),
        error: err instanceof Error ? err.message : "sender_lookup_failed",
      },
      { status: 200 },
    );
  }
}