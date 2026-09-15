"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Copy, ExternalLink } from "lucide-react";
import { MobileShell } from "@/components/shell";
import { useQueryParam } from "@/lib/query";
import { readFlow, writeFlow } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { useWalletState } from "@/lib/wallet-state";
import { getStoredIdentity } from "@/lib/identity";
import { CHAINS } from "@/lib/wallet";
import type { OrderRecord } from "@/lib/types";

type Step = "verify" | "settle" | "issue";

export default function Processing() {
  const router = useRouter();
  const amount = Number(useQueryParam("amount", "0"));
  const tx = useQueryParam("tx", "");
  const chain = CHAINS.polygon;
  const { state } = useWalletState();

  const [current, setCurrent] = useState<Step>("verify");
  const [sub, setSub] = useState("In Progress...");
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(false);
  const ran = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const flow = readFlow();
    const offerId = flow.offer?.id ?? "";
    const payer = state.evmAddress ?? "";

    const verifyPayment = async () => {
      // Confirm the USDT transfer on-chain before creating any order.
      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx, amount, chain: chain.id }),
      });
      const verify = await verifyRes.json();
      if (!verifyRes.ok || !verify.verified) {
        throw new Error(verify?.error ?? "Payment not verified on-chain.");
      }
    };

    const createOrder = async () => {
      setBooking(true);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId,
          amount,
          txHash: tx,
          chain: chain.id,
          from: payer,
          nimiqAddress: state.nimiqAddress,
          deviceId: getStoredIdentity().deviceId,
          passengers: [
            {
              given_name: flow.passenger?.first ?? "",
              family_name: flow.passenger?.last ?? "",
              born_on: flow.passenger?.dob ?? "",
              email: flow.passenger?.email ?? "",
              phone_number: `${flow.passenger?.dialCode ?? "+234"}${flow.passenger?.phone ?? ""}`,
              gender: flow.passenger?.gender?.toLowerCase() ?? "female",
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Order creation failed");
      }
      if (!data.live) {
        throw new Error(data.error ?? "Duffel is not configured");
      }
      writeFlow({ order: data.order as OrderRecord, txHash: tx, chain: chain.id });
      toast("success", `Booking confirmed · ${data.order.bookingRef}`);
      router.push("/ticket");
    };

    const run = async () => {
      try {
        setCurrent("verify");
        setSub("Verifying on-chain payment…");
        await verifyPayment();
        setCurrent("settle");
        setSub("Settlement confirmed — issuing booking…");
        await createOrder();
      } catch (err) {
        setBooking(false);
        setError(err instanceof Error ? err.message : "Booking could not be issued.");
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepIndex = ["verify", "settle", "issue"].indexOf(current);
  const steps = [
    { title: "On-Chain Payment Verification", done: "Verified & Secured" },
    { title: "Instant Settlement", done: "Settled" },
    { title: "Airline Ticket Issuance", done: "Issued" },
  ];

  return (
    <MobileShell>
      <div className="flex min-h-screen flex-col justify-between">
        <div className="w-full">
          <div className="sticky top-0 z-30 flex h-[60px] items-center bg-background px-4">
            <h1 className="text-[18px] font-extrabold leading-6 text-foreground">
              Processing Booking
            </h1>
          </div>

          <div className="flex flex-col items-center gap-8 px-4 py-5">
            <div className="flex w-full flex-col gap-5 rounded-2xl border border-border bg-card p-4">
              {steps.map((s, i) => {
                const done = i < stepIndex;
                const active = i === stepIndex;
                return (
                  <div key={s.title}>
                    {i > 0 ? (
                      <div className="mb-5 ml-[13px] h-5 w-px border-l border-border" />
                    ) : null}
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          done
                            ? "bg-accent"
                            : active
                              ? "border border-accent-2 bg-card"
                              : "border border-border bg-card"
                        }`}
                      >
                        {done ? (
                          <Check
                            size={14}
                            className="text-accent-2"
                            strokeWidth={3}
                          />
                        ) : active ? (
                          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-accent-2" />
                        ) : (
                          <span className="text-[12px] font-bold text-muted">
                            {i + 1}
                          </span>
                        )}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[14px] font-bold text-foreground">
                          {done ? s.done : s.title}
                        </span>
                        <span
                          className={`text-[12px] ${
                            active ? "text-accent-2" : done ? "text-accent-2" : "text-muted"
                          }`}
                        >
                          {done ? "Completed" : active ? sub : "Pending"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {error ? (
              <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center">
                <p className="text-[14px] font-bold text-foreground">
                  Booking could not be issued
                </p>
                <p className="text-[12px] text-muted">{error}</p>
                <Link
                  href="/checkout"
                  className="flex h-10 items-center rounded-xl border border-accent-2 bg-accent px-4 text-[13px] font-bold text-accent-2"
                >
                  Back to Checkout
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="text-[16px] font-bold leading-[21px] text-foreground">
                  {booking
                    ? "Issuing your on-chain E-ticket…"
                    : "Verifying blockchain transaction."}
                </p>
                <p className="text-[14px] text-muted">
                  Do not close this screen or refresh.
                </p>
                <div className="relative h-1 w-[200px] overflow-hidden rounded-full bg-card-3">
                  <div
                    className="h-full rounded-full bg-accent-2 transition-all duration-700"
                    style={{ width: `${((stepIndex + 1) / 3) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {tx ? (
              <div className="flex w-full flex-col gap-1.5 rounded-xl border border-border bg-card p-3.5">
                <span className="text-[11px] font-semibold text-muted">
                  Transaction Hash
                </span>
                <div className="flex items-center justify-between">
                  <Link
                    href={`${chain.explorer}/tx/${tx}`}
                    target="_blank"
                    className="flex items-center gap-1 text-[14px] font-semibold text-accent-2"
                  >
                    {tx}
                    <ExternalLink size={12} />
                  </Link>
                  <button
                    onClick={() => navigator.clipboard?.writeText(tx)}
                    className="text-accent-2"
                    aria-label="Copy transaction hash"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </MobileShell>
  );
}