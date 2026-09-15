"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plane, SlidersHorizontal } from "lucide-react";
import {
  BottomTabBar,
  MobileShell,
} from "@/components/shell";
import { Chip } from "@/components/ui";
import Identicon from "@/components/ui/identicon";
import { FilterSortSheet } from "@/components/screens/sheets";
import { EmptyState, Price, SkeletonRows } from "@/components/ui/feedback";
import { useQueryParam } from "@/lib/query";
import { writeFlow } from "@/lib/store";
import type { FlightOffer } from "@/lib/types";

const FILTERS = ["Cheapest", "Fastest", "Non-stop", "Earliest"] as const;

function FlightCard({ offer }: { offer: FlightOffer }) {
  const router = useRouter();
  const select = () => {
    writeFlow({ offer });
    router.push(`/flight?offer=${encodeURIComponent(offer.id)}`);
  };
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between">
<div className="flex items-center gap-2">
          <Identicon seed={`${offer.airlineCode}${offer.flightNumber}`} size={36} />
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold leading-4 text-foreground">
              {offer.airline}
            </span>
            <span className="text-[11px] text-muted">
              Flight {offer.airlineCode}
              {offer.flightNumber}
            </span>
          </div>
        </div>
<div className="flex flex-col items-end">
          <Price usd={offer.price} className="text-[18px] leading-6 text-foreground" bold />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[18px] font-bold leading-6 text-foreground">
            {offer.depTime}
          </span>
          <span className="text-[12px] text-muted">{offer.origin}</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 px-4">
          <span className="text-[11px] text-muted">{offer.duration}</span>
          <div className="flex w-full items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-muted" />
            <span className="h-px flex-1 bg-border" />
            <Plane size={12} className="text-accent-2" />
            <span className="h-px flex-1 bg-border" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted" />
          </div>
          <span className="text-[10px] font-semibold text-accent-2">
            {offer.stops}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[18px] font-bold leading-6 text-foreground">
            {offer.arrTime}
          </span>
          <span className="text-[12px] text-muted">{offer.destination}</span>
        </div>
      </div>

      <button
        onClick={select}
        className="flex h-[37px] w-full items-center justify-center rounded-lg border border-border bg-card-2 text-[13px] font-semibold text-accent-2"
      >
        Select Flight
      </button>
    </div>
  );
}

