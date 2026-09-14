"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

type Status = { key: string; label: string; ok: boolean; required: boolean };

export default function ConfigBanner() {
  const [warnings, setWarnings] = useState<Status[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => {
        const list: Status[] = (d.statuses ?? []).filter((s: Status) => !s.ok);
        setWarnings(list);
      })
      .catch(() => {});
  }, []);

  if (dismissed || warnings.length === 0) return null;

  return (
    <div className="sticky top-0 z-[70] flex w-full items-start gap-2 bg-amber-500/95 px-4 py-2 text-[12px] font-medium text-white">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">Setup required</p>
        <p className="text-white/90">
          {warnings.map((w) => w.label).join(" · ")}
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}