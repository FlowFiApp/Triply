"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  type ReactNode,
} from "react";

const ASSISTANT_SRC = "https://assets.duffel.com/assistant/custom-element.js";

let scriptPromise: Promise<void> | null = null;

function loadAssistantScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    if (typeof document === "undefined") return resolve();
    if (document.querySelector(`script[src="${ASSISTANT_SRC}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = ASSISTANT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      resolve();
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

type IssueType = "cancellation" | "change" | "other";

type OpenOptions = {
  orderId?: string;
  bookingId?: string;
  issueType?: IssueType;
};

type AssistantContextValue = {
  open: (opts?: OpenOptions) => Promise<boolean>;
};

const AssistantContext = createContext<AssistantContextValue>({
  open: async () => false,
});

export function useDuffelAssistant() {
  return useContext(AssistantContext);
}

export function DuffelAssistantProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void loadAssistantScript();
  }, []);

  const open = useCallback(async (opts?: OpenOptions) => {
    try {
      await loadAssistantScript();
      const res = await fetch("/api/assistant/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: opts?.orderId,
          bookingId: opts?.bookingId,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.clientKey) return false;
      const fn = (
        window as unknown as {
          openDuffelAssistant?: (args: Record<string, unknown>) => void;
        }
      ).openDuffelAssistant;
      if (!fn) return false;
      fn({
        clientKey: d.clientKey,
        ...(opts?.issueType ? { context: { issueType: opts.issueType } } : {}),
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <AssistantContext.Provider value={{ open }}>
      {children}
      {createElement("duffel-assistant")}
    </AssistantContext.Provider>
  );
}