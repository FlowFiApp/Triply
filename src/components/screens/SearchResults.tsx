"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Plane, SlidersHorizontal } from "lucide-react";
import {
  BottomTabBar,
  MobileShell,
} from "@/components/shell";
import { Chip } from "@/components/ui";
import Identicon from "@/components/ui/identicon";
import { FilterSortSheet } from "@/components/screens/sheets";
import { EmptyState, Price, SkeletonRows } from "@/components/ui/feedback";
import { useFlow } from "@/lib/flow-context";
import { useFlightSearch } from "@/lib/api/hooks";
import type { FlightOffer } from "@/lib/types";

const FILTERS = ["Cheapest", "Fastest", "Non-stop", "Earliest"] as const;

function FlightCard({ offer }: { offer: FlightOffer }) {
  const router = useRouter();
  const { setFlow } = useFlow();
  const select = () => {
    setFlow({ offer });
    router.push("/flight");
  };
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between">
<div className="flex items-center gap-2">
          {offer.airlineLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={offer.airlineLogo}
              alt={offer.airline}
              className="h-9 w-9 shrink-0 object-contain"
            />
          ) : (
            <Identicon seed={`${offer.airlineCode}${offer.flightNumber}`} size={36} />
          )}
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold leading-4 text-foreground">
              {offer.airline}
            </span>
            <span className="text-[11px] text-muted">
              Flight {offer.airlineCode}
              {offer.flightNumber}
              {offer.cabin ? ` · ${offer.cabin}` : ""}
            </span>
            {(offer.aircraft || offer.totalBaggages || offer.emissionsKg) ? (
              <span className="text-[10px] text-muted">
                {[
                  offer.aircraft,
                  offer.totalBaggages
                    ? `${offer.totalBaggages} bag${offer.totalBaggages > 1 ? "s" : ""}`
                    : "",
                  offer.emissionsKg ? `🌱 ${offer.emissionsKg}kg CO₂` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            ) : null}
          </div>
        </div>
<div className="flex flex-col items-end">
          <Price usd={offer.price} className="text-[18px] leading-6 text-foreground" bold />
        </div>
      </div>

<div className="flex flex-col gap-1.5">
        <div className="flex items-stretch justify-between gap-2">
          <div className="flex min-w-0 flex-col text-left">
            <span className="block text-[20px] font-extrabold leading-6 text-foreground">
              {offer.depTime}
            </span>
            <span className="block text-[13px] font-semibold text-muted">
              {offer.origin}
            </span>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-1 px-2">
            <span className="text-[11px] text-muted">{offer.duration}</span>
            <div className="flex w-full items-center">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-2" />
              <span className="h-px flex-1 bg-border" />
              <span className="flex h-[14px] w-[14px] shrink-0 items-center justify-center text-accent-2">
                <ArrowUpRight size={13} strokeWidth={2.5} />
              </span>
              <span className="h-px flex-1 bg-border" />
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
            </div>
            <span className="text-[11px] font-semibold text-accent-2">
              {offer.stops}
            </span>
          </div>

          <div className="flex min-w-0 flex-col items-end text-right">
            <span className="block text-[20px] font-extrabold leading-6 text-foreground">
              {offer.arrTime}
            </span>
            <span className="block text-[13px] font-semibold text-muted">
              {offer.destination}
            </span>
          </div>
        </div>

        {/* Airport names on their own row — cannot affect the connector above */}
        <div className="flex items-start justify-between gap-2">
          <span className="w-[45%] line-clamp-2 text-[10px] leading-3 text-muted">
            {offer.originAirport ?? offer.originCity ?? ""}
          </span>
          <span className="w-[45%] line-clamp-2 text-right text-[10px] leading-3 text-muted">
            {offer.destinationAirport ?? offer.destinationCity ?? ""}
          </span>
        </div>
      </div>

      <button
        onClick={select}
        className="flex h-[37px] w-full items-center justify-center rounded-lg border border-border bg-card-2 text-[13px] font-semibold text-accent-fg"
      >
        Select Flight
      </button>
    </div>
  );
}

export default function SearchResults() {
  const router = useRouter();
  const { flow, setFlow } = useFlow();
  const search = flow.search;
  const origin = search?.origin ?? "LAX";
  const destination = search?.destination ?? "LHR";
  const date = search?.date ?? "2026-10-24";
  const returnDate = search?.returnDate ?? "";
  const passengers = String(search?.passengers ?? 2);
  const cabin = search?.cabin ?? "economy";
  const slices = search?.slices;
  const isMultiCity = Boolean(search?.multiCity) || Boolean(slices?.length);

  const [filterOpen, setFilterOpen] = useState(false);
  const [active, setActive] = useState<(typeof FILTERS)[number]>("Cheapest");
  const [filters, setFilters] = useState<{
    price?: [number, number];
    airlines?: string[];
    stops?: string;
  }>({});

  const flightSearch = useFlightSearch();

  useEffect(() => {
    flightSearch.mutate({
      origin,
      destination,
      departureDate: date,
      returnDate: returnDate || undefined,
      passengers: Number(passengers) || 1,
      cabinClass: cabin,
      slices,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, date, returnDate, passengers, cabin, slices]);

  useEffect(() => {
    if (flightSearch.data?.live) {
      setFlow({
        offers: flightSearch.data.offers,
        passengers: Number(passengers) || 1,
      });
    }
  }, [flightSearch.data, setFlow, passengers]);

  const offers = useMemo(() => flightSearch.data?.offers ?? [], [flightSearch.data]);
  const loading = flightSearch.isPending;
  const error =
    flightSearch.error instanceof Error
      ? flightSearch.error.message
      : flightSearch.data && !flightSearch.data.live
        ? "Live search unavailable — is DUFFEL_ACCESS_TOKEN configured?"
        : "";

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
      if (filters.stops === "Non-stop" && !o.direct) return false;
      if (filters.stops === "1 Stop" && o.stopsCount !== 1) return false;
      if (filters.stops === "2+ Stops" && (o.stopsCount ?? 0) < 2) return false;
      return true;
    });
    if (active === "Cheapest") next.sort((a, b) => a.price - b.price);
    if (active === "Fastest")
      next.sort((a, b) => (a.durationMinutes ?? 0) - (b.durationMinutes ?? 0));
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
    <MobileShell header={<><div className="flex h-[60px] items-center gap-3 bg-card px-4 py-3">
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
          </div></>}>
<div className="flex min-h-full flex-col justify-between">
        <div className="w-full">

<div className="flex h-[60px] items-center gap-2 py-3">
            <button
              onClick={() => setFilterOpen(true)}
              aria-label="Open filters"
              className={`ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-accent-2 ${
                filters.price || filters.airlines?.length
                  ? "bg-accent-2 text-accent"
                  : "bg-accent text-accent-2"
              }`}
            >
              <SlidersHorizontal size={16} />
            </button>
            <div className="flex gap-2 overflow-x-auto pr-4 no-scrollbar">
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
                    className="mt-3 text-[12px] font-semibold text-accent-fg"
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

        <BottomTabBar active="Home" />
      </div>

      <FilterSortSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        airlines={airlines}
        priceRange={prices[1] > 0 ? (prices as [number, number]) : undefined}
onApply={(price, selected, stops) => {
          setFilters({ price, airlines: selected, stops });
        }}
      />
    </MobileShell>
  );
}
