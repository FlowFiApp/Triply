"use client";

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadDeviceId } from "@/lib/identity";
import { useWalletState } from "@/lib/wallet-state";

type PointsContextValue = {
  earned: number;
  available: number;
  refresh: () => Promise<void>;
  redeem: (
    amount: number,
    recipient?: string,
  ) => Promise<{ ok: boolean; message?: string }>;
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
  const qc = useQueryClient();
  const { state } = useWalletState();
  const { data: deviceId } = useQuery({
    queryKey: ["deviceId"],
    queryFn: loadDeviceId,
  });
  const key = state.nimiqAddress ?? deviceId ?? "";

  const { data } = useQuery({
    queryKey: ["points", key],
    enabled: Boolean(key),
    queryFn: async () => {
      const res = await fetch(`/api/points?key=${encodeURIComponent(key)}`);
      if (!res.ok) return { earned: 0, available: 0 };
      return res.json();
    },
  });

  const earned = data?.earned ?? 0;
  const available = data?.available ?? 0;

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["points"] });
  }, [qc]);

  const redeem = useCallback(
    async (amount: number, recipient?: string) => {
      const k = state.nimiqAddress ?? deviceId ?? "";
      if (!k) {
        return { ok: false, message: "Identity unavailable." };
      }
      try {
        const res = await fetch("/api/points/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: k, amount, recipient }),
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
    [refresh, state.nimiqAddress, deviceId],
  );

  return (
    <PointsContext.Provider value={{ earned, available, refresh, redeem }}>
      {children}
    </PointsContext.Provider>
  );
}