/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BedDouble, Car, Loader2, Plane, Search } from "lucide-react";
import { BottomTabBar, MobileShell } from "@/components/shell";
import { EmptyState, SkeletonRows, Price } from "@/components/ui/feedback";
import { UsdtAmount } from "@/components/ui/Usdt";
import { Sheet } from "@/components/ui";
import AnimatedTabs from "@/components/ui/animated-tabs";
import { useFlow } from "@/lib/flow-context";
import { useToast } from "@/lib/toast";
import { readFlow } from "@/lib/store";
import type { CarBooking } from "@/lib/types";

type BookingItem = {
  kind: "flight" | "stay" | "car";
  id: string;
  reference: string;
  title: string;
  subtitle: string;
  status: string;
  depTime: string;
  arrTime: string;
  dep: string;
  arr: string;
  amount: number;
};

const ACTIVE = /confirm|issued|paid|delivered|booked/i;

function StatusPill({ status }: { status: string }) {
  const active = ACTIVE.test(status);
  return (
    <span
      className={`flex h-[21px] items-center rounded-md px-2 text-[10px] font-bold ${
        active ? "bg-accent-2 text-accent" : "bg-card-3 text-muted"
      }`}
    >
      {active ? "Confirmed" : status || "Completed"}
    </span>
  );
}

const KIND_META = {
  flight: { icon: Plane, label: "Flight" },
  stay: { icon: BedDouble, label: "Stay" },
  car: { icon: Car, label: "Car" },
} as const;

