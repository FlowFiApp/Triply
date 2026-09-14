"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { identityKey } from "@/lib/identity";

type PointsContextValue = {
  earned: number;
  available: number;
  refresh: () => Promise<void>;
  redeem: (amount: number, recipient?: string) => Promise<{ ok: boolean; message?: string }>;
};

const PointsContext = createContext<PointsContextValue>({
  earned: 0,
  available: 0,
  refresh: async () => {},
  redeem: async () => ({ ok: false }),
});

export function usePoints() {
  return useContext(PointsContext);
}

export function PointsProvider({ children }: { children: ReactNode }) {
  const [earned, setEarned] = useState(0);
  const [available, setAvailable] = useState(0);

  const refresh = useCallback(async () => {
    const key = identityKey();
    if (!key) return;
    try {
      const res = await fetch(`/api/points?key=${encodeURIComponent(key)}`);
      if (res.ok) {
        const d = await res.json();
        setEarned(d.earned ?? 0);
        setAvailable(d.available ?? 0);
      }
    } catch {
      // keep current values
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const redeem = useCallback(
    async (amount: number, recipient?: string) => {
      const key = identityKey();
      if (!key) return { ok: false, message: "Identity unavailable." };
      try {
        const res = await fetch("/api/points/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, amount, recipient }),
        });
        const d = await res.json();
        if (!res.ok || !d.ok) {
          return { ok: false, message: d.error ?? "Redeem failed." };
        }
        await refresh();
        return { ok: true };
      } catch {
        return { ok: false, message: "Redeem failed." };
      }
    },
    [refresh],
  );

  return (
    <PointsContext.Provider value={{ earned, available, refresh, redeem }}>
      {children}
    </PointsContext.Provider>
  );
}