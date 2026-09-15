import "server-only";

/* eslint-disable @typescript-eslint/no-explicit-any */

const REWARD_MNEMONIC = process.env.NIMIQ_REWARD_MNEMONIC;
const RPC_URL = process.env.NIMIQ_RPC_URL;
const LUNA_PER_NIM = 100_000n;
// Nimiq network IDs (from @nimiq/core): mainnet Albatross is 24, test 5, dev 1.
const NETWORK_IDS: Record<string, number> = {
  mainalbatross: 24,
  testalbatross: 5,
  devalbatross: 1,
};
const NETWORK_ID =
  NETWORK_IDS[String(process.env.NIMIQ_NETWORK ?? "").trim().toLowerCase()] ?? 24;
const TX_LOOKUP_ATTEMPTS = 10;
const TX_LOOKUP_DELAY_MS = 1500;

function rewardConfigured(): boolean {
  return Boolean(REWARD_MNEMONIC);
}

async function loadRewardKeyPair(Nimiq: any): Promise<{ keyPair: any; sender: string }> {
  if (!REWARD_MNEMONIC) {
    throw new Error("NIMIQ_REWARD_MNEMONIC is not configured");
  }
  const mnemonic = REWARD_MNEMONIC.trim();
  const seed = Nimiq.MnemonicUtils.mnemonicToSeed(mnemonic);
  // BIP44 path for Nimiq (coin type 242), account 0 — matches Nimiq Pay.
  const account = Nimiq.ExtendedPrivateKey.derivePathFromSeed("m/44'/242'/0'/0'", seed);
  const privateKeyBytes = account.serialize().subarray(0, 32);
  const keyPair = Nimiq.KeyPair.derive(new Nimiq.PrivateKey(privateKeyBytes));
  return { keyPair, sender: keyPair.toAddress().toUserFriendlyAddress() };
}

export type NimiqTx = {
  from: string;
  to: string;
  valueLuna: number;
  memo: string;
};

export type NimiqSendResult = {
  hash: string;
  confirmed: boolean; // seen by the node (mined or in the mempool)
};

async function rpc(method: string, params: unknown[]): Promise<any> {
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
  // NimiqWatch wraps results as { data, metadata } — unwrap to the real value.
  let result = json.result;
  if (result && typeof result === "object" && "data" in result) {
    result = result.data;
  }
  return result;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export function normalizeTxHash(raw: string): string {
  let h = String(raw ?? "").trim();
  if (h.startsWith("0x") || h.startsWith("0X")) h = h.slice(2);
  if (/^[0-9a-fA-F]+$/.test(h) && h.length % 2 === 0) return h.toLowerCase();
  return h;
}

async function resolveLookupHash(raw: string): Promise<string> {
  const hex = normalizeTxHash(raw);
  if (hex.length === 64) return hex;
  if (hex.length > 64 && /^[0-9a-f]+$/.test(hex)) {
    try {
      const Nimiq = await import("@nimiq/core");
      return normalizeTxHash(Nimiq.Transaction.fromAny(hex).hash());
    } catch {
      return hex;
    }
  }
  return hex;
}

export async function canonicalWallet(addr: string): Promise<string> {
  const compact = String(addr ?? "").trim();
  if (!compact) return "";
  const raw = compact.startsWith("0X") ? compact.slice(2) : compact;
  try {
    const Nimiq = await import("@nimiq/core");
    try {
      return Nimiq.Address.fromAny(raw).toUserFriendlyAddress();
    } catch {
      if (/^[0-9A-F]{64}$/.test(raw)) {
        return Nimiq.PublicKey.fromHex(raw.toLowerCase())
          .toAddress()
          .toUserFriendlyAddress();
      }
      if (/^00[0-9A-F]{64}$/.test(raw)) {
        return Nimiq.PublicKey.fromHex(raw.slice(2).toLowerCase())
          .toAddress()
          .toUserFriendlyAddress();
      }
      return compact;
    }
  } catch {
    return compact;
  }
}

function decodeMemo(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") {
    const s = raw.trim();
    if (/^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0) {
      try {
        const bytes = new Uint8Array(s.length / 2);
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
        }
        return new TextDecoder().decode(bytes);
      } catch {
        return s;
      }
    }
    return s;
  }
  return String(raw);
}

function pickAddress(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "address" in raw) {
    return String((raw as { address: unknown }).address ?? "");
  }
  return "";
}

/**
 * Nimiq RPC / NimiqWatch return transactions with slightly different shapes.
 * NimiqWatch wraps txs as `{ data, metadata }`; Albatross memos live in
 * `recipientData`. This normalizes the common variants.
 */
export function readChainTx(raw: unknown): NimiqTx | null {
  if (!raw || typeof raw !== "object") return null;
  let rec = raw as Record<string, unknown>;
  const nested = rec.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const inner = nested as Record<string, unknown>;
    if (
      inner.to != null ||
      inner.toAddress != null ||
      inner.to_address != null ||
      inner.recipient != null ||
      inner.from != null
    ) {
      rec = inner;
    }
  }
  const to = pickAddress(
    rec.to_address ?? rec.toAddress ?? rec.to ?? rec.recipient,
  );
  if (!to) return null;
  const from = pickAddress(
    rec.from_address ?? rec.fromAddress ?? rec.from ?? rec.sender,
  );
  return {
    from,
    to,
    valueLuna: Number(rec.value ?? rec.amount ?? 0),
    memo: decodeMemo(
      rec.recipientData ??
        rec.recipient_data ??
        rec.data ??
        rec.extraData ??
        rec.message ??
        "",
    ),
  };
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((r) => setTimeout(r, ms));
}

