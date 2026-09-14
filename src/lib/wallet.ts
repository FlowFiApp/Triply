"use client";

import { treasuryAddress } from "@/lib/config";

export type ChainId = "polygon";

export type ChainConfig = {
  id: ChainId;
  name: string;
  label: string;
  evm: boolean;
  chainIdHex?: string;
  usdt?: string;
  decimals?: number;
  explorer?: string;
  rpc?: string;
  nativeCurrency?: { name: string; symbol: string; decimals: number };
};

// USDT on Polygon mainnet. This is the only payment network the app supports.
export const CHAINS: Record<ChainId, ChainConfig> = {
  polygon: {
    id: "polygon",
    name: "Polygon Network",
    label: "Polygon",
    evm: true,
    chainIdHex: "0x89",
    usdt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    decimals: 6,
    explorer: "https://polygonscan.com",
    rpc: "https://polygon-bor-rpc.publicnode.com",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
  },
};

export type Eip1193 = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: Eip1193;
  }
}

export function getEvmProvider(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

// keccak256("transfer(address,uint256)")
const TRANSFER_SELECTOR = "0xa9059cbb";
// keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
// keccak256("balanceOf(address)")
const BALANCE_SELECTOR = "0x70a08231";

export function encodeUsdtTransfer(to: string, amount: number, decimals = 6) {
  const value = BigInt(Math.round(amount * 10 ** decimals));
  const addr = to.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const amt = value.toString(16).padStart(64, "0");
  return `${TRANSFER_SELECTOR}${addr}${amt}`;
}

export function encodeBalanceOf(address: string) {
  const addr = address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  return `${BALANCE_SELECTOR}${addr}`;
}

function parseHexAmount(hex: string): bigint {
  try {
    return BigInt(hex);
  } catch {
    return 0n;
  }
}

function padded(address: string): string {
  return "0x" + address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

async function switchToChain(provider: Eip1193, chain: ChainConfig) {
  if (!chain.chainIdHex) throw new Error("Chain not configured");
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chain.chainIdHex }],
    });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chain.chainIdHex,
            chainName: chain.name,
            rpcUrls: chain.rpc ? [chain.rpc] : [],
            nativeCurrency: chain.nativeCurrency,
            blockExplorerUrls: chain.explorer ? [chain.explorer] : [],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export type ConnectedWallet = {
  nimiqAddress?: string;
  evmAddress?: string;
  source: string;
};

export async function connectWallet(): Promise<ConnectedWallet> {
  let nimiqAddress: string | undefined;
  try {
    const mod = await import("@nimiq/mini-app-sdk");
    const nimiq = await Promise.race([
      mod.init({ timeout: 4000 }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("nimiq-timeout")), 4500),
      ),
    ]);
    const accounts = (await nimiq.listAccounts()) as string[];
    if (Array.isArray(accounts) && accounts.length) {
      nimiqAddress = accounts[0];
    }
  } catch {
    // Not running inside Nimiq Pay — the Nimiq identity is unavailable.
  }

  const provider = getEvmProvider();
  let evmAddress: string | undefined;
  if (provider) {
    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (Array.isArray(accounts) && accounts.length) evmAddress = accounts[0];
    } catch {
      // user denied or no EVM accounts
    }
  }

  if (!nimiqAddress && !evmAddress) {
    throw new Error("No wallet available. Open Triply inside Nimiq Pay.");
  }
  return {
    nimiqAddress,
    evmAddress,
    source: nimiqAddress ? "Nimiq Pay" : "Injected Wallet",
  };
}

export type PaymentResult = {
  hash: string;
  explorerUrl: string;
  chain: ChainId;
};

export async function payUsdt({
  from,
  amount,
}: {
  from: string;
  amount: number;
}): Promise<PaymentResult> {
  const chain = CHAINS.polygon;
  const provider = getEvmProvider();
  if (!provider) throw new Error("No Ethereum provider available.");
  if (!chain.usdt || !chain.decimals) throw new Error("USDT not configured.");

  const treasury = treasuryAddress();
  await switchToChain(provider, chain);

  // Confirm we are on Polygon.
  const chainId = (await provider.request({ method: "eth_chainId" })) as string;
  if (chainId.toLowerCase() !== chain.chainIdHex!.toLowerCase()) {
    throw new Error(`Wrong network: expected ${chain.name}.`);
  }

  // Check the user has enough USDT.
  const balance = (await provider.request({
    method: "eth_call",
    params: [{ to: chain.usdt, data: encodeBalanceOf(from) }, "latest"],
  })) as string;
  const balanceBig = parseHexAmount(balance);
  const needed = BigInt(Math.round(amount * 10 ** chain.decimals));
  if (balanceBig < needed) {
    throw new Error(`Insufficient USDT balance on ${chain.name}.`);
  }

  const data = encodeUsdtTransfer(treasury, amount, chain.decimals);
  const gas = (await provider.request({
    method: "eth_estimateGas",
    params: [{ from, to: chain.usdt, data, value: "0x0" }],
  })) as string;

  const hash = (await provider.request({
    method: "eth_sendTransaction",
    params: [{ from, to: chain.usdt, data, value: "0x0", gas }],
  })) as string;

  // Wait for the receipt and confirm the Transfer hit the treasury.
  type Receipt = {
    status?: string;
    logs?: Array<{ address: string; topics: string[] }>;
  };
  let receipt: Receipt | null = null;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = (await provider.request({
      method: "eth_getTransactionReceipt",
      params: [hash],
    })) as Receipt | null;
    if (res) {
      receipt = res;
      break;
    }
  }
  if (!receipt) throw new Error("Transaction not confirmed in time.");
  if (receipt.status !== "0x1") throw new Error("Transaction failed on-chain.");

  const hitTreasury = (receipt.logs ?? []).some(
    (log) =>
      log.address?.toLowerCase() === chain.usdt!.toLowerCase() &&
      log.topics?.[0]?.toLowerCase() === TRANSFER_TOPIC &&
      log.topics?.[2]?.toLowerCase() === padded(treasury),
  );
  if (!hitTreasury) throw new Error("Payment did not reach the treasury.");

  return {
    hash,
    explorerUrl: `${chain.explorer}/tx/${hash}`,
    chain: chain.id,
  };
}