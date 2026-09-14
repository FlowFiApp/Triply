"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { connectWallet, payUsdt, CHAINS, type ChainId } from "@/lib/wallet";
import type { PaymentResult } from "@/lib/wallet";

export type WalletState = {
  connected: boolean;
  address?: string;
  source?: string;
  chain?: ChainId;
};

type WalletContextValue = {
  state: WalletState;
  connect: (chain?: ChainId) => Promise<WalletState>;
  disconnect: () => void;
  pay: (amount: number, chain?: ChainId) => Promise<PaymentResult>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function useWalletState() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWalletState must be used within WalletProvider");
  return ctx;
}

const STORAGE_KEY = "triply-wallet";

function loadState(): WalletState {
  if (typeof window === "undefined") return { connected: false };
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") ?? {
      connected: false,
    };
  } catch {
    return { connected: false };
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(() => loadState());

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const connect = useCallback(async (chain?: ChainId) => {
    const { address, source } = await connectWallet();
    const next: WalletState = { connected: true, address, source, chain: chain ?? "base" };
    setState(next);
    return next;
  }, []);

  const disconnect = useCallback(() => {
    setState({ connected: false });
  }, []);

  const pay = useCallback(
    async (amount: number, chain?: ChainId) => {
      const c = CHAINS[chain ?? state.chain ?? "base"];
      if (!state.address) throw new Error("No wallet connected");
      const result = await payUsdt({ chain: c, amount, wallet: state.address });
      setState((s) => ({ ...s, chain: result.chain }));
      return result;
    },
    [state.address, state.chain],
  );

  return (
    <WalletContext.Provider value={{ state, connect, disconnect, pay }}>
      {children}
    </WalletContext.Provider>
  );
}