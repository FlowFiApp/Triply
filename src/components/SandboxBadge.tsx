"use client";

import { useEffect, useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { Sheet } from "@/components/ui";
import { TEST_PRICE_DIVISOR } from "@/lib/pricing";

const HIDE_KEY = "triply-sandbox-badge-hidden";

export default function SandboxBadge() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [dontHide, setDontHide] = useState(false);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(HIDE_KEY) === "1");
    } catch {}
  }, []);

  const hideBadge = () => {
    setOpen(false);
    if (dontHide) {
      try {
        localStorage.setItem(HIDE_KEY, "1");
      } catch {}
      setHidden(true);
    }
  };

  if (hidden) return null;

  const fraction = TEST_PRICE_DIVISOR > 1 ? `1/${TEST_PRICE_DIVISOR}` : "full";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-1/2 top-2 z-[80] -translate-x-1/2 rounded-full bg-yellow-300 px-3 py-1 text-[11px] font-bold text-black shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
      >
        <span className="flex items-center gap-1">
          <FlaskConical size={12} /> Sandbox
        </span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} zIndex="z-[95]">
        <div className="px-4 pb-4">
          <h2 className="mb-3 text-[17px] font-extrabold text-foreground">
            Sandbox mode
          </h2>
          <p className="mb-3 text-[13px] leading-5 text-foreground">
            We are using the <span className="font-bold">Duffel sandbox API</span>{" "}
            for this competition so you can book risk-free with test inventory.
          </p>
          <p className="mb-3 text-[13px] leading-5 text-foreground">
            Prices shown are <span className="font-bold">{fraction}</span> of the
            actual price.
          </p>
          <p className="mb-5 text-[13px] leading-5 text-muted">
            After the competition, Triply moves to Duffel production and real
            pricing goes live.
          </p>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-card-2 px-3 py-3">
            <input
              type="checkbox"
              checked={dontHide}
              onChange={(e) => setDontHide(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-yellow-400"
            />
            <span className="text-[13px] leading-5 text-foreground">
              Don&apos;t show this badge again
            </span>
          </label>

          <button
            onClick={hideBadge}
            className="tap mt-4 flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-bold text-accent-2"
          >
            <X size={16} /> Close
          </button>
        </div>
      </Sheet>
    </>
  );
}