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
import { getSession, getStoredSession, signInWithNimiq, signOut } from "@/lib/auth-client";

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
  connectIdentity: () => Promise<{ state: WalletState; authenticated: boolean }>;
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
// Set when the user explicitly signs out so we don't re-prompt on next open.
const AUTO_SKIP_KEY = "triply-skip-auth";

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
  const [state, setState] = useState<WalletState>(() => {
    const local = loadState();
    const session = getStoredSession();
    if (session.authenticated && session.address) {
      return {
        ...local,
        connected: true,
        nimiqAddress: session.address,
        source: "Nimiq Pay",
      };
    }
    return local;
  });
  const [authState, setAuthState] = useState<AuthState>(() => {
    const session = getStoredSession();
    return session.authenticated ? "authenticated" : "idle";
  });
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

  const runSignIn = useCallback(async (address: string): Promise<boolean> => {
    const sign = signerRef.current;
    if (!sign) {
      setAuthState("unauthenticated");
      return false;
    }
    const existing = await getSession();
    if (existing.authenticated && existing.address === address) {
      setAuthState("authenticated");
      return true;
    }
    setAuthState("authenticating");
    const ok = await signInWithNimiq(address, sign);
    setAuthState(ok ? "authenticated" : "unauthenticated");
    return ok;
  }, []);

  const connectIdentity = useCallback(async (): Promise<{
    state: WalletState;
    authenticated: boolean;
  }> => {
    const identity = await connectNimiqIdentity();
    if (!identity) {
      setAuthState("unauthenticated");
      return { state: { connected: false }, authenticated: false };
    }
    signerRef.current = identity.sign;
    try {
      localStorage.removeItem(AUTO_SKIP_KEY);
    } catch {}
    const next: WalletState = {
      ...loadState(),
      connected: true,
      nimiqAddress: identity.address,
      source: "Nimiq Pay",
    };
    setState(next);
    const authenticated = await runSignIn(identity.address);
    return { state: next, authenticated };
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
    try {
      localStorage.setItem(AUTO_SKIP_KEY, "1");
    } catch {}
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

  // Auto-connect the Nimiq identity and authenticate on app open. Inside
  // Nimiq Pay this resolves the signer and reuses an existing JWT session
  // (no signature prompt) or completes a fresh sign-in. Skipped when the user
  // explicitly signed out, and a no-op in a plain browser (no Nimiq provider).
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    (async () => {
      try {
        if (localStorage.getItem(AUTO_SKIP_KEY) === "1") return;
      } catch {}
      const identity = await connectNimiqIdentity();
      if (cancelled || !identity) return;
      signerRef.current = identity.sign;
      setState((s) => ({
        ...s,
        connected: true,
        nimiqAddress: identity.address,
        source: "Nimiq Pay",
      }));
      await runSignIn(identity.address);
    })();
    return () => {
      cancelled = true;
    };
  }, [runSignIn]);

  return (
    <WalletContext.Provider
      value={{ state, authState, connectIdentity, connectEvm, disconnect, pay }}
    >
      {children}
    </WalletContext.Provider>
  );
}