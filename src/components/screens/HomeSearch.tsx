"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  BedDouble,
  Calendar,
  Car,
  History,
  Plane,
  Plus,
  UserRound,
  X,
} from "lucide-react";
import {
  Avatar,
  BottomTabBar,
  BrandHeader,
  MobileShell,
} from "@/components/shell";
import {
  Avatar,
  BottomTabBar,
  BrandHeader,
  MobileShell,
} from "@/components/shell";
import CitiesSheet from "@/components/ui/cities-sheet";
import DateRangePicker, { formatDateLabel } from "@/components/ui/date-range-picker";
import { PassengerClassSheet } from "@/components/screens/sheets";
import PointsChip from "@/components/ui/points-chip";
import PopularDestinations from "@/components/ui/popular-destinations";
import AnimatedTabs from "@/components/ui/animated-tabs";
import { Skeleton } from "@/components/ui/feedback";
import { addRecentSearch, getRecentSearches, type SearchIntent } from "@/lib/store";
import { useFlow } from "@/lib/flow-context";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { haptic } from "@/lib/haptics";

const TRIP_TYPES = ["One Way", "Round Trip", "Multi-city"] as const;

const CABIN_TO_DUFFEL: Record<string, string> = {
  Economy: "economy",
  "Premium Economy": "premium_economy",
  Business: "business",
  "First Class": "first",
};

type Destination = {
  city: string;
  iata: string;
  name: string;
  country: string;
};

