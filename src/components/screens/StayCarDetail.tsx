"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BedDouble, Car } from "lucide-react";
import { MobileShell } from "@/components/shell";
import { ProgressButton } from "@/components/ui/progress-button";
import { HiveSpinner } from "@/components/ui/hive-spinner";
import { UsdtAmount } from "@/components/ui/Usdt";
import { useToast } from "@/lib/toast";
import type { Booking } from "@/lib/types";

export default function StayCarDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { toast } = useToast();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const fetchBooking = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? "Failed to load booking.");
      setBooking(d.booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load booking.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchBooking();
  }, [fetchBooking]);

  const cancel = async () => {
    if (!booking) return;
    if (!window.confirm(`Cancel booking ${booking.reference}?`)) return;
    setCancelling(true);
    try {
      const path =
        booking.kind === "stay"
          ? `/api/stays/book/${encodeURIComponent(booking.id)}/cancel`
          : `/api/cars/book/${encodeURIComponent(booking.id)}/cancel`;
      const res = await fetch(path, { method: "POST" });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? "Cancellation failed");
      toast("success", `Booking ${booking.reference} cancelled.`);
      setBooking((b) => (b ? { ...b, status: "cancelled" } : b));
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setCancelling(false);
    }
  };

  const isStay = booking?.kind === "stay";
  const cancelled = booking?.status === "cancelled";

  return (
    <MobileShell header={<Header onBack={() => router.push("/trips")} />}>
      <div className="flex min-h-full flex-col gap-4 px-4 pb-6 pt-3">
        {loading ? (
          <div className="flex min-h-full items-center justify-center gap-2 text-[13px] text-muted">
            <HiveSpinner size={16} /> Loading booking…
          </div>
        ) : error || !booking ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-3 px-10 text-center">
            <p className="text-[15px] font-bold text-foreground">Booking unavailable</p>
            <p className="text-[13px] text-muted">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                void fetchBooking();
              }}
              className="flex h-10 items-center rounded-xl border border-accent-2 bg-accent px-4 text-[13px] font-bold text-accent-2"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] text-muted">Booking Reference</span>
                <span className="text-[18px] font-extrabold text-foreground">
                  {booking.reference}
                </span>
              </div>
              <span
                className={`flex h-[26px] items-center rounded-full px-3 text-[11px] font-bold ${
                  cancelled
                    ? "bg-red-500/10 text-red-500"
                    : "bg-accent-2 text-accent"
                }`}
              >
                {cancelled ? "Cancelled" : "Confirmed"}
              </span>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-[18px]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-2 text-accent">
                  {isStay ? <BedDouble size={18} /> : <Car size={18} />}
                </span>
                <div className="flex flex-col">
                  <span className="text-[16px] font-bold text-foreground">
                    {booking.title}
                  </span>
                  <span className="text-[12px] text-muted">{booking.subtitle}</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-card-2 px-3 py-2.5">
                <span className="text-[12px] text-muted">{booking.dep}</span>
                <span className="text-[13px] font-semibold text-foreground">
                  {booking.depTime}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-card-2 px-3 py-2.5">
                <span className="text-[12px] text-muted">{booking.arr}</span>
                <span className="text-[13px] font-semibold text-foreground">
                  {booking.arrTime}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">Total</span>
                <span className="text-[16px] font-extrabold text-foreground">
                  <UsdtAmount value={booking.amount} />
                </span>
              </div>
            </div>

            {!cancelled ? (
              <ProgressButton
                onAction={cancel}
                busy={cancelling}
                busyLabel="Cancelling…"
                className="tap flex h-12 w-full items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 text-[15px] font-bold text-red-500"
              >
                Cancel booking
              </ProgressButton>
            ) : null}
          </>
        )}
      </div>
    </MobileShell>
  );
}

function Header({ onBack }: { onBack: () => void }) {
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
      <h1 className="text-[18px] font-extrabold text-foreground">Booking Details</h1>
    </div>
  );
}