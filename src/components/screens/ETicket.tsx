"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BedDouble, Calendar, Car, Check, ChevronRight, Download, Share2 } from "lucide-react";
import { BottomTabBar, MobileShell } from "@/components/shell";
import { UsdtAmount } from "@/components/ui/Usdt";
import BookingQR from "@/components/ui/booking-qr";
import Identicon from "@/components/ui/identicon";
import { ProgressButton } from "@/components/ui/progress-button";
import { useFlow } from "@/lib/flow-context";
import { useToast } from "@/lib/toast";
import { share } from "@/lib/share";
import { downloadIcs } from "@/lib/calendar";
import { shortHash } from "@/lib/nimiq";
import { CHAINS } from "@/lib/wallet";
import type { OrderRecord } from "@/lib/types";

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted">{label}</span>
      <span className="text-[14px] font-bold text-foreground">{value}</span>
    </div>
  );
}

export default function ETicket() {
  const { flow } = useFlow();
  const [order, setOrder] = useState<OrderRecord | null>(
    () => flow.order ?? null,
  );
  const [error, setError] = useState("");
  const { toast } = useToast();
  const txHash = flow.txHash ?? "";
  const chain = CHAINS.polygon;

  const cancelled = order?.status === "cancelled";
  const awaiting = order?.status === "awaiting_payment";

  const handleShare = async () => {
    const result = await share({
      title: `Triply · ${order?.bookingRef ?? "E-Ticket"}`,
      text: `Boarding pass ${order?.bookingRef ?? ""} — ${order?.airline ?? ""} ${order?.flightNumber ?? ""}`,
      url: typeof window !== "undefined" ? window.location.href : "",
    });
    toast(
      result === "shared" ? "success" : "info",
      result === "shared"
        ? "Ticket shared."
        : result === "copied"
          ? "Link copied to clipboard."
          : "Sharing is not available on this device.",
    );
  };

useEffect(() => {
    if (order || !flow.orderId) return;
    let ignore = false;
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => {
        if (ignore) return;
        const found = d.orders?.find((o: OrderRecord) => o.id === flow.orderId);
        if (found) setOrder(found);
        else setError("Order not found.");
      })
      .catch(() => {
        if (!ignore) setError("Failed to load the order.");
      });
    return () => {
      ignore = true;
    };
  }, [order, flow.orderId]);

  if (!order) {
    return (
      <MobileShell>
        <div className="flex min-h-full flex-col items-center justify-center gap-3 px-10 text-center">
          <p className="text-[16px] font-bold text-foreground">E-Ticket</p>
          <p className="text-[13px] text-muted">
            {error || "No issued ticket yet. Complete a booking to generate one."}
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
              href="/trips"
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
            <h1 className="text-[18px] font-extrabold text-foreground">E-Ticket</h1>
          </div></>}>
      <div className="flex min-h-full flex-col justify-between">
        <div className="w-full">
                 <div className="flex flex-col gap-4 px-4 py-5">
<div
              className={`flex items-center gap-3 rounded-xl px-3 py-3 ${
                cancelled
                  ? "bg-red-500/15"
                  : awaiting
                    ? "bg-amber-500/15"
                    : "bg-[#22c55e]"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                  cancelled ? "bg-red-500" : awaiting ? "bg-amber-500" : "bg-[#22c55e]"
                }`}
              >
                <Check
                  size={14}
                  strokeWidth={3}
                  className={cancelled || awaiting ? "text-white" : "text-white"}
                />
              </span>
              <div className="flex flex-col">
                <span
                  className={`text-[16px] font-bold ${
                    cancelled || awaiting ? "text-red-500" : "text-white"
                  } ${awaiting && !cancelled ? "!text-amber-500" : ""}`}
                >
                  {cancelled
                    ? "Booking Cancelled"
                    : awaiting
                      ? "Payment Pending"
                      : "Booking Confirmed!"}
                </span>
                <span
                  className={`text-[12px] ${
                    cancelled || awaiting ? "text-muted" : "text-white/80"
                  }`}
                >
                  {cancelled
                    ? "This flight was cancelled and the refund applied."
                    : awaiting
                      ? "Awaiting payment confirmation."
                      : "Your flight ticket is secured on-chain"}
                </span>
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-border bg-card">
              <div className="flex flex-col gap-4 p-[18px]">
                <div className="flex items-center justify-between">
<div className="flex items-center gap-2">
                    {order.airlineLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={order.airlineLogo}
                        alt={order.airline}
                        className="h-6 w-6 shrink-0 object-contain"
                      />
                    ) : (
                      <Identicon seed={`${order.airlineCode}${order.flightNumber}`} size={24} />
                    )}
                    <span className="text-[14px] font-bold text-foreground">
                      {order.airline}
                    </span>
                  </div>
                  <span className="text-[13px] text-muted">
                    {order.flightNumber}
                  </span>
                </div>

                <div className="flex items-center justify-between">
