"use client";

import { useState } from "react";
import type { ReactNode } from "react";
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
import { Sheet } from "@/components/ui";

function SheetTitle({ children }: { children: ReactNode }) {
  return (
    <div className="px-5 py-3">
      <h2 className="text-[18px] font-extrabold leading-6 text-foreground">
        {children}
      </h2>
    </div>
  );
}

export function PassengerClassSheet({
  open,
  onClose,
  initial,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  initial?: { Adults?: number; Children?: number; Infants?: number; cabin?: string };
  onApply?: (
    counts: { Adults: number; Children: number; Infants: number },
    cabin: string,
  ) => void;
}) {
  const [counts, setCounts] = useState({
    Adults: initial?.Adults ?? 2,
    Children: initial?.Children ?? 0,
    Infants: initial?.Infants ?? 0,
  });
  const [cabin, setCabin] = useState(initial?.cabin ?? "Economy");

  const rows = [
    { key: "Adults" as const, sub: "Age 12 or above" },
    { key: "Children" as const, sub: "Age 2 - 11" },
    { key: "Infants" as const, sub: "Under 2 years" },
  ];
  const cabins = ["Economy", "Premium Economy", "Business", "First Class"];

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetTitle>Passengers &amp; Cabin</SheetTitle>
      <div className="flex flex-col gap-4 px-5 py-5">
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

      <div className="flex flex-col gap-3 px-5 pb-4">
        <span className="text-[14px] font-bold text-muted">Cabin Class</span>
        <div className="flex flex-col gap-2">
          {cabins.map((c) => {
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
                    selected ? "border-accent-2 bg-[#f1f5f9] dark:bg-[#090d1a]" : "border-border"
                  }`}
                >
                  {selected ? (
                    <span className="h-2 w-2 rounded-full bg-accent-2" />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 pb-4 pt-2">
        <button
          onClick={() => {
            onApply?.(counts, cabin);
            onClose();
          }}
          className="flex h-12 w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2"
        >
          Apply Selection
        </button>
      </div>
    </Sheet>
  );
}

export function FilterSortSheet({
  open,
  onClose,
  airlines = [],
  priceRange,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  airlines?: string[];
  priceRange?: [number, number];
  onApply?: (price: [number, number], selectedAirlines: string[]) => void;
}) {
  const [stops, setStops] = useState("Non-stop");
  const [checked, setChecked] = useState<string[]>(airlines.slice(0, 2));
  const [range, setRange] = useState<[number, number]>(
    priceRange ?? [200, 3000],
  );
  const list = airlines.length ? airlines : ["No airlines returned"];
  const min = priceRange?.[0] ?? 200;
  const max = priceRange?.[1] ?? 3000;

  const setMin = (v: number) =>
    setRange((prev) => [Math.min(v, prev[1] - 50), prev[1]]);
  const setMax = (v: number) =>
    setRange((prev) => [prev[0], Math.max(v, prev[0] + 50)]);

  const apply = () => {
    onApply?.(range, checked);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetTitle>Filter &amp; Sort</SheetTitle>

      <div className="flex flex-col gap-3 px-5 py-5">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-bold text-muted">Price Range</span>
          <span className="text-[14px] font-bold text-accent-2">
            ${range[0].toLocaleString()} - ${range[1].toLocaleString()}
          </span>
        </div>
        <div className="relative h-6 w-full">
          <span className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-card-3" />
          <span
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent-2"
            style={{
              left: `${((range[0] - min) / (max - min)) * 100}%`,
              width: `${((range[1] - range[0]) / (max - min)) * 100}%`,
            }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={25}
            value={range[0]}
            onChange={(e) => setMin(Number(e.target.value))}
            className="pointer-events-none absolute left-0 top-1/2 h-5 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-accent-2 [&::-webkit-slider-thumb]:bg-accent"
          />
          <input
            type="range"
            min={min}
            max={max}
            step={25}
            value={range[1]}
            onChange={(e) => setMax(Number(e.target.value))}
            className="pointer-events-none absolute left-0 top-1/2 h-5 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-accent-2 [&::-webkit-slider-thumb]:bg-accent"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 px-5 py-5">
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

      <div className="flex flex-col gap-3 px-5 py-5">
        <span className="text-[14px] font-bold text-muted">Airlines</span>
        <div className="flex flex-col gap-2">
          {list.map((a) => {
            const isChecked = checked.includes(a);
            return (
              <button
                key={a}
                onClick={() =>
                  setChecked((prev) =>
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
                    isChecked ? "bg-accent-2" : "border border-border bg-card"
                  }`}
                >
                  {isChecked ? (
                    <Check size={10} className="text-accent" strokeWidth={3} />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 pb-4 pt-2">
        <button
          onClick={apply}
          className="flex h-12 w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2"
        >
          Apply Filters
        </button>
      </div>
    </Sheet>
  );
}

export function WalletConnectSheet({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (name: string) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose}>
      <SheetTitle>Select Wallet to Pay</SheetTitle>
      <div className="flex flex-col gap-2 px-5 py-5">
        <button
          onClick={() => onSelect("Nimiq Pay")}
          className="flex h-[60px] items-center gap-3 rounded-xl border border-accent-2 bg-card p-3 text-left"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
            <Wallet size={16} className="text-accent-2" />
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
        </button>
      </div>
      <div className="border-t border-border px-5 py-4 text-center">
        <p className="text-[12px] text-muted">
          Powered by Web3 payment infrastructure. Zero setup required.
        </p>
      </div>
    </Sheet>
  );
}

export function FareRulesSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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
    <Sheet open={open} onClose={onClose}>
      <SheetTitle>Fare Rules &amp; Refund Policy</SheetTitle>
      <div className="flex flex-col gap-3 px-5 py-5">
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
                <Icon size={14} style={{ color: r.color }} className="text-white" />
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
      <div className="px-5 pb-4 pt-2">
        <button
          onClick={onClose}
          className="flex h-12 w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2"
        >
          Got It, Dismiss
        </button>
      </div>
    </Sheet>
  );
}