async function rpcLookup(
  method: string,
  hash: string,
): Promise<NimiqTx | null> {
  try {
    return readChainTx(await rpc(method, [hash]));
  } catch {
    return null;
  }
}

export async function fetchTx(hash: string): Promise<NimiqTx | null> {
  const lookupHash = await resolveLookupHash(hash);
  for (let i = 0; i < TX_LOOKUP_ATTEMPTS; i++) {
    const mined = await rpcLookup("getTransactionByHash", lookupHash);
    if (mined) return mined;
    const pooled = await rpcLookup("getTransactionFromMempool", lookupHash);
    if (pooled) return pooled;
    if (i < TX_LOOKUP_ATTEMPTS - 1) await sleep(TX_LOOKUP_DELAY_MS);
  }
  return null;
}

/** Best-effort sender balance (luna). Returns null when the node doesn't expose it. */
export async function getSenderBalanceLuna(
  sender: string,
): Promise<number | null> {
  try {
    const acc = await rpc("getAccountByAddress", [sender]);
    if (acc && typeof acc === "object" && acc.balance != null) {
      return Number(acc.balance);
    }
  } catch {
    // fall through
  }
  try {
    const bal = await rpc("getBalanceByAddress", [sender]);
    if (bal != null) return Number(bal);
  } catch {
    // fall through
  }
  try {
    const acc = await rpc("getAccount", [sender]);
    if (acc && acc.balance != null) return Number(acc.balance);
  } catch {
    // fall through
  }
  return null;
}

/**
 * Sends NIM from the merchant reward wallet to the user's Nimiq address with a
 * traceable memo, then confirms the node has seen it.
 * Requires NIMIQ_REWARD_MNEMONIC (BIP39 phrase) and a Nimiq mainnet RPC.
 */
export async function sendNimReward({
  recipient,
  amountNim,
}: {
  recipient: string;
  amountNim: number;
}): Promise<NimiqSendResult> {
  if (!rewardConfigured())
    throw new Error("NIMIQ_REWARD_MNEMONIC is not configured");

  let Nimiq: any;
  try {
    Nimiq = await import("@nimiq/core");
  } catch {
    throw new Error("Nimiq core is unavailable on the server");
  }

  const toUserFriendly = await canonicalWallet(recipient);
  if (!toUserFriendly) throw new Error("invalid_recipient");

  const { keyPair } = await loadRewardKeyPair(Nimiq);
  const sender = keyPair.toAddress();
  const recipientAddress =
    Nimiq.Address.fromUserFriendlyAddress(toUserFriendly);

  // Supports fractional NIM (e.g. 0.1) by converting to luna precisely.
  const value = BigInt(Math.round(amountNim * Number(LUNA_PER_NIM)));
  const balanceLuna = await getSenderBalanceLuna(sender);
  if (balanceLuna != null && balanceLuna < Number(value)) {
    throw new Error("insufficient_balance");
  }

  const headHeight = (await rpc("getBlockNumber", [])) as number;
  // Some public nodes (NimiqWatch) don't expose getNetworkId; default to mainnet.
  let networkId: number = NETWORK_ID;
  try {
    networkId = ((await rpc("getNetworkId", [])) as number) ?? NETWORK_ID;
  } catch {
    // keep mainnet default
  }

  // Traceable on-chain memo (recipientData), max 64 bytes.
  const memo = "You earned some Triply points";
  const data = new TextEncoder().encode(memo).slice(0, 64);

  const tx = Nimiq.TransactionBuilder.newBasicWithData(
    sender,
    recipientAddress,
    data,
    value,
    0n, // fee in luna; 0 is valid for most transactions
    headHeight,
    networkId,
  );
  tx.sign(keyPair);

  const raw = bytesToHex(tx.serialize());
  // Some proxies return the hash, others don't — fall back to the built tx hash.
  const submitted = (await rpc("sendRawTransaction", [raw])) as string | null;
  const hash =
    typeof submitted === "string" && submitted
      ? submitted
      : bytesToHex(tx.hash());

  // Confirm the node has seen the transaction (mempool or mined).
  let confirmed = false;
  const seen = await fetchTx(hash);
  if (seen) confirmed = true;

  return { hash, confirmed };
}

/**
 * Verifies a Nimiq transaction against the RPC node.
 * Returns the normalized transaction, or null if it cannot be found.
 */
export async function verifyNimTx(opts: {
  txHash: string;
  expectedTo?: string;
  minLuna?: number;
}): Promise<NimiqTx | null> {
  const hash = String(opts.txHash ?? "").trim();
  if (!hash) return null;
  const tx = await fetchTx(hash);
  if (!tx) return null;

  const expectedTo = opts.expectedTo
    ? await canonicalWallet(opts.expectedTo)
    : "";
  if (expectedTo && tx.to && tx.to !== expectedTo) {
    throw new Error("wrong_recipient");
  }
  if (opts.minLuna != null && tx.valueLuna < opts.minLuna) {
    throw new Error("insufficient_amount");
  }
  return tx;
}

/** Canonical user-friendly address of the reward wallet, if configured. */
export async function rewardSenderAddress(): Promise<string> {
  if (!rewardConfigured()) return "";
  try {
    const Nimiq = await import("@nimiq/core");
    const { sender } = await loadRewardKeyPair(Nimiq);
    return sender;
  } catch {
    return "";
  }
}