export default function SearchResults() {
  const router = useRouter();
const origin = useQueryParam("origin", "LAX");
  const destination = useQueryParam("destination", "LHR");
  const date = useQueryParam("date", "2026-10-24");
  const returnDate = useQueryParam("returnDate", "");
  const passengers = useQueryParam("passengers", "2");
  const cabin = useQueryParam("cabin", "economy");
  const multiCity = useQueryParam("multiCity", "");
  const slicesParam = useQueryParam("slices", "");
  const slices = useMemo(() => {
    try {
      const parsed = JSON.parse(slicesParam) as {
        origin: string;
        destination: string;
        departureDate: string;
      }[];
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }, [slicesParam]);
  const isMultiCity = multiCity === "1" || Boolean(slices?.length);

  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterOpen, setFilterOpen] = useState(
    useQueryParam("sheet", "") === "filter",
  );
  const [active, setActive] = useState<(typeof FILTERS)[number]>("Cheapest");
  const [filters, setFilters] = useState<{
    price?: [number, number];
    airlines?: string[];
  }>({});

  useEffect(() => {
    let ignore = false;
    fetch("/api/flights/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
body: JSON.stringify({
        origin,
        destination,
        departureDate: date,
        returnDate: returnDate || undefined,
        passengers: Number(passengers) || 1,
        cabinClass: cabin,
        slices,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (ignore) return;
        if (d.error) {
          setError(d.error);
          setOffers([]);
} else if (d.live) {
          setOffers(d.offers);
          writeFlow({
            offers: d.offers,
            passengers: Number(passengers) || 1,
          });
        } else {
          setError("Live search unavailable — is DUFFEL_ACCESS_TOKEN configured?");
          setOffers([]);
        }
      })
      .catch(() => {
        if (!ignore) setError("Failed to load flights.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
return () => {
      ignore = true;
    };
  }, [origin, destination, date, returnDate, passengers, cabin, slices]);

  const prices = useMemo(
    () =>
      offers.length
        ? [
            Math.min(...offers.map((o) => o.price)),
            Math.max(...offers.map((o) => o.price)),
          ]
        : [0, 0],
    [offers],
  );

  const filtered = useMemo(() => {
    const next = offers.filter((o) => {
      if (filters.price && (o.price < filters.price[0] || o.price > filters.price[1]))
        return false;
      if (filters.airlines?.length && !filters.airlines.includes(o.airline))
        return false;
      return true;
    });
    if (active === "Cheapest") next.sort((a, b) => a.price - b.price);
    if (active === "Fastest") next.sort((a) => (a.direct ? -1 : 1));
    if (active === "Earliest") next.sort((a, b) => a.depTime.localeCompare(b.depTime));
    return next;
  }, [offers, filters, active]);

  const displayed = active === "Non-stop" ? filtered.filter((o) => o.direct) : filtered;
  const airlines = useMemo(
    () => Array.from(new Set(offers.map((o) => o.airline).filter(Boolean))),
    [offers],
  );
  const directCount = offers.filter((o) => o.direct).length;

  return (
    <MobileShell>
      <div className="flex min-h-screen flex-col justify-between">
        <div className="w-full">
          <div className="sticky top-0 z-30 flex h-[60px] items-center gap-3 bg-card px-4 py-3">
            <button
              onClick={() => router.push("/")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-card-2 text-foreground"
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
            </button>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-[16px] font-bold leading-[21px] text-foreground">
                {origin} to {destination}
              </h1>
<p className="text-[12px] text-muted">
                {isMultiCity
                  ? `${slices?.length ?? 1} Legs • ${passengers} Passengers`
                  : `${date} • ${passengers} Passengers • ${cabin.charAt(0).toUpperCase() + cabin.slice(1)}`}
              </p>
            </div>
          </div>

          <div className="flex h-[60px] items-center gap-2 px-4 py-3">
            <button
              onClick={() => setFilterOpen(true)}
              aria-label="Open filters"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-accent-2 ${
                filters.price || filters.airlines?.length
                  ? "bg-accent-2 text-accent"
                  : "bg-accent text-accent-2"
              }`}
            >
              <SlidersHorizontal size={16} />
            </button>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {FILTERS.map((f) => (
                <Chip key={f} active={active === f} onClick={() => setActive(f)}>
                  {f}
                  {f === "Non-stop" && directCount > 0 ? (
                    <span className="ml-1 rounded-full bg-accent/20 px-1 text-[10px]">
                      {directCount}
                    </span>
                  ) : null}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 px-4 pb-6">
            {loading ? <SkeletonRows rows={3} height={176} /> : null}

            {!loading && error ? (
              <EmptyState
                icon={<Plane size={28} />}
                title="No flights found"
                message={error}
                action={
                  <button
                    onClick={() => router.push("/")}
                    className="mt-3 flex h-10 items-center rounded-xl border border-accent-2 bg-accent px-4 text-[13px] font-bold text-accent-2"
                  >
                    New Search
                  </button>
                }
              />
            ) : null}

            {!loading && !error && displayed.length === 0 ? (
              <EmptyState
                icon={<Plane size={28} />}
                title="No flights match your filters"
                message="Try widening the price range or clearing the airline selection."
                action={
                  <button
                    onClick={() => {
                      setFilters({});
                      setActive("Cheapest");
                    }}
                    className="mt-3 text-[12px] font-semibold text-accent-2"
                  >
                    Clear filters
                  </button>
                }
              />
            ) : null}

{!loading &&
              !error &&
              displayed.map((offer, i) => (
                <div
                  key={offer.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                >
                  <FlightCard offer={offer} />
                </div>
              ))}
          </div>
        </div>

        <BottomTabBar active="Explore" />
      </div>

      <FilterSortSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        airlines={airlines}
        priceRange={prices[1] > 0 ? (prices as [number, number]) : undefined}
        onApply={(price, selected) => {
          setFilters({ price, airlines: selected });
        }}
      />
    </MobileShell>
  );
}
