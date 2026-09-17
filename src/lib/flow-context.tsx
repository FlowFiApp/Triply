"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { FLOW_EVENT, readFlow, writeFlow, type Flow } from "@/lib/store";

type FlowContextValue = {
  flow: Partial<Flow>;
  setFlow: (patch: Partial<Flow>) => void;
};

const FlowContext = createContext<FlowContextValue | null>(null);

export function FlowProvider({ children }: { children: ReactNode }) {
  const [flow, setFlowState] = useState<Partial<Flow>>(
    () => (typeof window === "undefined" ? {} : readFlow()),
  );

  // Keep the context in sync with raw writeFlow/readFlow calls (stays/cars
  // screens) so every screen reading useFlow() sees the latest selection.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setFlowState(readFlow());
    window.addEventListener(FLOW_EVENT, sync);
    return () => window.removeEventListener(FLOW_EVENT, sync);
  }, []);

  const setFlow = useCallback((patch: Partial<Flow>) => {
    const next = { ...readFlow(), ...patch };
    writeFlow(next);
    setFlowState(next);
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