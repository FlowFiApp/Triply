"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type Points = { earned: number; available: number };

type PointsContextValue = {
  earned: number;
  available: number;
  addPoints: (n: number) => void;
  redeemPoints: (n: number) => boolean;
};

const PointsContext = createContext<PointsContextValue>({
  earned: 0,
  available: 0,
  addPoints: () => {},
  redeemPoints: () => false,
});

export function usePoints() {
  return useContext(PointsContext);
}

const KEY = "triply-points";

function load(): Points {
  if (typeof window === "undefined") return { earned: 0, available: 0 };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw && typeof raw.earned === "number" && typeof raw.available === "number") {
      return { earned: raw.earned, available: raw.available };
    }
  } catch {}
  return { earned: 0, available: 0 };
}

export function PointsProvider({ children }: { children: ReactNode }) {
  const [points, setPoints] = useState<Points>(() => load());

  const persist = useCallback((p: Points) => {
    setPoints(p);
    if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(p));
  }, []);

  const addPoints = useCallback(
    (n: number) => {
      const amount = Math.max(0, Math.round(n));
      persist({ earned: points.earned + amount, available: points.available + amount });
    },
    [points, persist],
  );

  const redeemPoints = useCallback(
    (n: number): boolean => {
      const amount = Math.min(Math.max(0, Math.round(n)), points.available);
      if (amount <= 0) return false;
      persist({ ...points, available: points.available - amount });
      return true;
    },
    [points, persist],
  );

  return (
    <PointsContext.Provider
      value={{
        earned: points.earned,
        available: points.available,
        addPoints,
        redeemPoints,
      }}
    >
      {children}
    </PointsContext.Provider>
  );
}