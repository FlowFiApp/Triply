"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Clock,
  Luggage,
  Minus,
  Plus,
  ShieldCheck,
  Ticket,
  Wallet,
} from "lucide-react";
import { MobileShell } from "@/components/shell";

export type SheetKind = "class" | "filter" | "wallet" | "rules";

function ActionBar({ label, onApply }: { label: string; onApply: () => void }) {
  return (
    <>
      <div aria-hidden className="h-[84px] w-full shrink-0" />
      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[768px] -translate-x-1/2 border-t border-border bg-card px-4 pb-[30px] pt-5">
        <button
          onClick={onApply}
          className="flex h-12 w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2"
        >
          {label}
        </button>
      </div>
    </>
  );
}

function Title({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-3">
      <h1 className="text-[18px] font-extrabold leading-6 text-foreground">
        {children}
      </h1>
    </div>
  );
}

function ClassContent() {
  const [counts, setCounts] = useState({ Adults: 2, Children: 0, Infants: 0 });
  const [cabin, setCabin] = useState("Economy");
  const rows = [
    { key: "Adults" as const, sub: "Age 12 or above" },
    { key: "Children" as const, sub: "Age 2 - 11" },
    { key: "Infants" as const, sub: "Under 2 years" },
  ];
  return (
    <>
      <Title>Passengers &amp; Cabin</Title>
      <div className="flex flex-col gap-4 px-4 py-5">
        {rows.map((r) => (
          <div
            key={r.key}
            className="flex items-center justify-between border-b border-border pb-3"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold text-foreground">
                {r.key}
              </span>
              <span className="text-[12px] text-muted">{r.sub}</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() =>
                  setCounts((c) => ({
                    ...c,
                    [r.key]: Math.max(0, c[r.key] - 1),
                  }))
                }
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card-2 text-muted"
              >
                <Minus size={16} />
              </button>
              <span className="w-4 text-center text-[16px] font-bold text-foreground">
                {counts[r.key]}
              </span>
              <button
                onClick={() =>
                  setCounts((c) => ({ ...c, [r.key]: c[r.key] + 1 }))
                }
                className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-2"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 px-4 py-5">
        <span className="text-[14px] font-bold text-muted">Cabin Class</span>
        <div className="flex flex-col gap-2">
          {["Economy", "Premium Economy", "Business", "First Class"].map(
            (c) => {
              const selected = cabin === c;
              return (
                <button
                  key={c}
                  onClick={() => setCabin(c)}
                  className={`flex h-[43px] items-center justify-between rounded-[10px] border bg-card px-3 text-[14px] font-semibold text-foreground ${
                    selected ? "border-accent-2" : "border-border"
                  }`}
                >
                  {c}
                  <span
                    className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border ${
                      selected ? "border-accent-2" : "border-border"
                    }`}
                  >
                    {selected ? (
                      <span className="h-2 w-2 rounded-full bg-accent-2" />
                    ) : null}
                  </span>
                </button>
              );
            },
          )}
        </div>
      </div>
    </>
  );
}

function FilterContent() {
  const [stops, setStops] = useState("Non-stop");
  const [airlines, setAirlines] = useState([
    "British Airways",
    "Qatar Airways",
  ]);
  return (
    <>
      <Title>Filter &amp; Sort</Title>
      <div className="flex flex-col gap-3 px-4 py-5">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-bold text-muted">Price Range</span>
          <span className="text-[14px] font-bold text-accent-fg">
            200 - 3,000 USDT
          </span>
        </div>
        <div className="relative h-6 w-full">
          <span className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-card-3" />
          <span className="absolute top-1/2 h-1 w-[63%] -translate-y-1/2 rounded-full bg-accent-2" />
          <span className="absolute left-0 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-accent-2 bg-accent" />
          <span className="absolute left-[63%] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-accent-2 bg-accent" />
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4 py-5">
        <span className="text-[14px] font-bold text-muted">Stops</span>
        <div className="flex gap-2">
          {["Non-stop", "1 Stop", "2+ Stops"].map((s) => (
            <button
              key={s}
              onClick={() => setStops(s)}
              className={`flex h-[33px] items-center rounded-full border px-4 text-[13px] ${
                stops === s
                  ? "border-accent-2 bg-accent font-semibold text-accent-2"
                  : "border-border bg-card font-normal text-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4 py-5">
        <span className="text-[14px] font-bold text-muted">Airlines</span>
        <div className="flex flex-col gap-2">
          {[
            "British Airways",
            "Qatar Airways",
            "Emirates",
            "Turkish Airlines",
          ].map((a) => {
            const checked = airlines.includes(a);
            return (
              <button
                key={a}
                onClick={() =>
                  setAirlines((prev) =>
                    prev.includes(a)
                      ? prev.filter((x) => x !== a)
                      : [...prev, a],
                  )
                }
                className="flex h-[39px] items-center justify-between rounded-lg border border-border bg-card px-2.5 text-[14px] text-foreground"
              >
                {a}
                <span
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded ${
                    checked ? "bg-accent-2" : "border border-border bg-card"
                  }`}
                >
                  {checked ? (
                    <Check size={10} className="text-accent" strokeWidth={3} />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function WalletContent() {
  return (
    <>
      <Title>Select Wallet to Pay</Title>
      <div className="flex flex-col gap-2 px-4 py-5">
        <div className="flex h-[60px] items-center gap-3 rounded-xl border border-accent-2 bg-card p-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
            <Wallet size={16} className="text-accent-fg" />
          </span>
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-[14px] font-bold text-foreground">
              Nimiq Pay
            </span>
            <span className="text-[11px] text-muted">
              Pay directly from your Nimiq Pay wallet
            </span>
          </span>
          <ChevronRight size={14} className="text-muted" />
        </div>
      </div>
      <div className="px-4 py-4 text-center">
        <p className="text-[12px] text-muted">
          Powered by Web3 payment infrastructure. Zero setup required.
        </p>
      </div>
    </>
  );
}

function RulesContent() {
  const rules = [
    {
      icon: ShieldCheck,
      label: "Refundable Status",
      value: "Fully Refundable",
      color: "#22c55e",
    },
    {
      icon: Clock,
      label: "Cancellation Window",
      value: "Free cancellation within 24 hours",
      color: "#22c55e",
    },
    {
      icon: Ticket,
      label: "Change Fee Breakdown",
      value: "100 USDT change fee before departure",
      color: "#ef4444",
    },
    {
      icon: Luggage,
      label: "Baggage Inclusion",
      value: "1x 23kg checked bag, 1x 7kg cabin",
      color: "#22c55e",
    },
  ];
  return (
    <>
      <Title>Fare Rules &amp; Refund Policy</Title>
      <div className="flex flex-col gap-3 px-4 py-5">
        {rules.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.label}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5"
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: r.color }}
              >
                <Icon size={14} className="text-white" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold text-muted">
                  {r.label}
                </span>
                <span className="text-[14px] font-bold text-foreground">
                  {r.value}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

const CONFIG: Record<
  SheetKind,
  { label: string; back: string; content: ReactNode }
> = {
  class: {
    label: "Apply Selection",
    back: "/passengers",
    content: <ClassContent />,
  },
  filter: {
    label: "Apply Filters",
    back: "/search",
    content: <FilterContent />,
  },
  wallet: { label: "Continue", back: "/checkout", content: <WalletContent /> },
  rules: {
    label: "Got It, Dismiss",
    back: "/flight",
    content: <RulesContent />,
  },
};

export default function SheetFull({ kind }: { kind: SheetKind }) {
  const cfg = CONFIG[kind] ?? CONFIG.class;
  return (
    <MobileShell>
      <div className="flex min-h-full flex-col justify-between">
        <div className="w-full">
          <div className="flex h-6 items-center justify-center pt-2.5">
            <span className="h-1 w-10 rounded-full bg-card-3" />
          </div>
          {cfg.content}
        </div>
        <ActionBar label={cfg.label} onApply={() => {}} />
      </div>
      <Link href={cfg.back} className="sr-only">
        Back
      </Link>
    </MobileShell>
  );
}
