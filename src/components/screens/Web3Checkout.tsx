"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "react-qr-code";
import {
  Clock,
  Radio,
  RadioReceiver,
  Wallet,
} from "lucide-react";
import { MobileShell } from "@/components/shell";
import { WalletConnectSheet } from "@/components/screens/sheets";
import { Price } from "@/components/ui/feedback";
import { UsdtAmount } from "@/components/ui/Usdt";
import { useQueryParam } from "@/lib/query";
import { readFlow } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { useWalletState } from "@/lib/wallet-state";
import { CHAINS, treasuryFor, type ChainId } from "@/lib/wallet";

function BreakdownRow({
  label,
  amount,
  bold = false,
}: {
  label: string;
  amount: number;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={
          bold
            ? "text-[13px] font-bold text-foreground"
            : "text-[12px] text-muted"
        }
      >
        {label}
      </span>
      <span
        className={
          bold
            ? "text-[13px] font-bold text-foreground"
            : "text-[12px] text-foreground"
        }
      >
        <UsdtAmount value={amount} />
      </span>
    </div>
  );
}

function WalletStatusBar({
  address,
  chain,
  onDisconnect,
}: {
  address: string;
  chain: ChainId;
  onDisconnect: () => void;
}) {
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  return (
    <div className="flex items-center justify-between rounded-xl border border-accent-2 bg-card px-3 py-2.5">
      <span className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
        <span className="h-2 w-2 rounded-full bg-accent-2" />
        {short} · {CHAINS[chain].name}
      </span>
      <button
        onClick={onDisconnect}
        className="text-[11px] font-bold text-muted"
      >
        Disconnect
      </button>
    </div>
  );
}

