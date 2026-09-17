import "server-only";

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

/** Confirms a USDT transfer to the treasury on Polygon for at least `amount`. */
export async function verifyUsdtPayment(
  tx: string,
  amount: number,
  treasury: string,
): Promise<boolean> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(tx)) return false;
  if (!treasury) return false;

  const receipt: {
    status?: string;
    logs?: Array<{ address: string; topics: string[]; data: string }>;
  } | null = await rpc("eth_getTransactionReceipt", [tx]);

  if (!receipt) return false;
  if (receipt.status !== "0x1") return false;

  const expected = BigInt(Math.round(amount * 10 ** 6));
  return (receipt.logs ?? []).some((log) => {
    if (log.address?.toLowerCase() !== USDT.toLowerCase()) return false;
    if (log.topics?.[0]?.toLowerCase() !== TRANSFER_TOPIC) return false;
    if (log.topics?.[2]?.toLowerCase() !== padded(treasury)) return false;
    try {
      return BigInt(log.data) >= expected;
    } catch {
      return false;
    }
  });
}