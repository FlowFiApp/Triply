import fs from "node:fs";

const env = fs.readFileSync("C:/Users/devar/Documents/triply/.env.local", "utf8");
const mnemonic = env.match(/^NIMIQ_REWARD_MNEMONIC=(.*)$/m)?.[1]?.trim();
const rpcUrl = env.match(/^NIMIQ_RPC_URL=(.*)$/m)?.[1]?.trim();
const AMOUNT_NIM = 0.2;

if (!mnemonic || !rpcUrl) {
  console.log("missing env");
  process.exit(1);
}

const Nimiq = await import("@nimiq/core");
const seed = Nimiq.MnemonicUtils.mnemonicToSeed(mnemonic);
const account = Nimiq.ExtendedPrivateKey.derivePathFromSeed("m/44'/242'/0'/0'", seed);
const keyPair = Nimiq.KeyPair.derive(new Nimiq.PrivateKey(account.serialize().subarray(0, 32)));
const sender = keyPair.toAddress();
const recipient = sender;
console.log("sender (self):", sender.toUserFriendlyAddress());

async function rpc(method, params) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message ?? JSON.stringify(j.error));
  let result = j.result;
  if (result && typeof result === "object" && "data" in result) result = result.data;
  return result;
}

const headHeight = Number(await rpc("getBlockNumber", []));
const networkId = 24; // mainalbatross (mainnet)
console.log("balance:", await rpc("getAccountByAddress", ["NQ41 KTAT JXA8 4AQG QU8Y 3BF1 RQ84 DU9T 2YQP"]));
const value = BigInt(Math.round(AMOUNT_NIM * 100000)); // luna
console.log("value(luna):", value.toString(), "head:", headHeight, "net:", networkId);

const memo = "You earned some Triply points";
const data = new TextEncoder().encode(memo).slice(0, 64);
const tx = Nimiq.TransactionBuilder.newBasicWithData(sender, recipient, data, value, 0n, headHeight, networkId);
tx.sign(keyPair);

const raw = Array.from(tx.serialize()).map((b) => b.toString(16).padStart(2, "0")).join("");
console.log("broadcasting...");
let hash;
try {
  hash = await rpc("sendRawTransaction", [raw]);
  console.log("TX HASH:", hash);
} catch (e) {
  console.log("BROADCAST ERROR:", e.message);
  process.exit(1);
}

for (let i = 0; i < 10; i++) {
  await new Promise((r) => setTimeout(r, 1500));
  try {
    const mined = await rpc("getTransactionByHash", [hash]);
    if (mined) {
      console.log("MINED:", JSON.stringify(mined).slice(0, 200));
      process.exit(0);
    }
    const pooled = await rpc("getTransactionFromMempool", [hash]);
    if (pooled) {
      console.log("IN MEMPOOL (pending):", JSON.stringify(pooled).slice(0, 200));
      process.exit(0);
    }
  } catch {
    // keep polling
  }
}
console.log("SEEN broadcast but not yet mined; hash:", hash);