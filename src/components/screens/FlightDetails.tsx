"use client";

import { useEffect, useState } from "react";
import type { ElementType } from "react";
import { useRouter } from "next/navigation";
import { Luggage, MonitorPlay } from "lucide-react";
import { MobileShell } from "@/components/shell";
import { FareRulesSheet } from "@/components/screens/sheets";
import SeatMapSheet from "@/components/screens/SeatMapSheet";
import Identicon from "@/components/ui/identicon";
import { Price, SkeletonRows } from "@/components/ui/feedback";
import { UsdtAmount } from "@/components/ui/Usdt";
import { useQueryParam } from "@/lib/query";
import { readFlow, writeFlow } from "@/lib/store";
import { formatDuration } from "@/lib/format";
import { testPrice } from "@/lib/pricing";
import type { FlightOffer, OfferService } from "@/lib/types";

const SERVICE_ICON: Record<string, ElementType> = {
  baggage: Luggage,
  seat: MonitorPlay,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeOffer(raw: any): FlightOffer {
  const slice = raw.slices?.[0] ?? {};
  const seg = slice.segments?.[0] ?? {};
  const tax = testPrice(Number(raw.tax_amount ?? 0));
  const total = testPrice(Number(raw.total_amount ?? 0));
  const fmt = (iso: string) => {
    if (!iso) return "--:--";
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes(),
    ).padStart(2, "0")}`;
  };
  const stops = (slice.segments?.length ?? 1) - 1;
  return {
    id: raw.id,
    airline: seg.marketing_carrier?.name ?? "",
    airlineCode: seg.marketing_carrier?.iata_code ?? "",
    flightNumber: seg.marketing_carrier_flight_number ?? "",
    price: total,
    currency: raw.total_currency ?? "USD",
    baseAmount: Math.max(0, total - tax),
    taxAmount: tax,
    depTime: fmt(seg.departing_at),
    arrTime: fmt(seg.arriving_at),
    origin: seg.origin?.iata_code ?? "",
    destination: seg.destination?.iata_code ?? "",
    depDate: (seg.departing_at ?? "").slice(0, 10),
    arrDate: (seg.arriving_at ?? "").slice(0, 10),
    duration: formatDuration(slice.duration),
    stops: stops === 0 ? "Direct" : `${stops} Stop${stops > 1 ? "s" : ""}`,
    direct: stops === 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    services: (raw.available_services ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      totalAmount: testPrice(Number(s.total_amount ?? 0)),
      currency: s.total_currency ?? "USD",
    })),
    conditions: raw.conditions ?? undefined,
  };
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${
        on ? "justify-end bg-accent-2" : "justify-start bg-card-2"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full ${on ? "bg-accent" : "bg-muted"}`}
      />
    </button>
  );
}

