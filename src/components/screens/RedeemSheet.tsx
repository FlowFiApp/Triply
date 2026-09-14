"use client";

import { Gift } from "lucide-react";
import { Sheet } from "@/components/ui";
import { NimiqIcon, NimiqAmount } from "@/components/ui/Nimiq";
import { usePoints } from "@/lib/points";
import { useWalletState } from "@/lib/wallet-state";
import { useToast } from "@/lib/toast";
import { haptic } from "@/lib/haptics";
import {
  formatAmount,
  isValidNimiqAddress,
  normalizeNimiqAddress,
} from "@/lib/nimiq";

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

  const addr = state.nimiqAddress
    ? normalizeNimiqAddress(state.nimiqAddress)
    : undefined;
  const addrValid = addr ? isValidNimiqAddress(addr) : false;

  const onRedeem = async () => {
    haptic();
    const result = await redeem(available, addrValid ? addr : undefined);
    if (result.ok) {
      toast(
        "success",
        addrValid
          ? `Redeemed ${available} NIM — sending to your wallet.`
          : `Redeemed ${available} NIM. Connect a valid Nimiq Pay wallet to receive the payout.`,
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
          <NimiqAmount value={available} iconSize={16} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-muted">NIM earned</span>
          <span className="text-[12px] font-semibold text-foreground">
            {formatAmount(earned, 0)} NIM
          </span>
        </div>
        <p className="text-[11px] leading-4 text-muted">
          {addr
            ? `Payout is sent to ${addr.slice(0, 8)}…`
            : "Open Triply inside Nimiq Pay to receive the payout to your wallet."}
        </p>
        {addr && !addrValid ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[11px] font-semibold text-red-500">
            The connected Nimiq address is invalid — payout will be held until
            it is fixed.
          </p>
        ) : null}
      </div>

      <div className="px-5 pb-4 pt-4">
        <button
          onClick={onRedeem}
          disabled={available <= 0}
          className="tap flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2 disabled:opacity-50"
        >
          <NimiqIcon size={16} />
          Redeem {formatAmount(available, 0)} NIM
        </button>
      </div>
    </Sheet>
  );
}