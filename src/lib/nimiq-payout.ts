import "server-only";

const REWARD_KEY = process.env.NIMIQ_REWARD_PRIVATE_KEY;
const RPC_URL = process.env.NIMIQ_RPC_URL;
const LUNA_PER_NIM = 100_000n;
const NETWORK_ID = 1; // Nimiq Albatross mainnet

async function rpc(method: string, params: unknown[]) {
  if (!RPC_URL) throw new Error("NIMIQ_RPC_URL is not configured");
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Nimiq RPC error ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? "Nimiq RPC error");
  return json.result;
}

/**
 * Sends NIM from the merchant reward wallet to the user's Nimiq address.
 * Requires NIMIQ_REWARD_PRIVATE_KEY (32-byte hex) and a Nimiq mainnet RPC.
 */
export async function sendNimReward({
  recipient,
  amountNim,
}: {
  recipient: string;
  amountNim: number;
}): Promise<string> {
  if (!REWARD_KEY) throw new Error("NIMIQ_REWARD_PRIVATE_KEY is not configured");

  let Nimiq: any;
  try {
    Nimiq = await import("@nimiq/core");
  } catch {
    throw new Error("Nimiq core is unavailable on the server");
  }

  const secret = Buffer.from(REWARD_KEY.replace(/^0x/, ""), "hex");
  if (secret.length !== 32) throw new Error("NIMIQ_REWARD_PRIVATE_KEY must be 32 bytes");

  const keyPair = Nimiq.KeyPair.derive(secret);
  const sender = keyPair.toAddress();
  const recipientAddress = Nimiq.Address.fromUserFriendlyAddress(recipient);

  // Current head height + network id from the RPC node.
  const headHeight = (await rpc("getBlockNumber", [])) as number;
  const networkId = (await rpc("getNetworkId", [])) as number ?? NETWORK_ID;

  const tx = Nimiq.TransactionBuilder.newBasic(
    sender,
    recipientAddress,
    BigInt(amountNim) * LUNA_PER_NIM,
    0n, // fee in luna; 0 is valid for most transactions
    headHeight,
    networkId,
  );
  tx.sign(keyPair);

  const raw = (tx as any).serialize().toHex();
  const hash = (await rpc("sendRawTransaction", [raw])) as string;
  return hash;
}