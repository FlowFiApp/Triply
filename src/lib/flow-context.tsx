"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { readFlow, writeFlow, type Flow } from "@/lib/store";

type FlowContextValue = {
  flow: Partial<Flow>;
  setFlow: (patch: Partial<Flow>) => void;
};

const FlowContext = createContext<FlowContextValue | null>(null);

export function FlowProvider({ children }: { children: ReactNode }) {
  const [flow, setFlowState] = useState<Partial<Flow>>(
    () => (typeof window === "undefined" ? {} : readFlow()),
  );

  const setFlow = useCallback((patch: Partial<Flow>) => {
    setFlowState((prev) => {
      const next = { ...prev, ...patch };
      writeFlow(patch);
      return next;
    });
  }, []);

  return (
    <FlowContext.Provider value={{ flow, setFlow }}>
      {children}
    </FlowContext.Provider>
  );
}

export function useFlow(): FlowContextValue {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow must be used within FlowProvider");
  return ctx;
}