/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Sheet } from "@/components/ui";

type Seat = {
  id: string;
  name: string;
  type: string;
  available: boolean;
  serviceId?: string;
};

function flattenSeats(seatMap: any[]): Seat[] {
  const out: Seat[] = [];
  for (const map of seatMap ?? []) {
    for (const cabin of map.cabins ?? []) {
      for (const deck of cabin.decks ?? []) {
        for (const row of deck.rows ?? []) {
          for (const section of row.sections ?? []) {
            for (const seat of section.seats ?? []) {
              const svc = seat.available_services?.[0];
              out.push({
                id: seat.id,
                name: seat.name,
                type: seat.type ?? "",
                available: Boolean(seat.available_services?.length),
                serviceId: svc?.service_id ?? svc?.id,
              });
            }
          }
        }
      }
    }
  }
  return out;
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
  const [seats, setSeats] = useState<Seat[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch(`/api/flights/seatmap?offer=${encodeURIComponent(offerId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.seatMap?.length) setSeats(flattenSeats(d.seatMap));
        else setError(d.error ?? "No seat map available for this flight.");
      })
      .catch(() => setError("Failed to load the seat map."))
      .finally(() => setLoading(false));
  }, [open, offerId]);

  const selected = seats.find((s) => s.id === picked);

  return (
    <Sheet open={open} onClose={onClose} height="72vh">
      <div className="px-4 py-3">
        <h2 className="text-[18px] font-extrabold text-foreground">
          Choose your seat
        </h2>
        <p className="text-[12px] text-muted">
          Select an available seat on the map.
        </p>
      </div>

      <div className="px-4 pb-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-accent-fg" />
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-500">
            {error}
          </p>
        ) : seats.length ? (
          <div className="grid grid-cols-6 gap-1.5">
            {seats.map((s) => (
              <button
                key={s.id}
                disabled={!s.available}
                onClick={() => setPicked(s.id)}
                className={`flex h-9 items-center justify-center rounded-md text-[11px] font-semibold transition ${
                  !s.available
                    ? "cursor-not-allowed bg-card-2 text-muted/50"
                    : picked === s.id
                      ? "bg-accent text-accent-fg"
                      : "bg-accent-2 text-accent"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="px-4 pb-4 pt-2">
        <button
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
          className="flex h-12 w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2 disabled:opacity-50"
        >
          {selected ? `Select Seat ${selected.name}` : "Select an available seat"}
        </button>
      </div>
    </Sheet>
  );
}