function BookingCard({
  item,
  onCancel,
  onChange,
  cancelling,
  changing,
}: {
  item: BookingItem;
  onCancel?: () => void;
  onChange?: () => void;
  cancelling?: boolean;
  changing?: boolean;
}) {
  const router = useRouter();
  const { setFlow } = useFlow();
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  const isFlight = item.kind === "flight";
  const active = ACTIVE.test(item.status);
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#5b7cfa] text-accent-2">
            <Icon size={16} />
          </span>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-foreground">
              {item.title}
            </span>
            <span className="text-[11px] text-muted">{item.subtitle}</span>
          </div>
        </div>
        <StatusPill status={item.status} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[15px] font-bold text-foreground">
            {item.dep || "—"}
          </span>
          <span className="text-[11px] text-muted">{item.depTime}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-muted">{item.kind}</span>
          <span className="mt-1 h-px w-12 bg-border" />
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[15px] font-bold text-foreground">
            {item.arr || "—"}
          </span>
          <span className="text-[11px] text-muted">{item.arrTime}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted">
          <Price usd={item.amount} className="text-foreground" />
        </span>
        <div className="flex gap-2">
          {isFlight && active ? (
            <button
              onClick={() => {
                setFlow({ orderId: item.id });
                router.push("/ticket");
              }}
              className="flex h-[37px] items-center rounded-lg border border-border bg-accent px-4 text-[13px] font-semibold text-accent-2"
            >
              Boarding Pass
            </button>
          ) : null}
          {isFlight && active && onChange ? (
            <button
              onClick={onChange}
              disabled={changing}
              className="flex h-[37px] items-center rounded-lg border border-border bg-card-2 px-4 text-[13px] font-semibold text-foreground"
            >
              {changing ? "…" : "Change Flight"}
            </button>
          ) : null}
          {onCancel ? (
            <button
              onClick={onCancel}
              disabled={cancelling}
              className="flex h-[37px] items-center rounded-lg border border-red-500/40 bg-red-500/10 px-4 text-[13px] font-semibold text-red-500"
            >
              {cancelling ? "…" : "Cancel"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function MyTrips() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"Upcoming" | "Past">("Upcoming");
  const [ref, setRef] = useState("");
  const [lookedUp, setLookedUp] = useState<BookingItem | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [changing, setChanging] = useState<BookingItem | null>(null);
  const [changeDate, setChangeDate] = useState("");
  const [changeOffers, setChangeOffers] = useState<any[]>([]);
  const [changeLoading, setChangeLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let ignore = false;
    const email = readFlow().passenger?.email ?? "";
    Promise.all([
      fetch(
        `/api/bookings${email ? `?email=${encodeURIComponent(email)}` : ""}`,
      ).then((r) => r.json()),
      Promise.resolve(
        (() => {
          const flow = readFlow();
          const cb = flow.carBooking as CarBooking | undefined;
          return cb
            ? [
                {
                  kind: "car",
                  id: cb.id,
                  reference: cb.reference,
                  title: cb.carName,
                  subtitle: cb.pickupLocation,
                  status: cb.status,
                  depTime: cb.pickupDate,
                  arrTime: cb.dropoffDate,
                  dep: "Pickup",
                  arr: "Return",
                  amount: cb.totalAmount,
                },
              ]
            : [];
        })(),
      ),
    ])
      .then(([d, localCars]) => {
        if (ignore) return;
        if (d.error) setError(d.error);
        else setBookings([...(d.bookings ?? []), ...localCars]);
      })
      .catch(() => setError("Failed to load bookings."))
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const upcoming = useMemo(
    () => bookings.filter((b) => ACTIVE.test(b.status)),
    [bookings],
  );
  const past = useMemo(() => bookings.filter((b) => !ACTIVE.test(b.status)), [bookings]);

  const lookup = () => {
    const q = ref.trim().toUpperCase();
    if (!q) return;
    const found = bookings.find((b) => b.reference?.toUpperCase().includes(q));
    setLookedUp(found ?? null);
    if (!found) toast("info", `No booking found for reference "${q}".`);
  };

  const cancel = async (item: BookingItem) => {
    if (!window.confirm(`Cancel booking ${item.reference}?`)) return;
    setCancelling(item.id);
    const path =
      item.kind === "flight"
        ? `/api/orders/${encodeURIComponent(item.id)}/cancel`
        : item.kind === "stay"
          ? `/api/stays/book/${encodeURIComponent(item.id)}/cancel`
          : `/api/cars/book/${encodeURIComponent(item.id)}/cancel`;
    try {
      const res = await fetch(path, { method: "POST" });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? "Cancellation failed");
      setBookings((prev) => prev.filter((b) => b.id !== item.id));
      toast("success", `Booking ${item.reference} cancelled.`);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setCancelling(null);
    }
  };

  const startChange = (item: BookingItem) => {
    setChanging(item);
    setChangeDate("");
    setChangeOffers([]);
  };

  const submitChange = async () => {
    if (!changing || !changeDate) return;
    setChangeLoading(true);
    try {
      const dep = changing.dep;
      const arr = changing.arr;
      const res = await fetch(`/api/orders/${encodeURIComponent(changing.id)}/change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slices: [{ origin: dep, destination: arr, departure_date: changeDate }],
        }),
      });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? "Change request failed");
      setChangeOffers(d.offers ?? []);
      if (!d.offers?.length) toast("info", "No change offers returned.");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Change request failed");
    } finally {
      setChangeLoading(false);
    }
  };

  const confirmChange = async (offerId: string) => {
    if (!changing) return;
    setChangeLoading(true);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(changing.id)}/change/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderChangeOfferId: offerId, selectedOffers: [], slices: [] }),
        },
      );
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? "Order change failed");
      toast("success", "Flight change confirmed.");
      setChanging(null);
      setChangeOffers([]);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Order change failed");
    } finally {
      setChangeLoading(false);
    }
  };

  const visible = lookedUp ? [lookedUp] : tab === "Upcoming" ? upcoming : past;

  return (
    <MobileShell>
      <div className="flex min-h-screen flex-col justify-between">
        <div className="w-full">
          <div className="sticky top-0 z-30 flex h-[60px] items-center bg-background px-4">
            <h1 className="text-[18px] font-extrabold text-foreground">
              My Bookings
            </h1>
          </div>

          <div className="px-4 pt-1">
            <AnimatedTabs
              id="trips"
              options={["Upcoming", `Past (${past.length})`]}
              value={tab === "Upcoming" ? "Upcoming" : `Past (${past.length})`}
              onChange={(v) => setTab(v.startsWith("Upcoming") ? "Upcoming" : "Past")}
              activeClassName="bg-accent"
              selectedTextClassName="text-accent-2"
            />
          </div>

          <div className="px-4 pt-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3">
              <Search size={16} className="text-muted" />
              <input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookup()}
                placeholder="Find by booking reference"
                className="h-11 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted"
              />
              <button onClick={lookup} className="text-[12px] font-bold text-accent-2">
                Find
              </button>
            </div>
            {lookedUp ? (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-muted">
                  Showing booking {lookedUp.reference}
                </span>
                <button
                  onClick={() => setLookedUp(null)}
                  className="text-[11px] font-bold text-accent-2"
                >
                  Clear
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 px-4 pb-5 pt-4">
            {loading ? <SkeletonRows rows={3} height={168} /> : null}

            {!loading && error ? (
              <EmptyState
                title="Bookings unavailable"
                message={error}
                icon={<Loader2 size={24} />}
              />
            ) : null}

            {!loading && !error && bookings.length === 0 && !lookedUp ? (
              <EmptyState
                title="No bookings yet"
                message="Your tickets and stays will appear here after you book."
                icon={<Search size={24} />}
                action={
                  <Link
                    href="/"
                    className="mt-2 flex h-10 items-center rounded-xl border border-accent-2 bg-accent px-4 text-[13px] font-bold text-accent-2"
                  >
                    Start Booking
                  </Link>
                }
              />
            ) : null}

            {!loading && !error && visible.length === 0 && !lookedUp ? (
              <EmptyState
                title="Nothing here"
                message={`No ${tab.toLowerCase()} bookings right now.`}
                icon={<Search size={24} />}
              />
            ) : null}

            {!loading &&
              !error &&
              visible.map((b, i) => (
                <div
                  key={b.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                >
                  <BookingCard
                    item={b}
                    onChange={b.kind === "flight" ? () => startChange(b) : undefined}
                    onCancel={() => cancel(b)}
                    cancelling={cancelling === b.id}
                    changing={changing?.id === b.id}
                  />
                </div>
              ))}
          </div>
        </div>

        <BottomTabBar active="Bookings" />
      </div>

      <Sheet open={Boolean(changing)} onClose={() => setChanging(null)}>
        {changing ? (
          <>
            <div className="px-4 py-3">
              <h2 className="text-[18px] font-extrabold text-foreground">
                Change Flight
              </h2>
              <p className="text-[12px] text-muted">
                {changing.dep} → {changing.arr}
              </p>
            </div>
            <div className="flex flex-col gap-3 px-4 py-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-muted">
                  New departure date
                </span>
                <input
                  type="date"
                  value={changeDate}
                  onChange={(e) => setChangeDate(e.target.value)}
                  className="h-[43px] rounded-[10px] border border-border bg-card px-3 text-[16px] font-semibold text-foreground outline-none"
                />
              </label>
              <button
                disabled={!changeDate || changeLoading}
                onClick={submitChange}
                className="tap flex h-12 w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2 disabled:opacity-50"
              >
                {changeLoading ? "Searching…" : "Find new flights"}
              </button>
            </div>

            {changeOffers.length > 0 ? (
              <div className="flex flex-col gap-2 px-4 pb-4">
                <span className="text-[12px] font-semibold text-muted">
                  Available changes
                </span>
                {changeOffers.map((o: any) => (
                  <button
                    key={o.id}
                    onClick={() => confirmChange(o.id)}
                    disabled={changeLoading}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-left"
                  >
                    <span className="text-[13px] font-semibold text-foreground">
                      {o.slices?.[0]?.segments?.[0]?.marketing_carrier?.name ?? "Flight"}
                      {" · "}
                      {o.slices?.[0]?.segments?.[0]?.origin?.iata_code ?? ""} →{" "}
                      {o.slices?.[0]?.segments?.[0]?.destination?.iata_code ?? ""}
                    </span>
                    <span className="text-[12px] font-bold text-accent-2">
                      <UsdtAmount
                        value={o.total_due_amount ?? o.new_total_amount ?? 0}
                      />
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </Sheet>
    </MobileShell>
  );
}