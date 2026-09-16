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
  // If wallet was connected but JWT expired, auto-prompt re-authentication.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getSession();
      if (cancelled) return;

      if (session.authenticated && session.address) {
        setState((s) => ({
          ...s,
          connected: true,
          nimiqAddress: session.address ?? undefined,
          source: "Nimiq Pay",
        }));
        setAuthState("authenticated");
        return;
      }

      // Session invalid — check if wallet was previously connected.
      const local = loadState();
      if (!local.connected || !local.nimiqAddress) return;

      // Wallet connected but JWT expired/missing → prompt re-authentication.
      setAuthState("authenticating");
      const identity = await connectNimiqIdentity();
      if (cancelled) return;

      if (identity) {
        signerRef.current = identity.sign;
        setState((s) => ({
          ...s,
          connected: true,
          nimiqAddress: identity.address,
          source: "Nimiq Pay",
        }));
        await runSignIn(identity.address);
      } else {
        setAuthState("unauthenticated");
      }
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