export default function Web3Checkout() {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(
    useQueryParam("sheet", "") === "wallet",
  );
const [method, setMethod] = useState<"crypto" | "qr">("crypto");
  const [connecting, setConnecting] = useState(false);
  const [seconds, setSeconds] = useState(14 * 60 + 59);
  const { toast } = useToast();
  const { state, connect, disconnect, pay } = useWalletState();
  const network: ChainId = "polygon";

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const flow = readFlow();
  const offer = flow.offer;
  const amount = flow.amount ?? offer?.price ?? 0;
  const base = offer ? offer.price - offer.taxAmount : amount;
  const taxes = offer?.taxAmount ?? 0;
  const extras = Math.max(0, amount - (offer?.price ?? 0));

  const mm = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const handleSelectWallet = async () => {
    setSheetOpen(false);
    setConnecting(true);
    try {
      await connect(network);
      const res = await pay(amount, network);
      toast("success", "USDT payment submitted on-chain.");
      router.push(`/processing?amount=${amount}&chain=${res.chain}&tx=${res.hash}`);
    } catch (err) {
      toast(
        "error",
        err instanceof Error ? err.message : "Payment failed. Please try again.",
      );
    } finally {
      setConnecting(false);
    }
  };

  if (!offer) {
    return (
      <MobileShell>
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-10 text-center">
          <p className="text-[16px] font-bold text-foreground">Web3 Checkout</p>
          <p className="text-[13px] text-muted">
            No offer selected. Choose a flight first to see your order summary.
          </p>
          <Link
            href="/search"
            className="flex h-10 items-center rounded-xl border border-accent-2 bg-accent px-5 text-[13px] font-bold text-accent-2"
          >
            Search Flights
          </Link>
        </div>
      </MobileShell>
    );
  }

  const qrPayload = `${amount.toFixed(2)}:USDT:${treasuryFor(network)}:${CHAINS[network].name}`;

  return (
    <MobileShell>
      <div className="flex min-h-screen flex-col justify-between">
        <div className="w-full">
          <div className="sticky top-0 z-30 flex h-[60px] items-center gap-3 bg-background px-5 py-3">
            <Link
              href="/passengers"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <h1 className="text-[18px] font-extrabold text-foreground">
              Web3 Checkout
            </h1>
          </div>

          <div className="px-5 py-3">
            <div className="flex items-center justify-between rounded-xl bg-accent-2 px-3 py-3">
              <span className="flex items-center gap-2.5">
                <Clock size={20} className="text-accent" />
                <span className="text-[12px] font-bold text-accent">
                  Price Guaranteed
                </span>
              </span>
              <span className="text-[13px] font-extrabold text-accent">
                {mm}
              </span>
            </div>
          </div>

          <div className="px-5 py-3">
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
              <span className="text-[14px] font-bold text-foreground">
                Order Summary
              </span>
              <div className="flex flex-col gap-2">
                <BreakdownRow
                  label={`Flight Base Fare · ${offer.origin}→${offer.destination}`}
                  amount={base}
                />
                <BreakdownRow
                  label="Taxes & Fees"
                  amount={taxes}
                />
                {extras > 0 ? (
                  <BreakdownRow
                    label="Extras & Services"
                    amount={extras}
                  />
                ) : null}
                <div className="h-px w-full bg-border" />
                <BreakdownRow
                  label="Total Payable"
                  amount={amount}
                  bold
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 px-5 pb-6 pt-3">
            <h2 className="text-[15px] font-bold text-foreground">
              Select Payment Method
            </h2>

            <button
              onClick={() => setMethod("crypto")}
              className={`flex flex-col gap-3 rounded-xl bg-card p-4 text-left ${
                method === "crypto"
                  ? "border-2 border-accent-2"
                  : "border border-border"
              }`}
            >
              <span className="flex items-center justify-between">
                <span className="flex items-center gap-2.5">
                  <RadioReceiver
                    size={18}
                    className={method === "crypto" ? "text-accent-2" : "text-muted"}
                  />
                  <span className="text-[14px] font-bold text-foreground">
                    Pay with Crypto Wallet
                  </span>
                </span>
                <span className="text-[10px] font-bold text-accent-2">
                  Fast &amp; Gasless
                </span>
              </span>
<span className="flex items-center gap-2 pl-7">
                <span className="flex h-[21px] items-center rounded-md border border-border bg-card-2 px-2 text-[10px] font-semibold text-accent-2">
                  Polygon
                </span>
              </span>
            </button>

            <button
              onClick={() => setMethod("qr")}
              className={`flex h-[51px] items-center justify-between rounded-xl bg-card px-4 ${
                method === "qr" ? "border-2 border-accent-2" : "border border-border"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Radio
                  size={18}
                  className={method === "qr" ? "text-accent-2" : "text-muted"}
                />
                <span className="text-[14px] font-semibold text-foreground">
                  Pay via QR Code / Transfer
                </span>
              </span>
            </button>

            {method === "qr" ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5">
                <div className="rounded-xl bg-white p-3">
                  <QRCode value={qrPayload} size={160} />
                </div>
                <p className="text-center text-[12px] text-muted">
                  Scan with any wallet to send{" "}
                  <span className="font-bold text-accent-2">
                    <UsdtAmount value={amount} />
                  </span>{" "}
                  on {CHAINS[network].name}.
                </p>
                <p className="break-all text-center text-[10px] text-muted">
                  {treasuryFor(network)}
                </p>
              </div>
) : null}

            {state.connected ? (
              <WalletStatusBar
                address={state.address ?? ""}
                chain={state.chain ?? network}
                onDisconnect={disconnect}
              />
            ) : null}
          </div>
        </div>

<div aria-hidden className="h-[84px] w-full shrink-0" />
      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[390px] -translate-x-1/2 border-t border-border bg-card px-5 pb-4 pt-3 pb-safe">
          <div className="mb-3 flex flex-col items-center gap-0.5">
            <span className="text-[12px] text-muted">Total</span>
            <Price usd={amount} className="text-[18px] text-foreground" bold />
          </div>
          <button
            disabled={connecting}
            onClick={() => setSheetOpen(true)}
            className="tap flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2 disabled:opacity-60"
          >
            {connecting ? (
              "Processing…"
            ) : state.connected ? (
              <>
                <Wallet size={18} />
                Pay <UsdtAmount value={amount} />
              </>
            ) : (
              <>
                <Wallet size={18} />
                Connect Wallet to Pay
              </>
            )}
          </button>
        </div>
      </div>

      <WalletConnectSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSelect={handleSelectWallet}
      />
    </MobileShell>
  );
}

