"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, Copy, RadioReceiver, Wallet } from "lucide-react";
import { MobileShell } from "@/components/shell";
import { WalletConnectSheet } from "@/components/screens/sheets";
import { AuthActionButton } from "@/components/ui/auth-action";
import { Price } from "@/components/ui/feedback";
import { UsdtAmount } from "@/components/ui/Usdt";
import { NimiqIcon } from "@/components/ui/Nimiq";
import { useToast } from "@/lib/toast";
import { useWalletState } from "@/lib/wallet-state";
import { useFlow } from "@/lib/flow-context";
import { CHAINS, estimateGasInPol } from "@/lib/wallet";
import { clientConfig } from "@/lib/config";
import { copyText } from "@/lib/nimiq";

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
  evmAddress,
  onDisconnect,
}: {
  evmAddress?: string;
  onDisconnect: () => void;
}) {
  const { toast } = useToast();
  const show = evmAddress ?? "";
  const short = show ? `${show.slice(0, 6)}…${show.slice(-4)}` : "";

  const copy = () => {
    if (!show) return;
    const ok = copyText(show);
    toast(ok ? "success" : "error", ok ? "Address copied." : "Copy failed.");
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-accent-2 bg-card px-3 py-2.5">
      <button
        onClick={copy}
        className="tap flex items-center gap-2 text-[12px] font-semibold text-foreground"
      >
        <span className="h-2 w-2 rounded-full bg-accent-2" />
        {short} · {CHAINS.polygon.name}
        <Copy size={12} className="text-muted" />
      </button>
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [seconds, setSeconds] = useState(14 * 60 + 59);
  const [gasPol, setGasPol] = useState<number | null>(null);
  const [hold, setHold] = useState(() => Boolean(flow.hold));
  const { toast } = useToast();
  const { state, connectEvm, disconnect, pay } = useWalletState();
  const { flow, setFlow } = useFlow();
  const treasuryOk = clientConfig().find(
    (c) => c.key === "NEXT_PUBLIC_TREASURY_WALLET_ADDRESS",
  )?.ok;

  const offer = flow.offer;
  const amount = flow.amount ?? offer?.price ?? 0;
  // Offers with requires_instant_payment=false can be held and paid later.
  const canHold = offer ? offer.requiresInstantPayment === false : false;

  // Use the offer's real expiry when available; otherwise fall back to 15 min.
  useEffect(() => {
    const expires = offer?.expiresAt ? new Date(offer.expiresAt).getTime() : 0;
    const initial =
      expires > Date.now() ? Math.floor((expires - Date.now()) / 1000) : 14 * 60 + 59;
    const reset = setTimeout(() => setSeconds(initial), 0);
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => {
      clearTimeout(reset);
      clearInterval(t);
    };
  }, [offer?.expiresAt]);

  const base = offer ? offer.price - offer.taxAmount : amount;
  const taxes = offer?.taxAmount ?? 0;
  const extras = Math.max(0, amount - (offer?.price ?? 0));

  // Estimate the network fee (in POL) once the wallet is connected.
  useEffect(() => {
    if (!state.evmAddress) return;
    let cancelled = false;
    estimateGasInPol({ from: state.evmAddress, amount })
      .then((pol) => {
        if (!cancelled) setGasPol(pol);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [state.evmAddress, amount]);

  const mm = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const handleSelectWallet = async () => {
    setSheetOpen(false);
    setConnecting(true);
    try {
      // Hold orders are booked without payment and settled later.
      if (hold) {
        setFlow({ amount, hold: true, txHash: undefined, chain: undefined });
        router.push("/processing");
        return;
      }
      setFlow({ hold: false });
      // Polygon/EVM is only requested here, at checkout.
      const evmAddress = await connectEvm();
      if (!evmAddress) {
        throw new Error(
          "No Polygon wallet available. Install MetaMask or another wallet with USDT.",
        );
      }
      const res = await pay(amount, evmAddress);
      setFlow({ amount, txHash: res.hash, chain: res.chain });
      router.push("/processing");
    } catch (err) {
      toast(
        "error",
        err instanceof Error
          ? err.message
          : "Payment failed. Please try again.",
      );
    } finally {
      setConnecting(false);
    }
  };

  if (!offer) {
    return (
      <MobileShell>
        <div className="flex min-h-full flex-col items-center justify-center gap-3 px-10 text-center">
          <p className="text-[16px] font-bold text-foreground">Checkout</p>
          <p className="text-[13px] text-muted">
            No offer selected. Choose a flight first to see your order summary.
          </p>
          <Link
            href="/search"
            className="flex h-10 items-center rounded-xl border border-accent-2 bg-accent px-4 text-[13px] font-bold text-accent-2"
          >
            Search Flights
          </Link>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell header={<><div className="flex h-[60px] items-center gap-3 bg-background px-4 py-3">
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
              Checkout
            </h1>
          </div></>}>
      <div className="flex min-h-full flex-col justify-between">
        <div className="w-full">
                 <div className="px-4 py-3">
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

          <div className="px-4 py-3">
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
              <span className="text-[14px] font-bold text-foreground">
                Order Summary
              </span>
              <div className="flex flex-col gap-2">
                <BreakdownRow
                  label={`Flight Base Fare · ${offer.origin}→${offer.destination}`}
                  amount={base}
                />
                <BreakdownRow label="Taxes & Fees" amount={taxes} />
                {extras > 0 ? (
                  <BreakdownRow label="Extras & Services" amount={extras} />
                ) : null}
                <div className="h-px w-full bg-border" />
                <BreakdownRow label="Total Payable" amount={amount} bold />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-accent-2/20 px-3 py-2">
                <span className="text-[12px] font-semibold text-foreground">
                  Points you&apos;ll earn
                </span>
                <span className="flex items-center gap-1 text-[12px] font-bold text-accent-fg">
                  +{Math.round(amount * 2)}
                  <NimiqIcon size={13} />
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 px-4 pb-6 pt-3">
            <h2 className="text-[15px] font-bold text-foreground">
              Payment Method
            </h2>

            {!hold ? (
              <div className="flex flex-col gap-3 rounded-xl border-2 border-accent-2 bg-card p-4">
                <span className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5">
                    <RadioReceiver size={18} className="text-accent-fg" />
                    <span className="text-[14px] font-bold text-foreground">
                      Pay with Crypto Wallet
                    </span>
                  </span>
                  <span className="flex h-[21px] items-center rounded-md border border-border bg-card-2 px-2 text-[10px] font-semibold text-accent-fg">
                    Polygon
                  </span>
                </span>
                <span className="flex items-center gap-2 pl-7">
                  {state.evmAddress && gasPol !== null ? (
                    <span className="text-[11px] text-muted">
                      Network fee ≈{" "}
                      <span className="font-semibold text-foreground">
                        {gasPol.toFixed(5)} POL
                      </span>
                    </span>
                  ) : state.evmAddress ? (
                    <span className="text-[11px] text-muted">
                      Estimating network fee…
                    </span>
                  ) : null}
                </span>
              </div>
            ) : (
              <div className="rounded-xl border border-accent-2/40 bg-accent-2/10 p-4">
                <span className="text-[13px] font-bold text-foreground">
                  No payment now — fare is held
                </span>
                <p className="mt-0.5 text-[12px] text-muted">
                  You&apos;ll pay on Polygon later from the booking.
                </p>
              </div>
            )}

            {!hold && !treasuryOk ? (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12px] font-semibold text-red-500">
                Payment is disabled: NEXT_PUBLIC_TREASURY_WALLET_ADDRESS is not
                configured.
              </p>
            ) : null}

            {canHold ? (
              <div className="flex items-center justify-between rounded-xl border border-border bg-card-2 px-3 py-2.5">
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-foreground">
                    Hold &amp; pay later
                  </span>
                  <span className="text-[11px] text-muted">
                    Reserve this fare — no payment now
                  </span>
                </div>
                <button
                  onClick={() => setHold((h) => !h)}
                  role="switch"
                  aria-checked={hold}
                  className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${
                    hold ? "justify-end bg-accent-2" : "justify-start bg-card-3"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full ${hold ? "bg-accent" : "bg-muted"}`}
                  />
                </button>
              </div>
            ) : null}

            {!hold && state.connected ? (
              <WalletStatusBar
                evmAddress={state.evmAddress}
                onDisconnect={disconnect}
              />
            ) : null}
          </div>
        </div>

        <div aria-hidden className="h-[150px] w-full shrink-0" />
        <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[768px] -translate-x-1/2 border-t border-border bg-card px-4 pb-[calc(30px+env(safe-area-inset-bottom))] pt-3">
          <div className="mb-3 flex flex-col items-center gap-0.5">
            <span className="text-[12px] text-muted">Total</span>
            <Price usd={amount} className="text-[18px] text-foreground" bold />
          </div>
          <AuthActionButton
            disabled={connecting || (!treasuryOk && !hold)}
            busy={connecting}
            busyLabel="Processing…"
            onAction={() => (hold ? void handleSelectWallet() : setSheetOpen(true))}
            className="tap flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2 disabled:opacity-60"
          >
            {hold ? (
              <>
                <RadioReceiver size={18} />
                Hold this fare — pay later
              </>
            ) : state.evmAddress ? (
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
          </AuthActionButton>
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
