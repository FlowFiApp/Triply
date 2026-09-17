/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BedDouble, Car, LifeBuoy, Loader2, MoreHorizontal, Plane, Search, Trash2 } from "lucide-react";
import { BottomTabBar, MobileShell } from "@/components/shell";
import { EmptyState, SkeletonRows, Price } from "@/components/ui/feedback";
import { UsdtAmount } from "@/components/ui/Usdt";
import { Sheet } from "@/components/ui";
import { ProgressButton } from "@/components/ui/progress-button";
import { useDuffelAssistant } from "@/components/DuffelAssistant";
import AnimatedTabs from "@/components/ui/animated-tabs";
import PointsChip from "@/components/ui/points-chip";
import { useFlow } from "@/lib/flow-context";
import { useBookings } from "@/lib/api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/lib/toast";

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
  airlineLogo?: string;
  image?: string;
  createdAt?: string;
  actions?: string[];
  date?: string;
};

const ACTIVE = /confirm|issued|paid|delivered|booked/i;

function StatusPill({ status }: { status: string }) {
  const active = ACTIVE.test(status);
  const cancelled = /cancel/i.test(status);
  return (
    <span
      className={`flex h-[21px] shrink-0 items-center rounded-md px-2 text-[10px] font-bold ${
        cancelled
          ? "bg-red-500/10 text-red-500"
          : active
            ? "bg-accent-2 text-accent"
            : "bg-card-3 text-muted"
      }`}
    >
      {active ? "Confirmed" : cancelled ? "Cancelled" : status || "Completed"}
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
  onActions,
}: {
  item: BookingItem;
  onActions: () => void;
}) {
  const router = useRouter();
  const { setFlow } = useFlow();
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  const isFlight = item.kind === "flight";
  const active = ACTIVE.test(item.status);

  const openTicket = () => {
    setFlow({ orderId: item.id });
    router.push("/ticket");
  };
  const openDetails = () => {
    if (isFlight) router.push(`/trip/${item.id}`);
    else router.push(`/booking/${item.id}`);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <button
          onClick={openDetails}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt={item.title}
              className="h-9 w-9 shrink-0 rounded-lg object-cover"
            />
          ) : isFlight && item.airlineLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.airlineLogo}
              alt={item.title}
              className="h-9 w-9 shrink-0 object-contain"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#5b7cfa] text-accent-2">
              <Icon size={16} />
            </span>
          )}
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-semibold text-foreground">
              {item.title}
            </span>
            <span className="truncate text-[11px] text-muted">{item.subtitle}</span>
          </span>
        </button>
        <StatusPill status={item.status} />
        <button
          onClick={onActions}
          aria-label="Booking actions"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className="flex items-stretch justify-between gap-2">
        <div className="flex min-w-0 flex-col text-left">
          <span className="text-[20px] font-extrabold leading-6 text-foreground">
            {item.dep || "—"}
          </span>
          <span className="text-[12px] text-muted">{item.depTime}</span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-2">
          <span className="text-[11px] font-medium text-muted">{meta.label}</span>
          <div className="flex w-full items-center">
            <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-accent-2" />
            <span className="h-px flex-1 bg-border" />
            <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-accent-2" />
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-end text-right">
          <span className="text-[20px] font-extrabold leading-6 text-foreground">
            {item.arr || "—"}
          </span>
          <span className="text-[12px] text-muted">{item.arrTime}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted">
          <Price usd={item.amount} className="text-foreground" />
        </span>
        {isFlight && active ? (
          <button
            onClick={openTicket}
            className="flex h-[37px] items-center rounded-lg border border-border bg-accent px-4 text-[13px] font-semibold text-accent-2"
          >
            Boarding Pass
          </button>
        ) : null}
      </div>
    </div>
  );
}

