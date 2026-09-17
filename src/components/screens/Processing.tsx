"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Copy, ExternalLink } from "lucide-react";
import { MobileShell } from "@/components/shell";
import { useFlow } from "@/lib/flow-context";
import { useToast } from "@/lib/toast";
import { useWalletState } from "@/lib/wallet-state";
import { CHAINS } from "@/lib/wallet";
import { shortHash } from "@/lib/nimiq";
import type { OrderRecord } from "@/lib/types";

type Step = "verify" | "settle" | "issue";

const REQUEST_TIMEOUT_MS = 45_000;

function fetchJson(
  url: string,
  body: unknown,
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: controller.signal,
    cache: "no-store",
  })
    .then(async (res) => {
      const data = await res.json();
      return { ok: res.ok, data };
    })
    .finally(() => clearTimeout(timer));
}

export default function Processing() {
  const router = useRouter();
  const { flow, setFlow } = useFlow();
  const amount = flow.amount ?? 0;
  const tx = flow.txHash ?? "";
  const chain = CHAINS.polygon;
  const { state } = useWalletState();

  const [current, setCurrent] = useState<Step>("verify");
  const [sub, setSub] = useState("In Progress...");
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(false);
  const ran = useRef(false);
  const { toast } = useToast();

  const offerId = flow.offer?.id ?? "";
  const payer = state.evmAddress ?? "";

  const runFlow = useCallback(async () => {
    setError("");
    if (!flow.offer?.id || !tx) {
      setError(
        "No booking in progress — go back to checkout to start a booking.",
      );
      return;
    }
    try {
      // Step 1 — confirm the USDT transfer on-chain before creating any order.
      setCurrent("verify");
      setSub("Verifying on-chain payment…");
      const verifyRes = await fetchJson("/api/payments/verify", {
        tx,
        amount,
        chain: chain.id,
      });
      if (!verifyRes.ok || !verifyRes.data?.verified) {
        throw new Error(
          typeof verifyRes.data?.error === "string"
            ? verifyRes.data.error
            : "Payment not verified on-chain.",
        );
      }

      // Step 2 — create the airline order.
      setCurrent("settle");
      setSub("Settlement confirmed — issuing booking…");
      setBooking(true);
      const orderRes = await fetchJson("/api/orders", {
        offerId,
        amount,
        txHash: tx,
        chain: chain.id,
        from: payer,
        nimiqAddress: state.nimiqAddress,
        selectedServiceIds: flow.selectedServiceIds ?? [],
        passengerIds: flow.offer?.passengerIds ?? [],
        passengers: (
          flow.passengersList ??
          (flow.passenger ? [flow.passenger] : [])
        ).map((p) => ({
          given_name: p.first ?? "",
          family_name: p.last ?? "",
          born_on: p.dob ?? "",
          email: p.email ?? "",
          phone_number: `${p.dialCode ?? "+234"}${p.phone ?? ""}`,
          gender: p.gender?.toLowerCase() ?? "female",
        })),
      });
      const data = orderRes.data;
      if (!orderRes.ok || data.error) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Order creation failed",
        );
      }
      if (!data.live) {
        throw new Error("Duffel is not configured");
      }

      // Step 3 — ticket issued.
      setCurrent("issue");
      setSub("Ticket issued");
      setBooking(false);
      setFlow({
        order: data.order as OrderRecord,
        txHash: tx,
        chain: chain.id,
      });
      toast(
        "success",
        `Booking confirmed · ${(data.order as OrderRecord)?.bookingRef}`,
      );
      router.push("/ticket");
    } catch (err) {
      setBooking(false);
      setError(
        err instanceof Error && err.name === "AbortError"
          ? "Booking is taking too long. Please try again."
          : err instanceof Error
            ? err.message
            : "Booking could not be issued.",
      );
    }
  }, [tx, amount, chain.id, offerId, payer, state.nimiqAddress, flow, setFlow, toast, router]);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void runFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepIndex = ["verify", "settle", "issue"].indexOf(current);
  const steps = [
    { title: "On-Chain Payment Verification", done: "Verified & Secured" },
    { title: "Instant Settlement", done: "Settled" },
    { title: "Airline Ticket Issuance", done: "Issued" },
  ];

  return (
    <MobileShell header={<><div className="flex h-[60px] items-center bg-background px-4">
            <h1 className="text-[18px] font-extrabold leading-6 text-foreground">
              Processing Booking
            </h1>
          </div></>}>
      <div className="flex min-h-full flex-col justify-between">
        <div className="w-full">
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
                            className="text-accent-fg"
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
                            active ? "text-accent-fg" : done ? "text-accent-fg" : "text-muted"
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
                <div className="flex w-full gap-2">
                  <button
                    onClick={() => void runFlow()}
                    className="tap flex h-10 flex-1 items-center justify-center rounded-xl border border-accent-2 bg-accent px-4 text-[13px] font-bold text-accent-2"
                  >
                    Try Again
                  </button>
                  <Link
                    href="/checkout"
                    className="flex h-10 flex-1 items-center justify-center rounded-xl border border-border bg-card-2 px-4 text-[13px] font-semibold text-foreground"
                  >
                    Back to Checkout
                  </Link>
                </div>
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
                    className="flex items-center gap-1 text-[14px] font-semibold text-accent-fg"
                  >
                    {shortHash(tx)}
                    <ExternalLink size={12} />
                  </Link>
                  <button
                    onClick={() => navigator.clipboard?.writeText(tx)}
                    className="text-accent-fg"
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