export default function FlightDetails() {
  const router = useRouter();
  const offerId = useQueryParam("offer", "");
  const [rulesOpen, setRulesOpen] = useState(
    useQueryParam("sheet", "") === "rules",
  );
  const [offer, setOffer] = useState<FlightOffer | null>(
    () => readFlow().offer ?? null,
  );
  const [loading, setLoading] = useState(Boolean(offerId));
  const [error, setError] = useState(
    offerId ? "" : "No offer selected. Search for a flight first.",
  );
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const ids = readFlow().selectedServiceIds ?? [];
    return Object.fromEntries(ids.map((id) => [id, true]));
  });
  const [seatOpen, setSeatOpen] = useState(false);
  const [chosenSeat, setChosenSeat] = useState<string | null>(
    () => readFlow().seat ?? null,
  );
  const similar = (readFlow().offers ?? [])
    .filter((o) => o.id !== offer?.id)
    .slice(0, 6);

  useEffect(() => {
    if (!offerId) return;
    let ignore = false;
    fetch(`/api/flights/offers/${encodeURIComponent(offerId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (ignore) return;
        if (d.offer) {
          const o = normalizeOffer(d.offer);
          setOffer(o);
          writeFlow({ offer: o });
        } else {
          setError(d.error ?? "Offer could not be loaded.");
        }
      })
      .catch(() => {
        if (!ignore) setError("Failed to load the offer.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [offerId]);

  const selectSimilar = (o: FlightOffer) => {
    setOffer(o);
    setSelected({});
    setChosenSeat(null);
    writeFlow({ offer: o, amount: o.price, selectedServiceIds: [], seat: undefined });
    window.scrollTo({ top: 0 });
  };

  if (loading) {
    return (
      <MobileShell>
        <div className="px-4 py-5">
          <SkeletonRows rows={2} height={220} />
        </div>
      </MobileShell>
    );
  }

  if (!offer) {
    return (
      <MobileShell>
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-10 text-center">
          <p className="text-[16px] font-bold text-foreground">
            Flight Details
          </p>
          <p className="text-[13px] text-muted">{error}</p>
          <button
            onClick={() => router.push("/search")}
            className="flex h-10 items-center rounded-xl border border-accent-2 bg-accent px-4 text-[13px] font-bold text-accent-2"
          >
            Browse Flights
          </button>
        </div>
      </MobileShell>
    );
  }

  const addons = offer.services.filter(
    (s) => s.totalAmount > 0 && (s.type === "baggage" || s.type === "seat"),
  );
  const selectedServices: OfferService[] = addons.filter((a) => selected[a.id]);
  const total =
    offer.price + selectedServices.reduce((sum, s) => sum + s.totalAmount, 0);
  const passengerCount = readFlow().passengers ?? 1;

  const proceed = () => {
    writeFlow({
      offer: { ...offer, services: addons },
      amount: total,
      passengers: passengerCount,
    });
    router.push("/passengers");
  };

  return (
    <MobileShell>
      <div className="flex min-h-screen flex-col justify-between">
        <div className="w-full">
          <div className="sticky top-0 z-30 flex h-[60px] items-center gap-3 bg-background px-4 py-3">
            <button
              onClick={() => router.push("/search")}
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
            </button>
            <h1 className="text-[18px] font-extrabold text-foreground">
              Flight Details
            </h1>
            <button
              onClick={() => setRulesOpen(true)}
              className="ml-auto text-[12px] font-bold text-accent-2"
            >
              Fare rules
            </button>
          </div>

          <div className="px-4 py-3">
            <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-[18px]">
              <div className="flex gap-3">
                <div className="flex w-12 flex-col">
                  <span className="text-[14px] font-bold text-foreground">
                    {offer.depTime}
                  </span>
                  <span className="text-[11px] text-muted">
                    {offer.depDate}
                  </span>
                </div>
                <div className="flex w-4 flex-col items-center">
                  <span className="h-2 w-2 rounded-full border border-accent-2 bg-accent-2" />
                  <span className="w-px flex-1 bg-border" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="flex items-center gap-2 text-[14px] font-bold text-foreground">
                    <Identicon seed={`${offer.airlineCode}${offer.flightNumber}`} size={18} />
                    {offer.airline} ({offer.origin})
                  </span>
                  <span className="text-[12px] text-muted">
                    {offer.flightNumber} · {offer.duration}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex w-12 flex-col" />
                <div className="flex w-4 flex-col items-center">
                  <span className="w-px flex-1 bg-border" />
                </div>
                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex flex-col gap-2 rounded-[10px] border border-border bg-card-2 p-3">
                    <div className="flex justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted">Route</span>
                        <span className="text-[12px] font-semibold text-foreground">
                          {offer.origin} → {offer.destination}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted">Stops</span>
                        <span className="text-[12px] font-semibold text-foreground">
                          {offer.stops}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted">Fare</span>
                        <span className="text-[12px] font-semibold text-accent-2">
                          <UsdtAmount value={offer.price} />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex w-12 flex-col">
                  <span className="text-[14px] font-bold text-foreground">
                    {offer.arrTime}
                  </span>
                  <span className="text-[11px] text-muted">
                    {offer.arrDate}
                  </span>
                </div>
                <div className="flex w-4 flex-col items-center">
                  <span className="h-2 w-2 rounded-full border border-accent-2 bg-accent" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-[14px] font-bold text-foreground">
                    {offer.destination}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {addons.length > 0 ? (
            <section className="flex flex-col gap-3 px-4 pb-6 pt-3">
              <h2 className="text-[16px] font-bold text-foreground">
                Baggage &amp; Extras
              </h2>
              <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
                {addons.map((a, i) => {
                  const Icon = SERVICE_ICON[a.type] ?? MonitorPlay;
                  return (
                    <div key={a.id}>
                      {i > 0 ? (
                        <div className="mb-4 h-px w-full bg-border" />
                      ) : null}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon size={20} className="text-accent-2" />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[13px] font-semibold text-foreground">
                              {a.name}
                            </span>
                            <span className="text-[11px] text-muted">
                              +<UsdtAmount value={a.totalAmount} />
                            </span>
                          </div>
                        </div>
                        <Toggle
                          on={Boolean(selected[a.id])}
                          onClick={() =>
                            setSelected((prev) => ({
                              ...prev,
                              [a.id]: !prev[a.id],
                            }))
                          }
                        />
                      </div>
                      {a.type === "seat" ? (
                        <button
                          onClick={() => setSeatOpen(true)}
                          className="mt-2 flex h-9 w-full items-center justify-center rounded-lg border border-border bg-card-2 text-[12px] font-semibold text-accent-2"
                        >
                          {chosenSeat
                            ? `Seat ${chosenSeat} selected — change`
                            : "Choose seat on the map"}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {similar.length > 0 ? (
            <section className="flex flex-col gap-3 px-4 pb-6 pt-3">
              <h2 className="text-[16px] font-bold text-foreground">
                Similar Flights
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                {similar.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => selectSimilar(s)}
                    className="animate-fade-up flex w-[150px] shrink-0 flex-col gap-1 rounded-xl border border-border bg-card p-3 text-left"
                    style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
                  >
                    <span className="flex items-center gap-2 text-[12px] font-bold text-foreground">
                      <Identicon seed={`${s.airlineCode}${s.flightNumber}`} size={18} />
                      {s.airline} · {s.flightNumber}
                    </span>
                    <span className="text-[11px] text-muted">
                      {s.depTime} → {s.arrTime} · {s.duration}
                    </span>
                    <span className="text-[14px] font-bold text-accent-2">
                      <UsdtAmount value={s.price} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div aria-hidden className="h-[84px] w-full shrink-0" />
        <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[768px] -translate-x-1/2 border-t border-border bg-card px-4 pb-[calc(30px+env(safe-area-inset-bottom))] pt-3">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[12px] text-muted">
              Total ({passengerCount} Passenger{passengerCount > 1 ? "s" : ""})
            </span>
            <Price
              usd={total}
              showUsdt={false}
              className="text-[20px] leading-6 text-foreground"
              bold
            />
          </div>
          <button
            onClick={proceed}
            className="tap mt-3 flex h-12 w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2"
          >
            Proceed to Passenger Details
          </button>
        </div>
      </div>

      <FareRulesSheet
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        conditions={offer.conditions}
      />

      <SeatMapSheet
        key={seatOpen ? "open" : "closed"}
        open={seatOpen}
        onClose={() => setSeatOpen(false)}
        offerId={offer.id}
        onSelect={(seat) => {
          setChosenSeat(seat.name);
          const sa = addons.find((x) => x.type === "seat");
          if (sa) setSelected((prev) => ({ ...prev, [sa.id]: true }));
          setSeatOpen(false);
        }}
      />
    </MobileShell>
  );
}
