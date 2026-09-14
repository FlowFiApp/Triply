"use client";

import { useEffect, useState, type ReactNode } from "react";
import { WifiOff } from "lucide-react";
import { UsdtAmount } from "@/components/ui/Usdt";

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`shimmer rounded-lg ${className}`} style={style} />
  );
}

export function SkeletonText({
  lines = 1,
  width,
}: {
  lines?: number;
  width?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: width ?? (i === lines - 1 ? "60%" : "100%") }}
        />
      ))}
    </div>
  );
}

export function SkeletonRows({ rows = 3, height = 176 }: { rows?: number; height?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="w-full rounded-2xl border border-border" style={{ height }} />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6 py-12 text-center">
      <span className="text-muted">{icon}</span>
      <p className="text-[14px] font-semibold text-foreground">{title}</p>
      <p className="max-w-[260px] text-[12px] text-muted">{message}</p>
      {action}
    </div>
  );
}

export function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="sticky top-0 z-[60] flex w-full items-center justify-center gap-2 bg-red-500/95 px-4 py-2 text-[12px] font-semibold text-white">
      <WifiOff size={14} />
      You are offline — some data may be unavailable.
    </div>
  );
}

export function Price({
  usd,
  className = "",
  bold = false,
}: {
  usd: number;
  showUsdt?: boolean;
  className?: string;
  bold?: boolean;
}) {
  return (
    <span className={`${className} ${bold ? "font-extrabold" : ""}`}>
      <UsdtAmount value={usd} />
    </span>
  );
}