"use client";

import { useState } from "react";
import type { ElementType } from "react";
import { useRouter } from "next/navigation";
import { Luggage, MonitorPlay } from "lucide-react";
import { MobileShell } from "@/components/shell";
import { FareRulesSheet } from "@/components/screens/sheets";
import SeatMapSheet from "@/components/screens/SeatMapSheet";
import { ProgressButton } from "@/components/ui/progress-button";
import Identicon from "@/components/ui/identicon";
import { Price } from "@/components/ui/feedback";
import { UsdtAmount } from "@/components/ui/Usdt";
import { NimiqIcon } from "@/components/ui/Nimiq";
import { useFlow } from "@/lib/flow-context";
import type { FlightOffer, OfferService } from "@/lib/types";

const SERVICE_ICON: Record<string, ElementType> = {
  baggage: Luggage,
  seat: MonitorPlay,
};

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
  const { flow, setFlow } = useFlow();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [offer, setOffer] = useState<FlightOffer | null>(
    () => flow.offer ?? null,
  );
  const error = flow.offer ? "" : "No offer selected. Search for a flight first.";
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const ids = flow.selectedServiceIds ?? [];
    return Object.fromEntries(ids.map((id) => [id, true]));
  });
  const [seatOpen, setSeatOpen] = useState(false);
  const [chosenSeat, setChosenSeat] = useState<string | null>(
    () => flow.seat ?? null,
  );
  const similar = (flow.offers ?? [])
    .filter((o) => o.id !== offer?.id)
    .slice(0, 6);

  const selectSimilar = (o: FlightOffer) => {
    setOffer(o);
    setSelected({});
    setChosenSeat(null);
    setFlow({ offer: o, amount: o.price, selectedServiceIds: [], seat: undefined });
    window.scrollTo({ top: 0 });
  };

  if (!offer) {
    return (
      <MobileShell>
        <div className="flex min-h-full flex-col items-center justify-center gap-3 px-10 text-center">
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
  const passengerCount = flow.passengers ?? 1;

  const proceed = () => {
    setFlow({
      offer: { ...offer, services: addons },
      amount: total,
      passengers: passengerCount,
      selectedServiceIds: Object.keys(selected).filter((k) => selected[k]),
      seat: chosenSeat ?? undefined,
    });
    router.push("/passengers");
  };

  return (
    <MobileShell header={<><div className="flex h-[60px] items-center gap-3 bg-background px-4 py-3">
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
              className="ml-auto text-[12px] font-bold text-accent-fg"
            >
              Fare rules
            </button>
          </div></>}>
      <div className="flex min-h-full flex-col justify-between">
        <div className="w-full">
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
                        <span className="text-[12px] font-semibold text-accent-fg">
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

              {(offer.aircraft ||
                offer.cabin ||
                offer.seatsRemaining ||
                offer.totalBaggages) ? (
                <div className="flex flex-wrap gap-1.5">
                  {offer.aircraft ? (
                    <span className="rounded-full bg-card-2 px-2.5 py-1 text-[11px] font-medium text-foreground">
                      ✈ {offer.aircraft}
                    </span>
                  ) : null}
                  {offer.cabin ? (
                    <span className="rounded-full bg-card-2 px-2.5 py-1 text-[11px] font-medium text-foreground">
                      {offer.cabin}
                    </span>
                  ) : null}
                  {offer.seatsRemaining ? (
                    <span className="rounded-full bg-card-2 px-2.5 py-1 text-[11px] font-medium text-foreground">
                      {offer.seatsRemaining} seats left
                    </span>
                  ) : null}
                  {offer.totalBaggages ? (
                    <span className="rounded-full bg-card-2 px-2.5 py-1 text-[11px] font-medium text-foreground">
                      {offer.totalBaggages} bag{offer.totalBaggages > 1 ? "s" : ""} included
                    </span>
                  ) : null}
                  {offer.amenities?.length ? (
                    offer.amenities.slice(0, 3).map((a) => (
                      <span
                        key={a}
                        className="rounded-full bg-card-2 px-2.5 py-1 text-[11px] font-medium text-muted"
                      >
                        {a}
                      </span>
                    ))
                  ) : null}
                </div>
              ) : null}
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
                          <Icon size={20} className="text-accent-fg" />
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
                          className="mt-2 flex h-9 w-full items-center justify-center rounded-lg border border-border bg-card-2 text-[12px] font-semibold text-accent-fg"
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
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
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
                    <span className="text-[14px] font-bold text-accent-fg">
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
            <span className="flex items-center gap-1 text-[12px] font-bold text-accent-fg">
              You earn +{Math.round(total * 2)}
              <NimiqIcon size={13} />
            </span>
          </div>
          <ProgressButton
            onAction={proceed}
            busyLabel="Continuing…"
            className="tap mt-3 flex h-12 w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2"
          >
            Proceed to Passenger Details
          </ProgressButton>
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
