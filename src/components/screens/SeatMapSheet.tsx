/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Sheet } from "@/components/ui";

export type Seat = {
  id: string;
  name: string;
  type: string;
  available: boolean;
  serviceId?: string;
  price?: number;
  currency?: string;
};

type SeatRow = {
  key: string;
  sections: Seat[][];
};

// Seat maps are cabins → (decks) → rows → sections → elements. Sections are
// column groups (e.g. ABC | DEFG | HJK) — the gaps between them are the aisles.
function parseSeatMap(seatMap: any[]): { rows: SeatRow[]; cabinClass: string } {
  const rows: SeatRow[] = [];
  let cabinClass = "economy";
  for (const map of seatMap ?? []) {
    for (const cabin of map.cabins ?? []) {
      cabinClass = cabin.cabin_class ?? cabinClass;
      const decks = cabin.decks?.length ? cabin.decks : [cabin];
      for (const deck of decks) {
        for (const row of deck.rows ?? []) {
          const sections: Seat[][] = (row.sections ?? []).map((section: any) =>
            (section.elements ?? []).map((el: any, idx: number) => {
              const svc = el.available_services?.[0];
              return {
                id: `${map.id ?? "m"}-${deck.deck ?? "d"}-${row.id ?? ""}-${idx}`,
                name: el.designator ?? el.name ?? "",
                type: el.type ?? "seat",
                available: Boolean(el.available_services?.length),
                serviceId: svc?.id,
                price: Number(svc?.total_amount ?? 0),
                currency: svc?.total_currency,
              };
            }),
          );
          rows.push({
            key: `${deck.deck ?? "d"}-${row.id ?? rows.length}`,
            sections,
          });
        }
      }
    }
  }
  return { rows, cabinClass };
}

function renderElement(seat: Seat, pickedId: string | null, onPick: (s: Seat) => void) {
  const isSeat = seat.type === "seat" || seat.name;
  if (!isSeat) {
    // exit_row / lavatory / galley — keep the slot so columns align.
    return (
      <span
        key={seat.id}
        className="h-8 w-8 shrink-0 rounded-md border border-dashed border-border bg-card-2/40"
      />
    );
  }
  return (
    <button
      key={seat.id}
      disabled={!seat.available}
      onClick={() => onPick(seat)}
      aria-label={seat.name || "seat"}
      title={seat.available ? `${seat.name}${seat.price ? ` · ${seat.price}` : ""}` : `${seat.name} (unavailable)`}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold transition ${
        !seat.available
          ? "cursor-not-allowed bg-card-2 text-muted/40"
          : pickedId === seat.id
            ? "bg-accent text-accent-2 shadow"
            : "bg-accent-2 text-accent hover:brightness-95"
      }`}
    >
      {seat.name || (seat.available ? "✓" : "✕")}
    </button>
  );
}

export default function SeatMapSheet({
  open,
  onClose,
  offerId,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  offerId: string;
  onSelect: (seat: Seat) => void;
}) {
  const [rows, setRows] = useState<SeatRow[]>([]);
  const [cabinClass, setCabinClass] = useState("economy");
  const [picked, setPicked] = useState<Seat | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const reset = setTimeout(() => {
      setLoading(true);
      setError("");
      setRows([]);
      setPicked(null);
    }, 0);
    return () => clearTimeout(reset);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/flights/seatmap?offer=${encodeURIComponent(offerId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.seatMap?.length) {
          const parsed = parseSeatMap(d.seatMap);
          setRows(parsed.rows);
          setCabinClass(parsed.cabinClass);
        } else {
          setError(d.error ?? "No seat map available for this flight.");
        }
      })
      .catch(() => setError("Failed to load the seat map."))
      .finally(() => setLoading(false));
  }, [open, offerId]);

  const selected = picked;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      height="82vh"
      footer={
        <button
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
          className="flex h-12 w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2 disabled:opacity-50"
        >
          {selected
            ? `Select Seat ${selected.name}${selected.price ? ` · ${selected.price} ${selected.currency ?? ""}`.trim() : ""}`
            : "Select an available seat"}
        </button>
      }
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-extrabold text-foreground">
            Choose your seat
          </h2>
          <span className="rounded-full bg-card-2 px-2.5 py-1 text-[10px] font-bold capitalize text-muted">
            {cabinClass}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] text-muted">
          Select an available seat on the map.
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 pb-3 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-accent-2" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-card-2" /> Taken
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-accent" /> Selected
        </span>
      </div>

      <div className="px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-accent-fg" />
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-500">
            {error}
          </p>
        ) : rows.length ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card-2/40 p-4">
            {rows.map((row) => (
              <div key={row.key} className="flex items-center gap-3">
                {row.sections.map((section, si) => (
                  <div key={si} className="flex items-center gap-1.5">
                    {section.map((seat) =>
                      renderElement(seat, picked?.id ?? null, (s) =>
                        setPicked(s.available ? s : picked),
                      ),
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}