function BookingActionsSheet({
  open,
  onClose,
  item,
  onView,
  onBoardingPass,
  onChange,
  changing,
  onCancel,
  cancelling,
}: {
  open: boolean;
  onClose: () => void;
  item: BookingItem | null;
  onView: () => void;
  onBoardingPass: () => void;
  onChange?: () => void;
  changing?: boolean;
  onCancel?: () => void;
  cancelling?: boolean;
}) {
  if (!item) return null;
  const isFlight = item.kind === "flight";
  const active = ACTIVE.test(item.status);
  const canChange = isFlight && (item.actions?.includes("change") ?? false);
  const canCancel = isFlight ? item.actions?.includes("cancel") ?? false : true;
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex flex-col px-4 pb-6 pt-1">
        <h2 className="mb-2 text-[16px] font-extrabold text-foreground">
          {item.title}
        </h2>
        <span className="mb-2 text-[11px] text-muted">
          {item.reference} · {item.subtitle}
        </span>
        <div className="flex flex-col">
          {isFlight ? (
            <button
              onClick={() => {
                onClose();
                onView();
              }}
              className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[15px] font-semibold text-foreground hover:bg-card-2"
            >
              <Search size={18} className="text-accent-fg" />
              View details
            </button>
          ) : null}
          {isFlight && active ? (
            <button
              onClick={() => {
                onClose();
                onBoardingPass();
              }}
              className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[15px] font-semibold text-foreground hover:bg-card-2"
            >
              <Plane size={18} className="text-accent-fg" />
              Boarding pass
            </button>
          ) : null}
          {isFlight && active && canChange && onChange ? (
            <ProgressButton
              onAction={() => {
                onClose();
                onChange();
              }}
              busy={changing}
              busyLabel="…"
              className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[15px] font-semibold text-foreground hover:bg-card-2"
            >
              <Plane size={18} className="rotate-90 text-accent-fg" />
              Change flight
            </ProgressButton>
          ) : null}
          {active && canCancel && onCancel ? (
            <ProgressButton
              onAction={() => {
                onClose();
                onCancel();
              }}
              busy={cancelling}
              busyLabel="Cancelling…"
              className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[15px] font-semibold text-red-500 hover:bg-card-2"
            >
              <Trash2 size={18} />
              Cancel booking
            </ProgressButton>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}

export default function MyTrips() {
  const router = useRouter();
  const { setFlow } = useFlow();
  const { open: openAssistant } = useDuffelAssistant();
  const qc = useQueryClient();
  const { data, isLoading, error } = useBookings();
  const [tab, setTab] = useState<"Upcoming" | "Past">("Upcoming");
  const [ref, setRef] = useState("");
  const [lookedUp, setLookedUp] = useState<BookingItem | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [changing, setChanging] = useState<BookingItem | null>(null);
  const [actionsFor, setActionsFor] = useState<BookingItem | null>(null);
  const [cancelQuote, setCancelQuote] = useState<{
    item: BookingItem;
    quote: {
      cancellationId: string;
      refundAmount: number;
      currency: string;
      refundTo: string;
    };
  } | null>(null);
  const [changeDate, setChangeDate] = useState("");
  const [changeOffers, setChangeOffers] = useState<any[]>([]);
  const [changeRequestId, setChangeRequestId] = useState("");
  const [changeLoading, setChangeLoading] = useState(false);
  const { toast } = useToast();

  const bookings = useMemo<BookingItem[]>(
    () => (data?.bookings as BookingItem[]) ?? [],
    [data],
  );
  const loading = isLoading;
  const errorMessage = error instanceof Error ? error.message : "";

  // A booking is "past" when cancelled or when its travel date has passed.
  const isPast = (b: BookingItem) => {
    if (!ACTIVE.test(b.status)) return true;
    if (b.date && b.date < new Date().toISOString().slice(0, 10)) return true;
    return false;
  };

  const upcoming = useMemo(
    () => bookings.filter((b) => !isPast(b)),
    [bookings],
  );
  const past = useMemo(() => bookings.filter((b) => isPast(b)), [bookings]);

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
    // Stays/cars cancel in one step; flights quote the refund first (Duffel
    // requires a pending cancellation to be confirmed before it takes effect).
    if (item.kind === "flight") {
      try {
        const res = await fetch(
          `/api/orders/${encodeURIComponent(item.id)}/cancel`,
          { method: "POST" },
        );
        const d = await res.json();
        if (!res.ok || d.error) throw new Error(d.error ?? "Cancellation failed");
        setCancelQuote({ item, quote: d });
      } catch (err) {
        toast("error", err instanceof Error ? err.message : "Cancellation failed");
      } finally {
        setCancelling(null);
      }
      return;
    }
    const path =
      item.kind === "stay"
        ? `/api/stays/book/${encodeURIComponent(item.id)}/cancel`
        : `/api/cars/book/${encodeURIComponent(item.id)}/cancel`;
    try {
      const res = await fetch(path, { method: "POST" });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? "Cancellation failed");
      await qc.invalidateQueries({ queryKey: ["bookings"] });
      toast("success", `Booking ${item.reference} cancelled.`);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setCancelling(null);
    }
  };

  const confirmCancel = async () => {
    if (!cancelQuote) return;
    setCancelling(cancelQuote.item.id);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(cancelQuote.item.id)}/cancel/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cancellationId: cancelQuote.quote.cancellationId }),
        },
      );
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? "Cancellation failed");
      await qc.invalidateQueries({ queryKey: ["bookings"] });
      const refund = Number(d.refundAmount ?? cancelQuote.quote.refundAmount ?? 0);
      toast(
        "success",
        `Booking ${cancelQuote.item.reference} cancelled.${
          refund > 0 ? ` Refund ${refund.toLocaleString()} ${d.currency ?? cancelQuote.quote.currency ?? "USD"}.` : ""
        }`,
      );
      setCancelQuote(null);
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
    setChangeRequestId("");
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
      setChangeRequestId(d.changeRequestId ?? "");
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
          body: JSON.stringify({
            orderChangeRequestId: changeRequestId,
            orderChangeOfferId: offerId,
            selectedOffers: [],
            slices: [],
          }),
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
    <MobileShell header={<><div className="flex h-[60px] items-center justify-between bg-background px-4">
            <h1 className="text-[18px] font-extrabold text-foreground">
              My Bookings
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void openAssistant()}
                className="flex h-8 items-center gap-1 rounded-full border border-border bg-card-2 px-3 text-[12px] font-semibold text-foreground"
              >
                <LifeBuoy size={14} className="text-accent-fg" />
                Manage travel
              </button>
              <PointsChip />
            </div>
          </div></>}>
      <div className="flex min-h-full flex-col justify-between">
        <div className="w-full">
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
              <button onClick={lookup} className="text-[12px] font-bold text-accent-fg">
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
                  className="text-[11px] font-bold text-accent-fg"
                >
                  Clear
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 px-4 pb-5 pt-4">
            {loading ? <SkeletonRows rows={3} height={168} /> : null}

            {!loading && errorMessage ? (
              <EmptyState
                title="Bookings unavailable"
                message={errorMessage}
                icon={<Loader2 size={24} />}
              />
            ) : null}

            {!loading && !errorMessage && bookings.length === 0 && !lookedUp ? (
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

            {!loading && !errorMessage && visible.length === 0 && !lookedUp ? (
              <EmptyState
                title="Nothing here"
                message={`No ${tab.toLowerCase()} bookings right now.`}
                icon={<Search size={24} />}
              />
            ) : null}

            {!loading &&
              !errorMessage &&
              visible.map((b, i) => (
                <div
                  key={b.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                >
                  <BookingCard
                    item={b}
                    onActions={() => setActionsFor(b)}
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
              <ProgressButton
                disabled={!changeDate}
                busy={changeLoading}
                busyLabel="Searching…"
                onAction={submitChange}
                className="tap flex h-12 w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2 disabled:opacity-50"
              >
                Find new flights
              </ProgressButton>
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
                    <span className="text-[12px] font-bold text-accent-fg">
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

      <Sheet
        open={Boolean(cancelQuote)}
        onClose={() => setCancelQuote(null)}
      >
        {cancelQuote ? (
          <>
            <div className="px-4 py-3">
              <h2 className="text-[18px] font-extrabold text-foreground">
                Cancel booking
              </h2>
              <p className="text-[12px] text-muted">
                {cancelQuote.item.title} · {cancelQuote.item.reference}
              </p>
            </div>
            <div className="flex flex-col gap-3 px-4 py-4">
              <div className="rounded-xl border border-border bg-card-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-foreground">
                    Estimated refund
                  </span>
                  <span className="text-[16px] font-extrabold text-accent-fg">
                    {Number(cancelQuote.quote.refundAmount ?? 0) > 0 ? (
                      <UsdtAmount value={Number(cancelQuote.quote.refundAmount)} />
                    ) : (
                      "Non-refundable"
                    )}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  Refunded to{" "}
                  {cancelQuote.quote.refundTo === "balance"
                    ? "your Duffel balance"
                    : cancelQuote.quote.refundTo ?? "original payment method"}
                  {" "}— this is a final action.
                </p>
              </div>
              <button
                onClick={() => void confirmCancel()}
                disabled={cancelling === cancelQuote.item.id}
                className="tap flex h-12 w-full items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 text-[15px] font-bold text-red-500 disabled:opacity-50"
              >
                {cancelling === cancelQuote.item.id ? "Cancelling…" : "Confirm Cancellation"}
              </button>
              <button
                onClick={() => setCancelQuote(null)}
                className="flex h-12 w-full items-center justify-center rounded-xl border border-border bg-card-2 text-[15px] font-semibold text-foreground"
              >
                Keep Booking
              </button>
            </div>
          </>
        ) : null}
      </Sheet>

      <BookingActionsSheet
        open={Boolean(actionsFor)}
        onClose={() => setActionsFor(null)}
        item={actionsFor}
        onView={() => {
          setActionsFor(null);
          if (actionsFor?.kind === "flight") router.push(`/trip/${actionsFor.id}`);
        }}
        onBoardingPass={() => {
          setActionsFor(null);
          if (actionsFor) {
            setFlow({ orderId: actionsFor.id });
            router.push("/ticket");
          }
        }}
        onChange={
          actionsFor?.kind === "flight" ? () => startChange(actionsFor) : undefined
        }
        changing={changing?.id === actionsFor?.id}
        onCancel={actionsFor ? () => cancel(actionsFor) : undefined}
        cancelling={cancelling === actionsFor?.id}
      />
    </MobileShell>
  );
}