<div className="flex flex-col gap-1">
                    <span className="text-[28px] font-extrabold leading-[37px] text-foreground">
                      {order.depCode}
                    </span>
                    <span className="text-[12px] text-muted">
                      {order.depCity}
                      {order.depAirport ? ` · ${order.depAirport}` : ""}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M2 14l20-8-5 10-4-3-3 4-1-8-7-3z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                        className="text-accent-fg"
                      />
                    </svg>
                    <span className="text-[10px] text-muted">{order.duration}</span>
                  </div>
<div className="flex flex-col items-end gap-1">
                    <span className="text-[28px] font-extrabold leading-[37px] text-foreground">
                      {order.arrCode}
                    </span>
                    <span className="text-[12px] text-muted">
                      {order.arrCity}
                      {order.arrAirport ? ` · ${order.arrAirport}` : ""}
                    </span>
                  </div>
                </div>

                <div className="h-px w-full bg-border" />

                <div className="flex flex-col gap-3">
                  <div className="flex justify-between">
                    <Cell label="Passenger" value={order.passengerName} />
                    <Cell label="Class" value={order.cabin} />
                    <Cell label="Seat" value={order.seat} />
                  </div>
                  <div className="flex justify-between">
                    <Cell label="Terminal" value={order.terminal} />
                    <Cell label="Gate" value={order.gate} />
                    <Cell label="Departure" value={order.depTime} />
                  </div>
                </div>
              </div>

              <div className="relative flex h-5 items-center">
                <span className="absolute -left-2.5 h-5 w-5 rounded-full bg-background" />
                <span className="h-px flex-1 bg-border" />
                <span className="absolute -right-2.5 h-5 w-5 rounded-full bg-background" />
              </div>

              <div className="flex flex-col items-center gap-3 p-[18px]">
                <span className="text-[11px] font-semibold text-muted">
                  Booking Reference (PNR)
                </span>
                <span className="text-[22px] font-extrabold leading-[29px] text-foreground">
                  {order.bookingRef}
                </span>
                <BookingQR value={`TRIPLY:${order.bookingRef}:${order.id}`} />
              </div>
            </div>

            {txHash ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
                <span className="text-[13px] font-bold text-foreground">
                  Payment receipt
                </span>
                <div className="flex justify-between">
                  <span className="text-[12px] text-muted">Amount paid</span>
<span className="text-[12px] font-semibold text-foreground">
                    <UsdtAmount value={order.amountUsd} />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[12px] text-muted">Network</span>
                  <span className="text-[12px] font-semibold text-foreground">
                    {chain?.name ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] text-muted">Transaction</span>
                  <Link
                    href={chain?.explorer ? `${chain.explorer}/tx/${txHash}` : "#"}
                    target="_blank"
                    className="truncate text-[12px] font-semibold text-accent-fg"
                  >
{shortHash(txHash)}
                  </Link>
                </div>
              </div>
            ) : null}

<div className="flex gap-2">
              <button
                onClick={() =>
                  downloadIcs({
                    title: `${order?.airline ?? "Flight"} ${order?.flightNumber ?? ""}`,
                    location: `${order?.depCity ?? ""} (${order?.depCode ?? ""})`,
                    description: `Booking ${order?.bookingRef ?? ""} — ${order?.arrCity ?? ""} (${order?.arrCode ?? ""})`,
                    start: order?.departureDate ?? new Date().toISOString().slice(0, 10),
                  })
                }
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-card text-[12px] font-semibold text-foreground"
              >
                <Calendar size={14} className="text-accent-fg" />
                Add to Calendar
              </button>
              <button
                onClick={() => {
                  toast("info", "Use your browser's Save as PDF to download.");
                  window.print();
                }}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-card text-[12px] font-semibold text-foreground"
              >
                <Download size={14} className="text-accent-fg" />
                Download PDF
              </button>
              <ProgressButton
                onAction={handleShare}
                busyLabel="Sharing…"
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-card text-[12px] font-semibold text-foreground"
              >
                <Share2 size={14} className="text-accent-fg" />
                Share
              </ProgressButton>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-[15px] font-bold text-foreground">
                Complete your trip
              </h3>
              <Link
                href="/stays"
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card-2">
                  <BedDouble size={18} className="text-accent-fg" />
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="text-[14px] font-bold text-foreground">
                    Book a stay
                  </span>
                  <span className="text-[12px] text-muted">
                    Hotels in {order.arrCity || "your destination"}
                  </span>
                </span>
                <ChevronRight size={16} className="text-muted" />
              </Link>
              <Link
                href="/cars"
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card-2">
                  <Car size={18} className="text-accent-fg" />
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="text-[14px] font-bold text-foreground">
                    Rent a car
                  </span>
                  <span className="text-[12px] text-muted">
                    Get around {order.arrCity || "your destination"}
                  </span>
                </span>
                <ChevronRight size={16} className="text-muted" />
              </Link>
            </div>
          </div>
        </div>

        <BottomTabBar active="Home" />
      </div>
    </MobileShell>
  );
}
