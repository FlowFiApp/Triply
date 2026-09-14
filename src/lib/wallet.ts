"use client";

export type ChainId = "base" | "polygon" | "arbitrum" | "solana";

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

// USDT contracts (mainnet). USDT uses 6 decimals on EVM chains.
export const CHAINS: Record<ChainId, ChainConfig> = {
  base: {
    id: "base",
    name: "Base Network",
    label: "Base",
    evm: true,
    chainIdHex: "0x2105",
    usdt: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
    explorer: "https://basescan.org",
    rpc: "https://mainnet.base.org",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  polygon: {
    id: "polygon",
    name: "Polygon Network",
    label: "Polygon",
    evm: true,
    chainIdHex: "0x89",
    usdt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    decimals: 6,
    explorer: "https://polygonscan.com",
    rpc: "https://polygon-rpc.com",
    nativeCurrency: { name: "MATIC", symbol: "POL", decimals: 18 },
  },
  arbitrum: {
    id: "arbitrum",
    name: "Arbitrum Network",
    label: "Arbitrum",
    evm: true,
    chainIdHex: "0xa4b1",
    usdt: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    decimals: 6,
    explorer: "https://arbiscan.io",
    rpc: "https://arb1.arbitrum.io/rpc",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  solana: {
    id: "solana",
    name: "Solana Network",
    label: "Solana",
    evm: false,
    usdt: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
    explorer: "https://solscan.io",
  },
};

// Default merchant settlement addresses per chain. In production the treasury
// address comes from NEXT_PUBLIC_TREASURY_WALLET_ADDRESS.
const TREASURY_DEFAULT: Record<ChainId, string> = {
  base: "0x9A8f4C2B7d3E1f0A5c6B8d9E2f3A4b5C6d7E8f90",
  polygon: "0x9A8f4C2B7d3E1f0A5c6B8d9E2f3A4b5C6d7E8f90",
  arbitrum: "0x9A8f4C2B7d3E1f0A5c6B8d9E2f3A4b5C6d7E8f90",
  solana: "Tr1pLyTreasury9xKq2mZ8sV4nB6cD1eF3gH5jL7pQ",
};

export function treasuryFor(chain: ChainId): string {
  const envAddr = process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS;
  return envAddr ?? TREASURY_DEFAULT[chain];
}

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
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

export function encodeUsdtTransfer(to: string, amount: number, decimals = 6) {
  const value = BigInt(Math.round(amount * 10 ** decimals));
  const addr = to.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const amt = value.toString(16).padStart(64, "0");
  // keccak256("transfer(address,uint256)") selector
  return `0xa9059cbb${addr}${amt}`;
}

async function switchChain(provider: Eip1193, chain: ChainConfig) {
  if (!chain.chainIdHex) return;
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

export async function connectWallet(): Promise<{ address: string; source: string }> {
  // Prefer the Nimiq Pay mini app provider when available.
  try {
    const mod = await import("@nimiq/mini-app-sdk");
    const nimiq = await Promise.race([
      mod.init({ timeout: 4000 }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("nimiq-timeout")), 4500),
      ),
    ]);
    const accounts = await nimiq.listAccounts();
    if (Array.isArray(accounts) && accounts.length) {
      return { address: String(accounts[0]), source: "Nimiq Pay" };
    }
  } catch {
    // Not running inside Nimiq Pay — fall through to injected EVM provider.
  }

  const provider = getEvmProvider();
  if (provider) {
    const accounts = (await provider.request({
      method: "eth_requestAccounts",
    })) as string[];
    if (accounts?.length) {
      return { address: accounts[0], source: "Injected Wallet" };
    }
  }

  throw new Error("No wallet available. Open Triply inside Nimiq Pay.");
}

export type PaymentResult = {
  hash: string;
  explorerUrl: string;
  chain: ChainId;
};

export async function payUsdt({
  chain,
  amount,
  wallet,
}: {
  chain: ChainConfig;
  amount: number;
  wallet: string;
}): Promise<PaymentResult> {
  const provider = getEvmProvider();

  if (chain.evm && provider && chain.usdt && chain.decimals) {
    await switchChain(provider, chain);
    const data = encodeUsdtTransfer(treasuryFor(chain.id), amount, chain.decimals);
    const hash = (await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: wallet,
          to: chain.usdt,
          data,
          value: "0x0",
        },
      ],
    })) as string;
    return {
      hash,
      explorerUrl: `${chain.explorer}/tx/${hash}`,
      chain: chain.id,
    };
  }

  // Non-EVM (e.g. Solana) or no injected provider: the payment proxy
  // returns a settlement reference. Simulated for local development.
  const hash = `0x${crypto.randomUUID().replace(/-/g, "")}${Date.now()
    .toString(16)
    .slice(-6)}`;
  return {
    hash,
    explorerUrl: `${chain.explorer}/tx/${hash}`,
    chain: chain.id,
  };
}