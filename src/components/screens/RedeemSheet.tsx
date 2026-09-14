"use client";

import { Gift } from "lucide-react";
import { Sheet } from "@/components/ui";
import { NimiqIcon } from "@/components/ui/Nimiq";
import { usePoints } from "@/lib/points";
import { useWalletState } from "@/lib/wallet-state";
import { useToast } from "@/lib/toast";
import { haptic } from "@/lib/haptics";

export default function RedeemSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { earned, available, redeem } = usePoints();
  const { state } = useWalletState();
  const { toast } = useToast();

  const onRedeem = async () => {
    haptic();
    const result = await redeem(available, state.nimiqAddress);
    if (result.ok) {
      toast(
        "success",
        state.nimiqAddress
          ? `Redeemed ${available} NIM — sending to your wallet.`
          : `Redeemed ${available} NIM. Connect Nimiq Pay to receive the payout.`,
      );
      onClose();
    } else {
      toast("error", result.message ?? "Redeem failed.");
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-5 py-3">
        <h2 className="text-[18px] font-extrabold text-foreground">Redeem Nimiq</h2>
        <p className="text-[12px] text-muted">Use your NIM rewards.</p>
      </div>

      <div className="mx-5 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
            <Gift size={16} className="text-accent-2" />
            NIM available
          </span>
          <span className="flex items-center gap-1 text-[18px] font-extrabold text-foreground">
            {available.toLocaleString()}
            <NimiqIcon size={16} />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-muted">NIM earned</span>
          <span className="text-[12px] font-semibold text-foreground">
            {earned.toLocaleString()} NIM
          </span>
        </div>
        <p className="text-[11px] leading-4 text-muted">
          {state.nimiqAddress
            ? `Payout is sent to ${state.nimiqAddress.slice(0, 8)}…`
            : "Open Triply inside Nimiq Pay to receive the payout to your wallet."}
        </p>
      </div>

      <div className="px-5 pb-4 pt-4">
        <button
          onClick={onRedeem}
          disabled={available <= 0}
          className="tap flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2 disabled:opacity-50"
        >
          <NimiqIcon size={16} />
          Redeem {available.toLocaleString()} NIM
        </button>
      </div>
    </Sheet>
  );
}