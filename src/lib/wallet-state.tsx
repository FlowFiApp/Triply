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
import {
  getSession,
  getStoredSession,
  restoreStoredSession,
  signInWithNimiq,
  signOut,
} from "@/lib/auth-client";
import { setStoredIdentity } from "@/lib/identity";

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

// Wallet addresses (Nimiq + EVM) are persisted so the app can auto-reconnect.
const STORAGE_KEY = "triply-wallet";
const ONBOARDED_KEY = "triply-onboarded";
// Set when the user explicitly signs out so we don't re-prompt on next open.
const AUTO_SKIP_KEY = "triply-skip-auth";

function loadState(): WalletState {
  if (typeof window === "undefined") return { connected: false };
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!stored || typeof stored !== "object") return { connected: false };
    return {
      connected: Boolean(stored.connected || stored.nimiqAddress),
      nimiqAddress: stored.nimiqAddress,
      evmAddress: stored.evmAddress,
      source: stored.source,
      chain: stored.chain,
    };
  } catch {
    return { connected: false };
  }
}

function onboardedFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return false;
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(() => {
    const stored = loadState();
    const session = getStoredSession();
    if (session.authenticated && session.address) {
      return { ...stored, connected: true, nimiqAddress: session.address };
    }
    return stored;
  });
  const [authState, setAuthState] = useState<AuthState>(() =>
    getStoredSession().authenticated ? "authenticated" : "idle",
  );
  const [onboarded, setOnboarded] = useState(onboardedFlag);
  const signerRef = useRef<NimiqSigner | null>(null);

  // Persist the connected addresses for auto-reconnect.
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        connected: state.connected,
        nimiqAddress: state.nimiqAddress,
        evmAddress: state.evmAddress,
        source: state.source,
        chain: state.chain,
      }),
    );
  }, [state]);

  // Keep the in-memory identity in sync with the connected wallet.
  useEffect(() => {
    setStoredIdentity({
      nimiqAddress: state.nimiqAddress,
      evmAddress: state.evmAddress,
    });
  }, [state.nimiqAddress, state.evmAddress]);

  // Re-check the onboarding flag when it flips (Onboarding dispatches an event).
  useEffect(() => {
    const check = () => setOnboarded(onboardedFlag());
    check();
    window.addEventListener(ONBOARDED_KEY, check);
    return () => window.removeEventListener(ONBOARDED_KEY, check);
  }, []);

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

  // Auto-reconnect after onboarding: rehydrate the persisted addresses and
// restore the session cookie from the persisted JWT. Never prompts for a
// wallet connection on load — connections are made on user action only.
  useEffect(() => {
    if (!onboarded || typeof window === "undefined") return;
    let cancelled = false;
    (async () => {
      // Rehydrate the persisted addresses immediately (no prompt).
      const stored = loadState();
      setState((s) => ({
        ...s,
        connected: Boolean(stored.nimiqAddress) || s.connected,
        nimiqAddress: stored.nimiqAddress ?? s.nimiqAddress,
        evmAddress: stored.evmAddress ?? s.evmAddress,
        source: stored.nimiqAddress ? "Nimiq Pay" : s.source,
      }));
      // Re-establish the server session from the stored JWT if the cookie is
      // gone (e.g. in embedded webviews), then refresh auth state.
      const restored = await restoreStoredSession();
      if (cancelled) return;
      setAuthState(restored.authenticated ? "authenticated" : "idle");
    })();
    return () => {
      cancelled = true;
    };
  }, [onboarded]);

  return (
    <WalletContext.Provider
      value={{ state, authState, connectIdentity, connectEvm, disconnect, pay }}
    >
      {children}
    </WalletContext.Provider>
  );
}