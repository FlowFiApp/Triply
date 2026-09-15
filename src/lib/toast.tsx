"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, XCircle, X } from "lucide-react";

type Kind = "success" | "error" | "info";
type Toast = { id: number; kind: Kind; message: string };

const ToastContext = createContext<{ toast: (kind: Kind, message: string) => void }>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((kind: Kind, message: string) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[76px] z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-fade-in pointer-events-auto flex w-full max-w-[360px] items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 shadow-xl"
          >
            {t.kind === "success" ? (
              <CheckCircle2 size={18} className="shrink-0 text-accent-fg" />
            ) : t.kind === "error" ? (
              <XCircle size={18} className="shrink-0 text-red-500" />
            ) : (
              <Info size={18} className="shrink-0 text-accent" />
            )}
            <p className="flex-1 text-[13px] font-medium text-foreground">
              {t.message}
            </p>
            <button
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
              className="text-muted"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}