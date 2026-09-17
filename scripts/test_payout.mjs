#!/usr/bin/env node
/**
 * Debug script for the Nimiq reward payout. Mirrors src/lib/nimiq-payout.ts
 * (sendNimReward) using raw calls so it can run standalone and print FULL
 * errors / transaction details.
 *
 * Usage:
 *   node scripts/test_payout.mjs [recipient] [amountNim]
 *   node scripts/test_payout.mjs "NQ04 SYEJ NDDA 8LSJ 11PF 553D 5P8X 3XSX NT21" 10
 *
 * Reads NIMIQ_REWARD_MNEMONIC, NIMIQ_RPC_URL and NIMIQ_NETWORK from env or .env.local.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const [recipientRaw = "NQ04 SYEJ NDDA 8LSJ 11PF 553D 5P8X 3XSX NT21", amountRaw = "10"] =
  process.argv.slice(2);
const amountNim = Number(amountRaw);

// --- env ----------------------------------------------------------------
const env = { ...process.env };
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const MNEMONIC = env.NIMIQ_REWARD_MNEMONIC;
const RPC_URL = env.NIMIQ_RPC_URL;
const NETWORK_IDS = { mainalbatross: 24, testalbatross: 5, devalbatross: 1 };
const NETWORK_ID =
  NETWORK_IDS[String(env.NIMIQ_NETWORK ?? "").trim().toLowerCase()] ?? 24;
const LUNA_PER_NIM = 100_000n;
const TX_LOOKUP_ATTEMPTS = 20;
const TX_LOOKUP_DELAY_MS = 1500;

if (!MNEMONIC) {
  console.error("NIMIQ_REWARD_MNEMONIC not found (env or .env.local).");
  process.exit(1);
}
if (!RPC_URL) {
  console.error("NIMIQ_RPC_URL not found (env or .env.local).");
  process.exit(1);
}

// --- helpers -------------------------------------------------------------
async function rpc(method, params) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Nimiq RPC error ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? "Nimiq RPC error");
  let result = json.result;
  if (result && typeof result === "object" && "data" in result) {
    result = result.data;
  }
  return result;
}

function bytesToHex(bytes) {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function normalizeTxHash(raw) {
  let h = String(raw ?? "").trim();
  if (h.startsWith("0x") || h.startsWith("0X")) h = h.slice(2);
  if (/^[0-9a-fA-F]+$/.test(h) && h.length % 2 === 0) return h.toLowerCase();
  return h;
}

function decodeMemo(raw) {
  if (raw == null) return "";
  if (typeof raw === "string") {
    const s = raw.trim();
    if (/^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0) {
      try {
        const bytes = new Uint8Array(s.length / 2);
        for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
        return new TextDecoder().decode(bytes);
      } catch {
        return s;
      }
    }
    return s;
  }
  return String(raw);
}

function pickAddress(raw) {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "address" in raw) return String(raw.address ?? "");
  return "";
}

function readChainTx(raw) {
  if (!raw || typeof raw !== "object") return null;
  let rec = raw;
  const nested = rec.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const inner = nested;
    if (inner.to != null || inner.toAddress != null || inner.to_address != null || inner.recipient != null || inner.from != null) {
      rec = inner;
    }
  }
  const to = pickAddress(rec.to_address ?? rec.toAddress ?? rec.to ?? rec.recipient);
  if (!to) return null;
  const from = pickAddress(rec.from_address ?? rec.fromAddress ?? rec.from ?? rec.sender);
  return {
    from,
    to,
    valueLuna: Number(rec.value ?? rec.amount ?? 0),
    memo: decodeMemo(rec.recipientData ?? rec.recipient_data ?? rec.data ?? rec.extraData ?? rec.message ?? ""),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rpcLookup(method, hash) {
  try {
    return readChainTx(await rpc(method, [hash]));
  } catch {
    return null;
  }
}

async function fetchTx(hash) {
  const lookupHash = normalizeTxHash(hash);
  for (let i = 0; i < TX_LOOKUP_ATTEMPTS; i++) {
    const mined = await rpcLookup("getTransactionByHash", lookupHash);
    if (mined) return { tx: mined, state: "mined" };
    const pooled = await rpcLookup("getTransactionFromMempool", lookupHash);
    if (pooled) return { tx: pooled, state: "mempool" };
    if (i < TX_LOOKUP_ATTEMPTS - 1) await sleep(TX_LOOKUP_DELAY_MS);
  }
  return null;
}

async function getSenderBalanceLuna(sender) {
  for (const [m, field] of [
    ["getAccountByAddress", "balance"],
    ["getBalanceByAddress", null],
    ["getAccount", "balance"],
  ]) {
    try {
      const acc = await rpc(m, [sender]);
      if (m === "getBalanceByAddress") {
        if (acc != null) return Number(acc);
      } else if (acc && typeof acc === "object" && acc[field] != null) {
        return Number(acc[field]);
      }
    } catch {
      // fall through
    }
  }
  return null;
}

// --- main ---------------------------------------------------------------
const Nimiq = await import("@nimiq/core");
console.log("recipient:", recipientRaw.trim());
console.log("amount:", amountNim, "NIM", "=", (amountNim * Number(LUNA_PER_NIM)).toLocaleString(), "luna");
console.log("rpc:", RPC_URL);
console.log("network default:", NETWORK_ID);

const recipient = recipientRaw.replace(/\s+/g, "").toUpperCase();
const toUserFriendly = Nimiq.Address.fromAny(recipient).toUserFriendlyAddress();
console.log("normalized recipient:", toUserFriendly);

const mnemonic = MNEMONIC.trim();
const seed = Nimiq.MnemonicUtils.mnemonicToSeed(mnemonic);
const account = Nimiq.ExtendedPrivateKey.derivePathFromSeed("m/44'/242'/0'/0'", seed);
const privateKeyBytes = account.serialize().subarray(0, 32);
const keyPair = Nimiq.KeyPair.derive(new Nimiq.PrivateKey(privateKeyBytes));
const sender = keyPair.toAddress();
console.log("sender (reward wallet):", sender.toUserFriendlyAddress());

const senderBalanceLuna = await getSenderBalanceLuna(sender);
console.log("sender balance (luna):", senderBalanceLuna, senderBalanceLuna != null ? `≈ ${(senderBalanceLuna / Number(LUNA_PER_NIM)).toFixed(4)} NIM` : "(unknown)");

const value = BigInt(Math.round(amountNim * Number(LUNA_PER_NIM)));
if (senderBalanceLuna != null && senderBalanceLuna < Number(value)) {
  console.error("FATAL: sender balance is below the requested amount.");
  process.exit(1);
}

let headHeight;
try {
  headHeight = await rpc("getBlockNumber", []);
  console.log("head height:", headHeight);
} catch (e) {
  console.error("FATAL: could not get block height:", e.message);
  process.exit(1);
}

let networkId = NETWORK_ID;
try {
  const n = await rpc("getNetworkId", []);
  if (n != null) networkId = Number(n);
} catch {
  // keep default
}
console.log("network id used:", networkId);

const recipientAddress = Nimiq.Address.fromUserFriendlyAddress(toUserFriendly);
const memo = "You earned some Triply points";
const data = new TextEncoder().encode(memo).slice(0, 64);

const tx = Nimiq.TransactionBuilder.newBasicWithData(
  sender,
  recipientAddress,
  data,
  value,
  0n,
  headHeight,
  networkId,
);
tx.sign(keyPair);
const raw = bytesToHex(tx.serialize());
console.log("raw tx bytes:", raw.length, "hex chars");

let submitted;
try {
  submitted = await rpc("sendRawTransaction", [raw]);
  console.log("sendRawTransaction result:", JSON.stringify(submitted));
} catch (e) {
  console.error("FATAL: sendRawTransaction failed:", e.message);
  process.exit(1);
}

const hash = typeof submitted === "string" && submitted ? submitted : bytesToHex(tx.hash());
console.log("tx hash:", hash);

const seen = await fetchTx(hash);
if (seen) {
  console.log("confirmed by node:", seen.state);
  console.log("  from:", seen.tx.from);
  console.log("  to:", seen.tx.to);
  console.log("  value luna:", seen.tx.valueLuna, `≈ ${(seen.tx.valueLuna / Number(LUNA_PER_NIM)).toFixed(2)} NIM`);
  console.log("  memo:", seen.tx.memo);
  console.log("\nSUCCESS — transaction seen on the network.");
} else {
  console.error(`\nNOT CONFIRMED: tx not found on the node after ${TX_LOOKUP_ATTEMPTS} attempts.`);
  console.error("Check the RPC node / network and look up the hash manually.");
  process.exit(1);
}