export default function HomeSearch() {
  const { setFlow } = useFlow();
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const [tripType, setTripType] = useState<(typeof TRIP_TYPES)[number]>("Round Trip");
  const [from, setFrom] = useState("LAX");
  const [to, setTo] = useState("LHR");
const [range, setRange] = useState({ start: "2026-10-24", end: "2026-11-08" });
  const [dateOpen, setDateOpen] = useState(false);
  const [paxOpen, setPaxOpen] = useState(false);
  const [pax, setPax] = useState({ Adults: 2, Children: 0, Infants: 0 });
  const [cabin, setCabin] = useState("Economy");
  const [extraLegs, setExtraLegs] = useState<
    { from: string; to: string; date: string }[]
  >([]);
  const [legDateOpen, setLegDateOpen] = useState(false);
  const [legDateIndex, setLegDateIndex] = useState(0);
const [destinations, setDestinations] = useState<Destination[]>([]);
  const [destinationsLive, setDestinationsLive] = useState(false);
  const [destLoading, setDestLoading] = useState(true);
  const [recent] = useState<string[]>(() => getRecentSearches());
  const [pickerFor, setPickerFor] = useState<
    | { kind: "main"; side: "from" | "to" }
    | { kind: "leg"; leg: number; side: "from" | "to" }
    | null
  >(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/destinations")
      .then((r) => r.json())
      .then((d) => {
        if (!ignore && d.live && d.destinations?.length) {
          setDestinations(d.destinations);
          setDestinationsLive(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setDestLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

const totalPax = pax.Adults + pax.Children + pax.Infants;

  const search = (origin: string, destination: string) => {
    if (!origin.trim() || !destination.trim()) {
      toast("error", "Enter both origin and destination to search.");
      return;
    }
    addRecentSearch(`${origin} → ${destination}`);
    const intent: SearchIntent = {
      origin,
      destination,
      date: range.start,
      passengers: totalPax || 1,
      cabin: CABIN_TO_DUFFEL[cabin] ?? "economy",
    };
    if (tripType === "Multi-city") {
      intent.slices = [
        { origin: from, destination: to, departureDate: range.start },
        ...extraLegs
          .filter((l) => l.from && l.to && l.date)
          .map((l) => ({ origin: l.from, destination: l.to, departureDate: l.date })),
      ];
      intent.multiCity = true;
    } else if (tripType !== "One Way") {
      intent.returnDate = range.end;
    }
    setFlow({ search: intent });
    router.push("/search");
  };

  const dateLabel =
    tripType === "One Way"
      ? "Departure"
      : tripType === "Multi-city"
        ? "Leg 1 Departure"
        : "Departure & Return";
  const dateValue =
    tripType === "One Way" || tripType === "Multi-city"
      ? formatDateLabel(range.start)
      : `${formatDateLabel(range.start)} — ${formatDateLabel(range.end)}`;

  const addLeg = () => {
    haptic();
    setExtraLegs((prev) => [...prev, { from: "", to: "", date: "" }]);
  };
  const updateLeg = (i: number, patch: Partial<{ from: string; to: string; date: string }>) =>
    setExtraLegs((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLeg = (i: number) => setExtraLegs((prev) => prev.filter((_, idx) => idx !== i));

  const [swapRot, setSwapRot] = useState(0);
  const swap = () => {
    const tmp = from;
    setFrom(to);
    setTo(tmp);
    setSwapRot((r) => r + 180);
  };

return (
    <MobileShell
      header={
        <BrandHeader
          right={
            <div className="flex items-center gap-2">
              <PointsChip />
              <Avatar />
            </div>
          }
        />
      }
    >
      <div className="flex min-h-full flex-col justify-between">
        <div className="w-full">

          <div className="px-4 py-3">
<div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-[18px]">
                <AnimatedTabs
                  id="trip-type"
                  options={[...TRIP_TYPES]}
                  value={tripType}
                  onChange={(v) => setTripType(v as (typeof TRIP_TYPES)[number])}
                  activeClassName="bg-accent"
                  selectedTextClassName="text-accent-2"
                />

<div className="flex items-center gap-4">
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-[11px] font-medium text-muted">Origin</span>
                  <button
                    onClick={() => setPickerFor({ kind: "main", side: "from" })}
                    className="text-left text-[28px] font-extrabold leading-[37px] text-foreground"
                  >
                    {from || "IATA"}
                  </button>
                </div>

                <motion.button
                  onClick={swap}
                  aria-label="Swap origin and destination"
                  animate={{ rotate: swapRot }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent-2 bg-accent text-accent-2"
                >
                  <ArrowLeftRight size={16} strokeWidth={2.5} />
                </motion.button>

                <div className="flex flex-1 flex-col items-end gap-1 text-right">
                  <span className="text-[11px] font-medium text-muted">
                    Destination
                  </span>
                  <button
                    onClick={() => setPickerFor({ kind: "main", side: "to" })}
                    className="text-right text-[28px] font-extrabold leading-[37px] text-foreground"
                  >
                    {to || "IATA"}
                  </button>
                </div>
              </div>

              <div className="h-px w-full bg-border" />

<button
                onClick={() => setDateOpen(true)}
                className="flex h-[60px] w-full items-center gap-3 rounded-xl border border-border bg-card-2 px-3 text-left"
              >
                <Calendar size={20} className="text-accent-fg" strokeWidth={2} />
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-muted">
                    {dateLabel}
                  </span>
                  <span className="text-[14px] font-semibold text-foreground">
                    {dateValue}
                  </span>
                </span>
              </button>

              <button
                onClick={() => setPaxOpen(true)}
                className="flex h-[60px] w-full items-center gap-3 rounded-xl border border-border bg-card-2 px-3 text-left"
              >
                <UserRound size={20} className="text-accent-fg" strokeWidth={2} />
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-muted">
                    Passengers &amp; Cabin
                  </span>
                  <span className="text-[14px] font-semibold text-foreground">
                    {totalPax} {totalPax === 1 ? "Person" : "People"}, {cabin}
                  </span>
                </span>
              </button>

{tripType === "Multi-city" ? (
                <>
                  {extraLegs.map((leg, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-3 rounded-xl border border-border bg-card-2 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-muted">
                          Leg {i + 2}
                        </span>
                        <button
                          onClick={() => removeLeg(i)}
                          aria-label="Remove leg"
                          className="text-muted"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setPickerFor({ kind: "leg", leg: i, side: "from" })
                          }
                          className="min-w-0 flex-1 text-left text-[16px] font-bold text-foreground"
                        >
                          {leg.from || "IATA"}
                        </button>
                        <ArrowLeftRight size={16} className="shrink-0 text-accent-fg" />
                        <button
                          onClick={() =>
                            setPickerFor({ kind: "leg", leg: i, side: "to" })
                          }
                          className="min-w-0 flex-1 text-right text-[16px] font-bold text-foreground"
                        >
                          {leg.to || "IATA"}
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setLegDateIndex(i);
                          setLegDateOpen(true);
                        }}
                        className="flex items-center gap-2 text-[13px] font-semibold text-foreground"
                      >
                        <Calendar size={16} className="text-accent-fg" />
                        {leg.date ? formatDateLabel(leg.date) : "Select date"}
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addLeg}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-[13px] font-semibold text-accent-fg"
                  >
                    <Plus size={14} /> Add another flight
                  </button>
                </>
              ) : null}

              <button
                onClick={() => {
                  haptic();
                  search(from, to);
                }}
                className="tap flex h-[49px] w-full items-center justify-center gap-2 rounded-xl border border-accent-2 bg-accent text-[16px] font-bold text-accent-2"
              >
<Plane size={18} strokeWidth={2.5} />
                {t("searchFlights")}
              </button>
            </div>
          </div>

          <div className="flex gap-3 px-4 pt-1">
            <Link
              href="/stays"
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-[13px] font-semibold text-foreground"
            >
              <BedDouble size={15} className="text-accent-fg" />
              Stays
            </Link>
            <Link
              href="/cars"
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-[13px] font-semibold text-foreground"
            >
              <Car size={15} className="text-accent-fg" />
              Cars
            </Link>
          </div>

          {destLoading ? (
            <section className="flex flex-col gap-3 pb-3 pt-6">
              <div className="px-4">
                <Skeleton className="h-5 w-40" />
              </div>
              <div className="flex gap-3.5 overflow-hidden px-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-[218px] w-[244px] shrink-0 rounded-2xl" />
                ))}
              </div>
            </section>
) : destinationsLive && destinations.length > 0 ? (
            <section className="flex flex-col gap-3 pb-3 pt-6">
              <h2 className="px-4 text-[16px] font-bold leading-[21px] text-foreground">
                Popular Destinations
              </h2>
              <PopularDestinations
                destinations={destinations.map((d, i) => ({
                  iata: d.iata,
                  city: d.city,
                  name: d.name,
                  country: d.country,
                  image: DEST_IMAGES[i % DEST_IMAGES.length],
                }))}
                onSelect={(iata) => search(from, iata)}
              />
            </section>
          ) : null}

          {recent.length > 0 ? (
            <section className="flex flex-col gap-3 px-4 pb-5 pt-3">
              <h2 className="text-[16px] font-bold leading-[21px] text-foreground">
                Recent Searches
              </h2>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
                {recent.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      const [o, d] = r.split(" → ");
                      if (o && d) search(o, d);
                    }}
                    className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12px] font-medium text-foreground"
                  >
                    <History size={12} className="text-muted" />
                    {r}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <BottomTabBar active="Home" />
      </div>

<DateRangePicker
        open={dateOpen}
        initial={range}
        onApply={(r) => {
          setRange(r);
          setDateOpen(false);
        }}
        onClose={() => setDateOpen(false)}
      />

      <DateRangePicker
        open={legDateOpen}
        initial={{ start: extraLegs[legDateIndex]?.date }}
        onApply={(r) => {
          updateLeg(legDateIndex, { date: r.start });
          setLegDateOpen(false);
        }}
        onClose={() => setLegDateOpen(false)}
      />

      <CitiesSheet
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        title="Select a city"
        onSelect={(c) => {
          if (pickerFor?.kind === "main") {
            if (pickerFor.side === "from") setFrom(c.code);
            else setTo(c.code);
          } else if (pickerFor?.kind === "leg") {
            updateLeg(pickerFor.leg, {
              [pickerFor.side]: c.code,
            });
          }
        }}
      />

      <PassengerClassSheet
        open={paxOpen}
        initial={{ ...pax, cabin }}
        onClose={() => setPaxOpen(false)}
        onApply={(counts, c) => {
          setPax(counts);
          setCabin(c);
        }}
      />

    </MobileShell>
  );
}

const DEST_IMAGES = [
  "https://images.unsplash.com/photo-1558642084-fd07fae5282e?auto=format&fit=crop&w=400&q=70",
  "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&w=400&q=70",
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=400&q=70",
];
