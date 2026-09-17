"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowUpRight, Calendar, Check, Pencil, Plane, Plus, Trash2 } from "lucide-react";
import { MobileShell } from "@/components/shell";
import { Sheet } from "@/components/ui";
import { ProgressButton } from "@/components/ui/progress-button";
import { HiveSpinner } from "@/components/ui/hive-spinner";
import BookingQR from "@/components/ui/booking-qr";
import { UsdtAmount } from "@/components/ui/Usdt";
import { useToast } from "@/lib/toast";
import { useFlow } from "@/lib/flow-context";
import { shortHash } from "@/lib/nimiq";
import type { OrderDetail, OrderService } from "@/lib/types";

type AvailableService = {
  id: string;
  name: string;
  type: string;
  totalAmount: number;
  currency: string;
  maximumQuantity: number;
};

type ChangeOffer = {
  id: string;
  total_due_amount?: number;
  new_total_amount?: number;
  slices?: Array<{
    segments?: Array<{
      marketing_carrier?: { name?: string };
      origin?: { iata_code?: string };
      destination?: { iata_code?: string };
    }>;
  }>;
};

export default function OrderDetail() {
  const router = useRouter();
  const { setFlow } = useFlow();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { toast } = useToast();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [servicesOpen, setServicesOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? "Failed to load order.");
      setOrder(d.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchOrder();
  }, [fetchOrder]);

  const statusActive = order?.status === "confirmed";
  const changeable = order?.availableActions?.includes("change") ?? false;
  const cancellable = order?.availableActions?.includes("cancel") ?? false;

  if (loading) {
    return (
      <MobileShell header={<DetailHeader onBack={() => router.push("/trips")} />}>
        <div className="flex min-h-full items-center justify-center gap-2 text-[13px] text-muted">
          <HiveSpinner size={16} /> Loading booking…
        </div>
      </MobileShell>
    );
  }

  if (error || !order) {
    return (
      <MobileShell header={<DetailHeader onBack={() => router.push("/trips")} />}>
        <div className="flex min-h-full flex-col items-center justify-center gap-3 px-10 text-center">
          <p className="text-[15px] font-bold text-foreground">
            Booking unavailable
          </p>
          <p className="text-[13px] text-muted">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              void fetchOrder();
            }}
            className="flex h-10 items-center rounded-xl border border-accent-2 bg-accent px-4 text-[13px] font-bold text-accent-2"
          >
            Try Again
          </button>
        </div>
      </MobileShell>
    );
  }

  const primaryPassenger = order.passengers[0];

  return (
    <MobileShell header={<DetailHeader onBack={() => router.push("/trips")} />}>
      <div className="flex min-h-full flex-col gap-4 px-4 pb-6 pt-3">
        {/* Status */}
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">Booking Reference</span>
            <span className="text-[18px] font-extrabold text-foreground">
              {order.bookingRef || shortHash(order.id)}
            </span>
          </div>
          <span
            className={`flex h-[26px] items-center rounded-full px-3 text-[11px] font-bold ${
              statusActive
                ? "bg-accent-2 text-accent"
                : order.status === "cancelled"
                  ? "bg-red-500/10 text-red-500"
                  : "bg-card-3 text-muted"
            }`}
          >
            {order.status === "cancelled"
              ? "Cancelled"
              : statusActive
                ? "Confirmed"
                : order.status || "Confirmed"}
          </span>
        </div>

        {/* QR */}
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5">
          <span className="text-[11px] font-semibold text-muted">
            Scan to verify this booking
          </span>
          <BookingQR
            value={`TRIPLY:${order.bookingRef || order.id}:${order.id}`}
            size={160}
          />
          <span className="text-[13px] font-extrabold text-foreground">
            {order.bookingRef || shortHash(order.id)}
          </span>
        </div>

        {/* Airline + slices */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-[18px]">
          <div className="flex items-center gap-2">
            {order.airlineLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={order.airlineLogo}
                alt={order.airline}
                className="h-8 w-8 shrink-0 object-contain"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-2 text-accent">
                <Plane size={16} />
              </span>
            )}
            <span className="text-[15px] font-bold text-foreground">
              {order.airline}
            </span>
          </div>

          {order.slices.map((slice, i) => (
            <div key={slice.id || i} className="flex flex-col gap-2">
              <div className="flex flex-col gap-1.5">
                  <div className="flex items-stretch justify-between gap-2">
                    <div className="flex min-w-0 flex-col text-left">
                      <span className="text-[20px] font-extrabold text-foreground">
                        {slice.origin.code}
                      </span>
                      <span className="text-[13px] font-semibold text-foreground">
                        {slice.depTime} · {slice.depDate}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col items-center justify-center gap-1 px-3">
                      <span className="text-[10px] text-muted">
                        {slice.stops > 0
                          ? `${slice.stops} stop${slice.stops > 1 ? "s" : ""}`
                          : "Direct"}{" "}
                        · {slice.duration}
                      </span>
                      <div className="flex w-full items-center">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-2" />
                        <span className="h-px flex-1 bg-border" />
                        <ArrowUpRight
                          size={13}
                          strokeWidth={2.5}
                          className="shrink-0 text-accent-2"
                        />
                        <span className="h-px flex-1 bg-border" />
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col items-end text-right">
                      <span className="text-[20px] font-extrabold text-foreground">
                        {slice.destination.code}
                      </span>
                      <span className="text-[13px] font-semibold text-foreground">
                        {slice.arrTime} · {slice.arrDate}
                      </span>
                    </div>
                  </div>

                  {/* Airport names — own row so they don't affect the connector */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="w-[45%] line-clamp-2 text-[11px] leading-3 text-muted">
                      {slice.origin.city}
                      {slice.origin.name ? ` · ${slice.origin.name}` : ""}
                      {slice.origin.terminal ? ` · T${slice.origin.terminal}` : ""}
                    </span>
                    <span className="w-[45%] line-clamp-2 text-right text-[11px] leading-3 text-muted">
                      {slice.destination.city}
                      {slice.destination.name ? ` · ${slice.destination.name}` : ""}
                      {slice.destination.terminal
                        ? ` · T${slice.destination.terminal}`
                        : ""}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted">
                    {slice.carrier} · {slice.carrierCode}
                    {slice.flightNumber}
                    {slice.aircraft ? ` · ${slice.aircraft}` : ""}
                  </span>
                </div>
            </div>
          ))}
        </div>

        {/* Passengers */}
        <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-[18px]">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-foreground">Passengers</h2>
            <button
              onClick={() => setContactOpen(true)}
              className="flex items-center gap-1 text-[12px] font-bold text-accent-fg"
            >
              <Pencil size={12} /> Edit contact
            </button>
          </div>
          {order.passengers.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card-2 px-3 py-2.5"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-bold text-foreground">
                  {p.title ? `${p.title}. ` : ""}
                  {p.givenName} {p.familyName}
                </span>
                <span className="text-[11px] text-muted">
                  {p.email || p.phone || "No contact on file"}
                </span>
                {p.bornOn ? (
                  <span className="text-[10px] text-muted">
                    DOB {p.bornOn}
                    {p.gender ? ` · ${p.gender === "f" ? "Female" : p.gender === "m" ? "Male" : p.gender}` : ""}
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] font-semibold text-muted">
                {p.seat ? `Seat ${p.seat}` : p.cabin}
              </span>
            </div>
          ))}
        </section>

        {/* Services booked */}
        {order.services.length > 0 ? (
          <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-[18px]">
            <h2 className="text-[15px] font-bold text-foreground">Services</h2>
            {order.services.map((s: OrderService) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card-2 px-3 py-2.5"
              >
                <span className="text-[13px] font-semibold text-foreground">
                  {s.name}
                  {s.quantity > 1 ? ` ×${s.quantity}` : ""}
                </span>
                <span className="text-[13px] font-bold text-accent-fg">
                  <UsdtAmount value={s.totalAmount} />
                </span>
              </div>
            ))}
          </section>
        ) : null}

        {/* Documents */}
        {order.documents && order.documents.length > 0 ? (
          <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-[18px]">
            <h2 className="text-[15px] font-bold text-foreground">Documents</h2>
            {order.documents.map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-border bg-card-2 px-3 py-2.5"
              >
                <span className="text-[13px] font-semibold text-foreground capitalize">
                  {d.type.replace(/_/g, " ")}
                </span>
                <span className="text-[12px] font-semibold text-muted">
                  {d.uniqueIdentifier}
                </span>
              </div>
            ))}
          </section>
        ) : null}

        {/* Price + conditions */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-[18px]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-foreground">
              Total paid
            </span>
            <span className="text-[18px] font-extrabold text-foreground">
              <UsdtAmount value={order.totalAmount} />
            </span>
          </div>
          {order.createdAt ? (
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted">Booked</span>
              <span className="text-[12px] font-semibold text-foreground">
                {new Date(order.createdAt).toLocaleDateString()}
              </span>
            </div>
          ) : null}
          <div className="h-px w-full bg-border" />
          <div className="flex flex-col gap-1.5">
            {order.conditions.refund ? (
              <span className="text-[12px] text-muted">
                Refund:{" "}
                {order.conditions.refund.allowed
                  ? order.conditions.refund.penaltyAmount
                    ? `allowed with ${order.conditions.refund.penaltyAmount} ${order.conditions.refund.penaltyCurrency} penalty`
                    : "allowed"
                  : "not allowed"}
              </span>
            ) : null}
            {order.conditions.change ? (
              <span className="text-[12px] text-muted">
                Changes:{" "}
                {order.conditions.change.allowed
                  ? order.conditions.change.penaltyAmount
                    ? `allowed with ${order.conditions.change.penaltyAmount} ${order.conditions.change.penaltyCurrency} penalty`
                    : "allowed"
                  : "not allowed"}
              </span>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {statusActive ? (
            <button
              onClick={() => {
                setFlow({ orderId: order.id });
                router.push("/ticket");
              }}
              className="tap flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2"
            >
              <Plane size={18} className="rotate-90" />
              Boarding Pass
            </button>
          ) : null}

          <ProgressButton
            onAction={() => setServicesOpen(true)}
            className="tap flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2"
          >
            <Plus size={18} />
            Add services (baggage, seats)
          </ProgressButton>

          <div className="flex gap-2">
            {changeable && statusActive ? (
              <ProgressButton
                onAction={() => setChangeOpen(true)}
                className="tap flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card-2 text-[14px] font-semibold text-foreground"
              >
                <Calendar size={15} className="text-accent-fg" />
                Change flight
              </ProgressButton>
            ) : null}
            {cancellable && statusActive ? (
              <ProgressButton
                onAction={() => setCancelOpen(true)}
                className="tap flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 text-[14px] font-semibold text-red-500"
              >
                <Trash2 size={15} />
                Cancel booking
              </ProgressButton>
            ) : null}
          </div>
        </div>
      </div>

      <AddServicesSheet
        orderId={order.id}
        open={servicesOpen}
        onClose={() => setServicesOpen(false)}
        onAdded={() => {
          setServicesOpen(false);
          toast("success", "Services added to your booking.");
          void fetchOrder();
        }}
      />

      <EditContactSheet
        orderId={order.id}
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        passenger={primaryPassenger}
        onSaved={() => {
          setContactOpen(false);
          toast("success", "Contact details updated.");
          void fetchOrder();
        }}
      />

      <ChangeFlightSheet
        orderId={order.id}
        open={changeOpen}
        onClose={() => setChangeOpen(false)}
        initial={{
          origin: order.slices[0]?.origin.code ?? "",
          destination: order.slices[0]?.destination.code ?? "",
        }}
        onDone={() => {
          setChangeOpen(false);
          void fetchOrder();
        }}
      />

      <CancelBookingSheet
        orderId={order.id}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onDone={() => {
          setCancelOpen(false);
          toast("success", "Booking cancelled.");
          void fetchOrder();
        }}
      />
    </MobileShell>
  );
}

function DetailHeader({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-[60px] items-center gap-3 bg-background px-4 py-3">
      <button
        onClick={onBack}
        aria-label="Back"
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
        Booking Details
      </h1>
    </div>
  );
}

function AddServicesSheet({
  orderId,
  open,
  onClose,
  onAdded,
}: {
  orderId: string;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { toast } = useToast();
  const [services, setServices] = useState<AvailableService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const reset = setTimeout(() => {
      setPicked(new Set());
      setServices([]);
      setError("");
      setLoading(true);
    }, 0);
    return () => clearTimeout(reset);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/orders/${encodeURIComponent(orderId)}/available-services`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setServices(d.services ?? []);
      })
      .catch(() => setError("Failed to load available services."))
      .finally(() => setLoading(false));
  }, [open, orderId]);

  const toggle = (svcId: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(svcId)) next.delete(svcId);
      else next.add(svcId);
      return next;
    });

  const submit = async () => {
    if (picked.size === 0) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}/services`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ services: [...picked] }),
        },
      );
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? "Failed to add services.");
      onAdded();
    } catch (err) {
      toast(
        "error",
        err instanceof Error ? err.message : "Failed to add services.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      height="75vh"
      footer={
        <ProgressButton
          onAction={submit}
          busy={saving}
          busyLabel="Adding…"
          disabled={picked.size === 0}
          className="tap flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2 disabled:opacity-50"
        >
          Add{" "}
          {picked.size > 0
            ? `${picked.size} service${picked.size > 1 ? "s" : ""}`
            : "service"}
        </ProgressButton>
      }
    >
      <div className="px-4 pb-2">
        <h2 className="text-[18px] font-extrabold text-foreground">
          Add services
        </h2>
        <p className="text-[12px] text-muted">
          Add baggage or seats to your existing booking.
        </p>
      </div>
      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-muted">
            <HiveSpinner size={16} /> Loading services…
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-500">
            {error}
          </p>
        ) : services.length === 0 ? (
          <p className="rounded-lg bg-card-2 px-3 py-2 text-[12px] text-muted">
            No additional services are available for this booking.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left ${
                  picked.has(s.id)
                    ? "border-accent-2 bg-accent-2/10"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-bold text-foreground">
                    {s.name}
                  </span>
                  <span className="text-[11px] text-muted capitalize">
                    {s.type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-accent-fg">
                    <UsdtAmount value={s.totalAmount} />
                  </span>
                  {picked.has(s.id) ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-2">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

function EditContactSheet({
  orderId,
  open,
  onClose,
  passenger,
  onSaved,
}: {
  orderId: string;
  open: boolean;
  onClose: () => void;
  passenger?: OrderDetail["passengers"][number];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const reset = setTimeout(() => {
      setEmail(passenger?.email ?? "");
      setPhone(passenger?.phone ?? "");
    }, 0);
    return () => clearTimeout(reset);
  }, [open, passenger]);

  const submit = async () => {
    if (!email.trim() && !phone.trim()) {
      toast("error", "Enter at least an email or phone.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: { contactEmail: email.trim(), contactPhone: phone.trim() },
        }),
      });
      const d = await res.json();
      if (!res.ok || d.error)
        throw new Error(d.error ?? "Failed to update contact.");
      onSaved();
    } catch (err) {
      toast(
        "error",
        err instanceof Error ? err.message : "Failed to update contact.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      footer={
        <ProgressButton
          onAction={submit}
          busy={saving}
          busyLabel="Saving…"
          className="tap flex h-12 w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2"
        >
          Save contact
        </ProgressButton>
      }
    >
      <div className="px-4 pb-2">
        <h2 className="text-[18px] font-extrabold text-foreground">
          Edit contact details
        </h2>
        <p className="text-[12px] text-muted">
          {passenger
            ? `${passenger.title ? `${passenger.title}. ` : ""}${passenger.givenName} ${passenger.familyName}`
            : "Update the booking contact."}
        </p>
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-muted">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="h-[43px] rounded-[10px] border border-border bg-card px-3 text-[16px] text-foreground outline-none placeholder:text-muted"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-muted">Phone</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+2348000000000"
            className="h-[43px] rounded-[10px] border border-border bg-card px-3 text-[16px] text-foreground outline-none placeholder:text-muted"
          />
        </label>
      </div>
    </Sheet>
  );
}

function ChangeFlightSheet({
  orderId,
  open,
  onClose,
  onDone,
  initial,
}: {
  orderId: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  initial?: { origin: string; destination: string };
}) {
  const { toast } = useToast();
  const [date, setDate] = useState("");
  const [offers, setOffers] = useState<ChangeOffer[]>([]);
  const [changeRequestId, setChangeRequestId] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const reset = setTimeout(() => {
      setDate("");
      setOffers([]);
      setChangeRequestId("");
      setError("");
      setLoading(false);
      setConfirming(false);
    }, 0);
    return () => clearTimeout(reset);
  }, [open]);

  const submit = async () => {
    if (!date) return;
    setLoading(true);
    setError("");
    setOffers([]);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}/change`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slices: [
              {
                origin: initial?.origin ?? "",
                destination: initial?.destination ?? "",
                departure_date: date,
              },
            ],
          }),
        },
      );
      const d = await res.json();
      if (!res.ok || d.error)
        throw new Error(d.error ?? "Change request failed");
      setChangeRequestId(d.changeRequestId ?? "");
      setOffers(d.offers ?? []);
      if (!(d.offers ?? []).length) {
        toast("info", "No change offers returned yet — try again in a moment.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Change request failed");
    } finally {
      setLoading(false);
    }
  };

  const confirm = async (offerId: string) => {
    setConfirming(true);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}/change/confirm`,
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
      onDone();
    } catch (err) {
      toast(
        "error",
        err instanceof Error ? err.message : "Order change failed",
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      footer={
        <ProgressButton
          onAction={submit}
          busy={loading}
          busyLabel="Searching…"
          disabled={!date}
          className="tap flex h-12 w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2 disabled:opacity-50"
        >
          Find new flights
        </ProgressButton>
      }
    >
      <div className="px-4 pb-2">
        <h2 className="text-[18px] font-extrabold text-foreground">
          Change flight
        </h2>
        <p className="text-[12px] text-muted">
          {initial ? `${initial.origin} → ${initial.destination}` : ""}
        </p>
      </div>
      <div className="flex flex-col gap-3 px-4 py-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-muted">
            New departure date
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-[43px] rounded-[10px] border border-border bg-card px-3 text-[16px] font-semibold text-foreground outline-none"
          />
        </label>

        {error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-500">
            {error}
          </p>
        ) : null}

        {offers.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-semibold text-muted">
              Available changes
            </span>
            {offers.map((o) => (
              <button
                key={o.id}
                onClick={() => confirm(o.id)}
                disabled={confirming}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-left"
              >
                <span className="text-[13px] font-semibold text-foreground">
                  {o.slices?.[0]?.segments?.[0]?.marketing_carrier?.name ??
                    "Flight"}
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
      </div>
    </Sheet>
  );
}

function CancelBookingSheet({
  orderId,
  open,
  onClose,
  onDone,
}: {
  orderId: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [quote, setQuote] = useState<{
    cancellationId: string;
    refundAmount: number;
    currency: string;
    refundTo: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const reset = setTimeout(() => {
      setQuote(null);
      setError("");
      setLoading(true);
      setConfirming(false);
    }, 0);
    return () => clearTimeout(reset);
  }, [open]);

  useEffect(() => {
    if (!open || quote) return;
    fetch(`/api/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: "POST",
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.live || d.error) throw new Error(d.error ?? "Cancellation failed");
        setQuote(d);
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Cancellation failed",
        ),
      )
      .finally(() => setLoading(false));
  }, [open, orderId, quote]);

  const confirm = async () => {
    if (!quote) return;
    setConfirming(true);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}/cancel/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cancellationId: quote.cancellationId }),
        },
      );
      const d = await res.json();
      if (!res.ok || d.error)
        throw new Error(d.error ?? "Cancellation failed");
      toast(
        "success",
        Number(d.refundAmount ?? 0) > 0
          ? `Booking cancelled. Refund ${Number(d.refundAmount).toLocaleString()} ${d.currency ?? "USD"}.`
          : "Booking cancelled.",
      );
      onDone();
    } catch (err) {
      toast(
        "error",
        err instanceof Error ? err.message : "Cancellation failed",
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-4 py-3">
        <h2 className="text-[18px] font-extrabold text-foreground">
          Cancel booking
        </h2>
        <p className="text-[12px] text-muted">This is a final action.</p>
      </div>
      <div className="flex flex-col gap-3 px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-[12px] text-muted">
            <HiveSpinner size={16} /> Fetching refund…
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-500">
            {error}
          </p>
        ) : quote ? (
          <>
            <div className="rounded-xl border border-border bg-card-2 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">
                  Estimated refund
                </span>
                <span className="text-[16px] font-extrabold text-accent-fg">
                  {Number(quote.refundAmount) > 0 ? (
                    <UsdtAmount value={Number(quote.refundAmount)} />
                  ) : (
                    "Non-refundable"
                  )}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted">
                Refunded to{" "}
                {quote.refundTo === "balance"
                  ? "your Duffel balance"
                  : quote.refundTo ?? "original payment method"}
              </p>
            </div>
            <button
              onClick={() => void confirm()}
              disabled={confirming}
              className="tap flex h-12 w-full items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 text-[15px] font-bold text-red-500 disabled:opacity-50"
            >
              {confirming ? "Cancelling…" : "Confirm Cancellation"}
            </button>
            <button
              onClick={onClose}
              className="flex h-12 w-full items-center justify-center rounded-xl border border-border bg-card-2 text-[15px] font-semibold text-foreground"
            >
              Keep Booking
            </button>
          </>
        ) : null}
      </div>
    </Sheet>
  );
}