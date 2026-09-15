"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type DateRange = { start: string; end: string };

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function formatDateLabel(iso: string) {
  if (!iso) return "Select";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Select";
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function MonthGrid({
  year,
  month,
  start,
  end,
  onPick,
}: {
  year: number;
  month: number;
  start: string;
  end: string;
  onPick: (iso: string) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const total = daysInMonth(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);

  return (
    <div className="flex-1">
      <p className="mb-2 text-center text-[13px] font-bold text-foreground">
        {MONTHS[month]} {year}
      </p>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="text-center text-[10px] font-semibold text-muted">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={i} />;
          const iso = toISO(new Date(year, month, d));
          const isStart = iso === start;
          const isEnd = iso === end;
          const inRange = start && end && iso > start && iso < end;
          return (
            <button
              key={i}
              onClick={() => onPick(iso)}
              className={`flex h-8 items-center justify-center rounded-lg text-[12px] font-medium transition ${
                isStart || isEnd
                  ? "bg-accent text-accent-2"
                  : inRange
                    ? "bg-accent/15 text-foreground"
                    : "text-foreground hover:bg-card-2"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DateRangePicker({
  open,
  initial,
  onApply,
  onClose,
}: {
  open: boolean;
  initial?: Partial<DateRange>;
  onApply: (range: DateRange) => void;
  onClose: () => void;
}) {
  const [start, setStart] = useState(initial?.start ?? "");
  const [end, setEnd] = useState(initial?.end ?? "");
  const [view, setView] = useState(() => {
    const base = initial?.start ? new Date(initial.start) : new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  if (!open) return null;

  const pick = (iso: string) => {
    if (!start || (start && end)) {
      setStart(iso);
      setEnd("");
    } else if (iso < start) {
      setStart(iso);
    } else {
      setEnd(iso);
    }
  };

  const nextMonth = {
    year: view.month === 11 ? view.year + 1 : view.year,
    month: (view.month + 1) % 12,
  };

  const prev = () =>
    setView((v) =>
      v.month === 0
        ? { year: v.year - 1, month: 11 }
        : { year: v.year, month: v.month - 1 },
    );
  const next = () =>
    setView((v) =>
      v.month === 11
        ? { year: v.year + 1, month: 0 }
        : { year: v.year, month: v.month + 1 },
    );

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/60 animate-fade-in"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[768px] rounded-t-2xl border-t border-border bg-card p-5 pb-7 animate-sheet-up">
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={prev}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card-2 text-foreground"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[14px] font-bold text-foreground">
              {start ? formatDateLabel(start) : "Start"}
              {" — "}
              {end ? formatDateLabel(end) : "End"}
            </span>
          </div>
          <button
            onClick={next}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card-2 text-foreground"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex gap-4">
          <MonthGrid
            year={view.year}
            month={view.month}
            start={start}
            end={end}
            onPick={pick}
          />
          <div className="hidden sm:block">
            <MonthGrid
              year={nextMonth.year}
              month={nextMonth.month}
              start={start}
              end={end}
              onPick={pick}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              setStart("");
              setEnd("");
            }}
            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border bg-card text-[14px] font-semibold text-foreground"
          >
            Clear
          </button>
          <button
            disabled={!start}
            onClick={() => onApply({ start, end: end || start })}
            className="flex h-11 flex-[2] items-center justify-center rounded-xl border border-accent-2 bg-accent text-[14px] font-bold text-accent-2 disabled:opacity-50"
          >
            Apply Dates
          </button>
        </div>
      </div>
    </div>
  );
}