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
  nimiqAddress?: string;
  evmAddress?: string;
  source?: string;
  chain?: ChainId;
};

type WalletContextValue = {
  state: WalletState;
  connect: () => Promise<WalletState>;
  disconnect: () => void;
  pay: (amount: number) => Promise<PaymentResult>;
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

  const connect = useCallback(async () => {
    const { nimiqAddress, evmAddress, source } = await connectWallet();
    const next: WalletState = {
      connected: true,
      nimiqAddress,
      evmAddress,
      source,
      chain: "polygon",
    };
    setState(next);
    return next;
  }, []);

  const disconnect = useCallback(() => {
    setState({ connected: false });
  }, []);

  const pay = useCallback(
    async (amount: number) => {
      if (!state.evmAddress) {
        throw new Error(
          "No Ethereum account connected. Connect a wallet that supports Polygon.",
        );
      }
      const result = await payUsdt({ from: state.evmAddress, amount });
      setState((s) => ({ ...s, chain: result.chain }));
      return result;
    },
    [state.evmAddress],
  );

  return (
    <WalletContext.Provider value={{ state, connect, disconnect, pay }}>
      {children}
    </WalletContext.Provider>
  );
}