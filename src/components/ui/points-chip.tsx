"use client";

import { useState } from "react";
import { NimiqAmount } from "@/components/ui/Nimiq";
import RedeemSheet from "@/components/screens/RedeemSheet";
import { usePoints } from "@/lib/points";

/** NIM points pill for top navs; opens the redeem sheet. */
export default function PointsChip() {
  const { available } = usePoints();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] font-bold text-foreground"
      >
        <NimiqAmount value={available} />
      </button>
      <RedeemSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}