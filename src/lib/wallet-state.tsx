"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  connectEvmWallet,
  connectNimiqIdentity,
  payUsdt,
  type ChainId,
  type NimiqSigner,
} from "@/lib/wallet";
import type { PaymentResult } from "@/lib/wallet";
import { getSession, signInWithNimiq, signOut } from "@/lib/auth-client";

export type WalletState = {
  connected: boolean;
  nimiqAddress?: string;
  evmAddress?: string;
  source?: string;
  chain?: ChainId;
};

export type AuthState =
  | "idle"
  | "authenticating"
  | "authenticated"
  | "unauthenticated";

type WalletContextValue = {
  state: WalletState;
  authState: AuthState;
  connectIdentity: () => Promise<WalletState>;
  connectEvm: () => Promise<string | undefined>;
  disconnect: () => void;
  pay: (amount: number, from?: string) => Promise<PaymentResult>;
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
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!stored || typeof stored !== "object") return { connected: false };
    // The EVM address is session-scoped: it is only requested at checkout.
    return { ...stored, evmAddress: undefined };
  } catch {
    return { connected: false };
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(() => loadState());
  const [authState, setAuthState] = useState<AuthState>("idle");
  const signerRef = useRef<NimiqSigner | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        connected: state.connected,
        nimiqAddress: state.nimiqAddress,
        source: state.source,
        chain: state.chain,
      }),
    );
  }, [state]);

  const runSignIn = useCallback(async (address: string) => {
    const sign = signerRef.current;
    if (!sign) {
      setAuthState("unauthenticated");
      return;
    }
    const existing = await getSession();
    if (existing.authenticated && existing.address === address) {
      setAuthState("authenticated");
      return;
    }
    setAuthState("authenticating");
    const ok = await signInWithNimiq(address, sign);
    setAuthState(ok ? "authenticated" : "unauthenticated");
  }, []);

  const connectIdentity = useCallback(async (): Promise<WalletState> => {
    const identity = await connectNimiqIdentity();
    if (!identity) {
      setAuthState("unauthenticated");
      return { connected: false };
    }
    signerRef.current = identity.sign;
    const next: WalletState = {
      ...loadState(),
      connected: true,
      nimiqAddress: identity.address,
      source: "Nimiq Pay",
    };
    setState(next);
    await runSignIn(identity.address);
    return next;
  }, [runSignIn]);

  const connectEvm = useCallback(async () => {
    const evmAddress = await connectEvmWallet();
    if (evmAddress) {
      setState((s) => ({ ...s, evmAddress, chain: "polygon" }));
    }
    return evmAddress;
  }, []);

  const disconnect = useCallback(() => {
    signerRef.current = null;
    setState({ connected: false });
    setAuthState("unauthenticated");
    void signOut();
  }, []);

  const pay = useCallback(
    async (amount: number, from?: string) => {
      const payer = from ?? state.evmAddress;
      if (!payer) {
        throw new Error(
          "No Ethereum account connected. Connect a wallet that supports Polygon.",
        );
      }
      const result = await payUsdt({ from: payer, amount });
      setState((s) => ({ ...s, evmAddress: payer, chain: result.chain }));
      return result;
    },
    [state.evmAddress],
  );

  // No auto-connect: the app is fully browsable without a wallet. The Nimiq
  // identity is only requested when the user explicitly signs in (Profile) or
  // performs an action that needs it (posting, redeeming, booking).
  // Silently restore an existing JWT session on open — no wallet prompt.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getSession();
      if (cancelled || !session.authenticated || !session.address) return;
      setState((s) => ({
        ...s,
        connected: true,
        nimiqAddress: session.address ?? undefined,
        source: "Nimiq Pay",
      }));
      setAuthState("authenticated");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WalletContext.Provider
      value={{ state, authState, connectIdentity, connectEvm, disconnect, pay }}
    >
      {children}
    </WalletContext.Provider>
  );
}