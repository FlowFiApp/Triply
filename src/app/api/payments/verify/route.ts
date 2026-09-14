import { duffelErrorMessage } from "@/lib/duffel";

const POLYGON_RPC = "https://polygon-bor-rpc.publicnode.com";
const USDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function padded(address: string) {
  return "0x" + address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(POLYGON_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`RPC error ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? "RPC error");
  return json.result;
}

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
    if (!tx || !/^0x[0-9a-fA-F]{64}$/.test(tx)) {
      return Response.json({ verified: false, error: "Invalid transaction hash." }, { status: 400 });
    }
    if (!treasury) {
      return Response.json({ verified: false, error: "Treasury address is not configured." }, { status: 400 });
    }

    const receipt: {
      status?: string;
      logs?: Array<{ address: string; topics: string[]; data: string }>;
    } | null = await rpc("eth_getTransactionReceipt", [tx]);

    if (!receipt) {
      return Response.json({ verified: false, error: "Transaction not found yet." });
    }
    if (receipt.status !== "0x1") {
      return Response.json({ verified: false, error: "Transaction failed on-chain." });
    }

    const decimals = 6;
    const expected = BigInt(Math.round(amount * 10 ** decimals));
    const hit = (receipt.logs ?? []).some((log) => {
      if (log.address?.toLowerCase() !== USDT.toLowerCase()) return false;
      if (log.topics?.[0]?.toLowerCase() !== TRANSFER_TOPIC) return false;
      if (log.topics?.[2]?.toLowerCase() !== padded(treasury)) return false;
      try {
        return BigInt(log.data) >= expected;
      } catch {
        return false;
      }
    });

    return Response.json({
      verified: hit,
      tx,
      chain,
      error: hit ? undefined : "No matching USDT transfer found to the treasury.",
    });
  } catch (err) {
    return Response.json(
      { verified: false, error: duffelErrorMessage(err, "Verification failed") },
      { status: 502 },
    );
  }
}