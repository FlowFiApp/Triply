"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, Pencil, Plane, Plus } from "lucide-react";
import { MobileShell } from "@/components/shell";
import { Sheet } from "@/components/ui";
import { ProgressButton } from "@/components/ui/progress-button";
import { HiveSpinner } from "@/components/ui/hive-spinner";
import { UsdtAmount } from "@/components/ui/Usdt";
import { useToast } from "@/lib/toast";
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

export default function OrderDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { toast } = useToast();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [servicesOpen, setServicesOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

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

  const statusActive =
    order?.status === "confirmed" || order?.status === "issued" || order?.status === "paid";

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
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[20px] font-extrabold text-foreground">
                    {slice.origin.code}
                  </span>
                  <span className="text-[11px] text-muted">
                    {slice.origin.city}
                    {slice.origin.name ? ` · ${slice.origin.name}` : ""}
                    {slice.origin.terminal ? ` · T${slice.origin.terminal}` : ""}
                  </span>
                  <span className="text-[13px] font-semibold text-foreground">
                    {slice.depTime} · {slice.depDate}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 px-3">
                  <Plane size={14} className="text-accent-fg" />
                  <span className="text-[10px] text-muted">
                    {slice.stops > 0 ? `${slice.stops} stop${slice.stops > 1 ? "s" : ""}` : "Direct"} ·{" "}
                    {slice.duration}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[20px] font-extrabold text-foreground">
                    {slice.destination.code}
                  </span>
                  <span className="text-[11px] text-muted">
                    {slice.destination.city}
                    {slice.destination.name ? ` · ${slice.destination.name}` : ""}
                    {slice.destination.terminal ? ` · T${slice.destination.terminal}` : ""}
                  </span>
                  <span className="text-[13px] font-semibold text-foreground">
                    {slice.arrTime} · {slice.arrDate}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-muted">
                {slice.carrier} · {slice.carrierCode}
                {slice.flightNumber}
                {slice.aircraft ? ` · ${slice.aircraft}` : ""}
              </span>
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
                </span>
                <span className="text-[13px] font-bold text-accent-fg">
                  <UsdtAmount value={s.totalAmount} />
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
        <ProgressButton
          onAction={() => setServicesOpen(true)}
          className="tap flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2"
        >
          <Plus size={18} />
          Add services (baggage, seats)
        </ProgressButton>
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

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    if (picked.size === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services: [...picked] }),
      });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? "Failed to add services.");
      onAdded();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Failed to add services.");
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
          Add {picked.size > 0 ? `${picked.size} service${picked.size > 1 ? "s" : ""}` : "service"}
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
      if (!res.ok || d.error) throw new Error(d.error ?? "Failed to update contact.");
      onSaved();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Failed to update contact.");
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
