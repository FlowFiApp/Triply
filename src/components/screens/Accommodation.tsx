"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Calendar,
  Check,
  MapPin,
  Minus,
  Plus,
  Star,
  Users,
} from "lucide-react";
import {
  Avatar,
  BottomTabBar,
  BrandHeader,
  MobileShell,
} from "@/components/shell";
import { Sheet } from "@/components/ui";
import { AuthActionButton } from "@/components/ui/auth-action";
import { ProgressButton } from "@/components/ui/progress-button";
import { directionsUrl } from "@/components/MapEmbed";
import OsmMap from "@/components/OsmMap";
import ExploreTabs from "@/components/ui/explore-tabs";
import PointsChip from "@/components/ui/points-chip";
import CitiesSheet from "@/components/ui/cities-sheet";
import { EmptyState, Price, SkeletonRows } from "@/components/ui/feedback";
import { UsdtAmount } from "@/components/ui/Usdt";
import DateRangePicker, {
  formatDateLabel,
} from "@/components/ui/date-range-picker";
import ImageCarousel from "@/components/ui/image-carousel";
import { readFlow, writeFlow } from "@/lib/store";
import { useFlow } from "@/lib/flow-context";
import { useStaySearch } from "@/lib/api/hooks";
import { useToast } from "@/lib/toast";
import { getStoredIdentity } from "@/lib/identity";
import { share } from "@/lib/share";
import { downloadIcs } from "@/lib/calendar";
import { haptic } from "@/lib/haptics";
import type { StayOffer, StayBooking } from "@/lib/types";

function SearchField({
  icon,
  label,
  value,
  children,
  right,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  children?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex h-[60px] w-full items-center gap-3 rounded-xl border border-border bg-card-2 px-3 text-left">
      {icon}
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[11px] font-medium text-muted">{label}</span>
        {children ?? (
          <span className="text-[14px] font-semibold text-foreground">
            {value}
          </span>
        )}
      </span>
      {right}
    </div>
  );
}

function GuestsRoomsSheet({
  open,
  onClose,
  initial,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  initial: { Adults: number; Children: number; rooms: number };
  onApply: (value: { Adults: number; Children: number; rooms: number }) => void;
}) {
  const [adults, setAdults] = useState(initial.Adults);
  const [children, setChildren] = useState(initial.Children);
  const [rooms, setRooms] = useState(initial.rooms);

  const row = (
    label: string,
    sub: string,
    value: number,
    set: (v: number) => void,
  ) => (
    <div className="flex items-center justify-between border-b border-border pb-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-bold text-foreground">{label}</span>
        <span className="text-[12px] text-muted">{sub}</span>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => set(Math.max(0, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card-2 text-muted"
        >
          <Minus size={16} />
        </button>
        <span className="w-4 text-center text-[16px] font-bold text-foreground">
          {value}
        </span>
        <button
          onClick={() => set(value + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-2"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-4 py-3">
        <h2 className="text-[18px] font-extrabold text-foreground">
          Guests &amp; Rooms
        </h2>
      </div>
      <div className="flex flex-col gap-4 px-4 py-5">
        {row("Adults", "Age 12 or above", adults, setAdults)}
        {row("Children", "Age 2 - 11", children, setChildren)}
        {row("Rooms", "Sleeping arrangements", rooms, setRooms)}
      </div>
      <div className="px-4 pb-4 pt-2">
        <button
          onClick={() => {
            onApply({ Adults: adults, Children: children, rooms });
            onClose();
          }}
          className="flex h-12 w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2"
        >
          Apply Selection
        </button>
      </div>
    </Sheet>
  );
}

export function AccSearch() {
  const router = useRouter();
  const [destination, setDestination] = useState("London, UK");
  const [range, setRange] = useState({
    start: "2026-10-24",
    end: "2026-11-08",
  });
  const [dateOpen, setDateOpen] = useState(false);
  const [stays, setStays] = useState<StayOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [testMode, setTestMode] = useState(false);
  const [guestCount, setGuestCount] = useState({ Adults: 2, Children: 0 });
  const [rooms, setRooms] = useState(1);
  const [grOpen, setGrOpen] = useState(false);
  const [place, setPlace] = useState<{ latitude?: number; longitude?: number } | null>(null);
  const [cityOpen, setCityOpen] = useState(false);

  const staySearch = useStaySearch();
  const runSearch = (dest: string, r = range, test = testMode) => {
    staySearch
      .mutateAsync({
        destination: dest,
        checkInDate: r.start,
        checkOutDate: r.end,
        guests: guestCount.Adults + guestCount.Children,
        rooms,
        test,
        latitude: place?.latitude,
        longitude: place?.longitude,
      })
      .then((d) => {
        if (!d.live) throw new Error("No stays available for this destination.");
        setStays(d.stays);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to search stays."),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    runSearch("London, UK");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (s: StayOffer) => {
    writeFlow({ stay: s, stays });
    router.push("/stay");
  };

  return (
    <MobileShell header={<BrandHeader right={<div className="flex items-center gap-2"><PointsChip /><Avatar /></div>} />}>
      <div className="flex min-h-full flex-col justify-between">
        <div className="w-full">
          <ExploreTabs active="stays" />

          <div className="px-4 py-3">
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-[18px]">
              <h2 className="text-[18px] font-extrabold text-foreground">
                Book Accommodations
              </h2>
              <SearchField
                icon={<MapPin size={20} className="text-accent-fg" />}
                label="Destination"
              >
                <button
                  onClick={() => setCityOpen(true)}
                  className="text-left text-[14px] font-semibold text-foreground"
                >
                  {destination}
                </button>
              </SearchField>
              <button
                onClick={() => setDateOpen(true)}
                className="flex h-[60px] w-full items-center gap-3 rounded-xl border border-border bg-card-2 px-3 text-left"
              >
                <Calendar size={20} className="text-accent-fg" />
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-muted">
                    Check-in / Check-out
                  </span>
                  <span className="text-[14px] font-semibold text-foreground">
                    {formatDateLabel(range.start)} —{" "}
                    {formatDateLabel(range.end)}
                  </span>
                </span>
              </button>
              <button
                onClick={() => setGrOpen(true)}
                className="flex h-[60px] w-full items-center gap-3 rounded-xl border border-border bg-card-2 px-3 text-left"
              >
                <Users size={20} className="text-accent-fg" />
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-muted">
                    Guests &amp; Rooms
                  </span>
                  <span className="text-[14px] font-semibold text-foreground">
                    {guestCount.Adults + guestCount.Children} Guest
                    {guestCount.Adults + guestCount.Children !== 1
                      ? "s"
                      : ""}, {rooms} Room{rooms !== 1 ? "s" : ""}
                  </span>
                </span>
              </button>
              <button
                onClick={() => {
                  setLoading(true);
                  setError("");
                  haptic();
                  runSearch(destination);
                }}
                className="tap flex h-[49px] w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[16px] font-bold text-accent-2"
              >
                Search Stays
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
            {["Price", "Rating", "Amenities", "Instant Book"].map((f, i) => (
              <span
                key={f}
                className={`flex h-[33px] shrink-0 items-center rounded-full border px-3 text-[13px] font-semibold ${
                  i === 0
                    ? "border-border bg-accent-2 text-accent"
                    : "border-border bg-card text-foreground"
                }`}
              >
                {f}
              </span>
            ))}
            <button
              onClick={() => {
                setLoading(true);
                setError("");
                const next = !testMode;
                setTestMode(next);
                runSearch(destination, range, next);
              }}
              className={`flex h-[33px] shrink-0 items-center rounded-full border px-3 text-[13px] font-semibold ${
                testMode
                  ? "border-accent-2 bg-accent text-accent-2"
                  : "border-border bg-card text-muted"
              }`}
            >
              Test Hotels
            </button>
          </div>

          <section className="flex flex-col gap-3 px-4 py-5">
            <h2 className="text-[16px] font-bold text-foreground">
              {loading
                ? "Searching stays…"
                : testMode
                  ? "Duffel Test Hotels"
                  : "Results"}
            </h2>

            {loading ? <SkeletonRows rows={3} height={120} /> : null}

            {!loading && error ? (
              <EmptyState
                title="No stays available"
                message={error}
                icon={<MapPin size={24} />}
              />
            ) : null}

            {!loading && !error && stays.length === 0 ? (
              <EmptyState
                title="No stays found"
                message="Try another destination or dates."
                icon={<MapPin size={24} />}
              />
            ) : null}

            <div className="flex flex-col gap-3">
              {!loading &&
                !error &&
                stays.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => select(s)}
                    className="animate-fade-up flex w-full gap-3 rounded-xl border border-border bg-card p-3 text-left"
                    style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                  >
                    <div className="relative h-[100px] w-[110px] shrink-0 overflow-hidden rounded-lg bg-card-2">
                      {s.image ? (
                        <Image
                          src={s.image}
                          alt={s.name}
                          fill
                          sizes="110px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-1 text-[14px] font-bold text-foreground">
                        {s.name}
                        {s.starRating ? (
                          <span className="flex text-[11px] text-accent-fg">
                            {"★".repeat(Math.min(s.starRating, 5))}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex items-center gap-1 text-[12px] text-muted">
                        <Star
                          size={12}
                          className="fill-current text-foreground"
                        />
                        {s.rating > 0 ? `${s.rating} (${s.reviews})` : "New"} ·{" "}
                        {s.city}
                      </span>
                      <span className="text-[13px] font-semibold text-accent-fg">
                        <UsdtAmount value={s.pricePerNight} />
                        /night
                      </span>
                      <span className="text-[10px] text-muted">
                        <UsdtAmount value={s.totalAmount} /> total
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </section>
        </div>

        <BottomTabBar active="Explore" />
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

      <GuestsRoomsSheet
        open={grOpen}
        initial={{ ...guestCount, rooms }}
        onClose={() => setGrOpen(false)}
        onApply={(v) => {
          setGuestCount({ Adults: v.Adults, Children: v.Children });
          setRooms(v.rooms);
        }}
      />

      <CitiesSheet
        open={cityOpen}
        onClose={() => setCityOpen(false)}
        title="Where do you want to go?"
        onSelect={(c) => {
          setDestination(c.name);
          setPlace({ latitude: c.latitude, longitude: c.longitude });
        }}
      />
    </MobileShell>
  );
}

export function AccDetails() {
  const router = useRouter();
  const { setFlow } = useFlow();
  const [stay, setStay] = useState<StayOffer | null>(
    () => readFlow().stay ?? null,
  );
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState<
    { reviewer_name: string; score: number; text: string }[]
  >([]);
  const { toast } = useToast();
  const similar = (readFlow().stays ?? [])
    .filter((s) => s.id !== stay?.id)
    .slice(0, 6);

  useEffect(() => {
    if (!stay) return;
    fetch(`/api/stays/reviews?accommodationId=${encodeURIComponent(stay.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.live && d.reviews?.length) setReviews(d.reviews);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!stay) return;
    fetch(`/api/stays/rates?resultId=${encodeURIComponent(stay.resultId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.live && d.rates?.length) {
          const rate = d.rates[0];
          setStay((prev) => (prev ? { ...prev, rateId: rate.id } : prev));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectStay = (s: StayOffer) => {
    setStay(s);
    writeFlow({ stay: s });
    fetch(`/api/stays/rates?resultId=${encodeURIComponent(s.resultId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.live && d.rates?.length) {
          const rate = d.rates[0];
          setStay((prev) => (prev ? { ...prev, rateId: rate.id } : prev));
        }
      })
      .catch(() => {});
    window.scrollTo({ top: 0 });
  };

  if (!stay) {
    return (
      <MobileShell>
        <div className="flex min-h-full flex-col items-center justify-center gap-3 px-10 text-center">
          <p className="text-[16px] font-bold text-foreground">Accommodation</p>
          <p className="text-[13px] text-muted">Select a stay first.</p>
          <button
            onClick={() => router.push("/stays")}
            className="flex h-10 items-center rounded-xl border border-accent-2 bg-accent px-4 text-[13px] font-bold text-accent-2"
          >
            Search Stays
          </button>
        </div>
      </MobileShell>
    );
  }

  const book = async () => {
    const flow = readFlow();
    const passenger = flow.passenger;
    if (!passenger?.first || !passenger?.email) {
      setFlow({ next: "/stay" });
      router.push("/passengers");
      return;
    }
    if (!stay.rateId) {
      setError("This stay has no bookable rate.");
      return;
    }
    setBooking(true);
    setError("");
    try {
      const res = await fetch("/api/stays/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rateId: stay.rateId,
          guest: {
            given_name: passenger.first,
            family_name: passenger.last,
            email: passenger.email,
            phone_number: `${passenger.dialCode ?? "+234"}${passenger.phone}`,
          },
          ...getStoredIdentity(),
        }),
      });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? "Booking failed");
      writeFlow({ stayBooking: d.booking as StayBooking });
      router.push("/stay/confirmed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Booking failed";
      setError(msg);
      toast("error", msg);
      setBooking(false);
    }
  };

  return (
    <MobileShell header={<><div className="flex h-[60px] items-center gap-3 bg-card px-4 py-3">
            <button
              onClick={() => router.push("/stays")}
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
              <h1 className="text-[16px] font-bold text-foreground">
                {stay.name}
              </h1>
              <p className="text-[12px] text-muted">
                {stay.city} • Guest Rating {stay.rating}
              </p>
            </div>
          </div></>}>
      <div className="flex min-h-full flex-col justify-between">
        <div className="w-full">
                 <ImageCarousel
            images={
              stay.images?.length ? stay.images : stay.image ? [stay.image] : []
            }
            alt={stay.name}
            className="h-[200px] w-full"
          />

          <div className="flex flex-col gap-4 px-4 py-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-[22px] font-extrabold leading-[29px] text-foreground">
                {stay.name}
              </h2>
              <div className="flex items-center gap-2 text-[14px]">
                <Star size={14} className="fill-current text-foreground" />
                <span className="text-foreground">
                  {stay.rating > 0
                    ? `${stay.rating} (${stay.reviews} reviews)`
                    : "New listing"}
                </span>
                <span className="text-muted">•</span>
                <span className="font-semibold text-accent-fg">
                  {stay.location}
                </span>
              </div>
              {stay.starRating ? (
                <span className="text-[12px] font-semibold text-accent-fg">
                  {"★".repeat(Math.min(stay.starRating, 5))} {stay.starRating}-star
                </span>
              ) : null}
              {stay.description ? (
                <p className="mt-1 text-[13px] leading-5 text-muted">
                  {stay.description}
                </p>
              ) : null}
            </div>

            {(stay.amenities?.length ||
              stay.checkInTime ||
              stay.supplierName) ? (
              <div className="flex flex-wrap gap-1.5">
                {stay.amenities?.slice(0, 6).map((a) => (
                  <span
                    key={a}
                    className="rounded-full bg-card-2 px-2.5 py-1 text-[11px] font-medium text-foreground"
                  >
                    {a}
                  </span>
                ))}
                {stay.checkInTime ? (
                  <span className="rounded-full bg-card-2 px-2.5 py-1 text-[11px] font-medium text-muted">
                    Check-in {stay.checkInTime}
                  </span>
                ) : null}
                {stay.supplierName ? (
                  <span className="rounded-full bg-card-2 px-2.5 py-1 text-[11px] font-medium text-muted">
                    by {stay.supplierName}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="h-px w-full bg-border" />

            <div className="flex flex-col gap-3">
              <h3 className="text-[16px] font-bold text-foreground">
                Your stay
              </h3>
              <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
                <div className="flex justify-between">
                  <span className="text-[12px] text-muted">Check-in</span>
                  <span className="text-[13px] font-semibold text-foreground">
                    {stay.checkIn}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[12px] text-muted">Check-out</span>
                  <span className="text-[13px] font-semibold text-foreground">
                    {stay.checkOut}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[12px] text-muted">Guests</span>
                  <span className="text-[13px] font-semibold text-foreground">
                    2 Adults
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-[14px] font-bold text-foreground">
                Location
              </h3>
              <OsmMap
                center={{
                  lat: stay.latitude || 51.5072,
                  lng: stay.longitude || -0.1276,
                }}
                query={`${stay.name}, ${stay.location}`}
              />
            </div>

            {similar.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-[14px] font-bold text-foreground">
                  Similar stays
                </h3>
                <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
                  {similar.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => selectStay(s)}
                      className="animate-fade-up flex w-[150px] shrink-0 flex-col gap-1 rounded-xl border border-border bg-card p-3 text-left"
                      style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
                    >
                      <span className="text-[13px] font-bold text-foreground">
                        {s.name}
                      </span>
                      <span className="text-[11px] text-muted">{s.city}</span>
                      <span className="text-[13px] font-semibold text-accent-fg">
                        <UsdtAmount value={s.pricePerNight} />
                        /night
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="h-px w-full bg-border" />

            <div className="flex flex-col gap-2">
              <h3 className="text-[14px] font-bold text-foreground">
                Price breakdown
              </h3>
              <div className="flex justify-between">
                <span className="text-[13px] text-muted">
                  {stay.pricePerNight.toFixed(2)}/night
                </span>
                <span className="text-[13px] text-foreground">
                  <UsdtAmount value={stay.totalAmount} />
                </span>
              </div>
            </div>

            {reviews.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-[14px] font-bold text-foreground">
                  Guest Reviews
                </h3>
                <div className="flex flex-col gap-2">
                  {reviews.map((r, i) => (
                    <div key={i} className="rounded-lg bg-card-2 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-bold text-foreground">
                          {r.reviewer_name || "Guest"}
                        </span>
                        <span className="flex items-center gap-1 text-[12px] text-accent-fg">
                          <Star size={12} className="fill-current" />
                          {r.score?.toFixed?.(1) ?? r.score ?? ""}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] leading-4 text-foreground">
                        {r.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12px] font-semibold text-red-500">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div aria-hidden className="h-[84px] w-full shrink-0" />
        <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[768px] -translate-x-1/2 border-t border-border bg-card px-4 pb-[calc(30px+env(safe-area-inset-bottom))] pt-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[12px] text-muted">Total Price</span>
              <Price
                usd={stay.totalAmount}
                showUsdt={false}
                className="text-[20px] text-foreground"
                bold
              />
            </div>
            <span className="flex h-6 items-center rounded bg-accent px-2 text-[12px] font-bold text-accent-2">
              <UsdtAmount value={stay.totalAmount} />
            </span>
          </div>
          <AuthActionButton
            onAction={() => {
              haptic();
              book();
            }}
            busy={booking}
            busyLabel="Booking…"
            disabled={booking}
            className="tap mt-3 flex h-[49px] w-full items-center justify-center gap-2 rounded-xl border border-accent-2 bg-accent text-[16px] font-bold text-accent-2 disabled:opacity-60"
          >
            Book Now
          </AuthActionButton>
        </div>
      </div>
    </MobileShell>
  );
}

export function AccConfirmed() {
  const router = useRouter();
  const [booking, setBooking] = useState<StayBooking | null>(
    () => readFlow().stayBooking ?? null,
  );
  const [cancelling, setCancelling] = useState(false);
  const { toast } = useToast();

  const shareBooking = async () => {
    const result = await share({
      title: `Triply · ${booking?.reference ?? "Stay"}`,
      text: `Stay booking ${booking?.reference ?? ""} — ${booking?.accommodationName ?? ""}`,
      url: typeof window !== "undefined" ? window.location.href : "",
    });
    toast(
      result === "shared" ? "success" : "info",
      result === "shared"
        ? "Booking shared."
        : result === "copied"
          ? "Link copied to clipboard."
          : "Sharing is not available on this device.",
    );
  };

  const cancelBooking = async () => {
    if (
      !booking ||
      !window.confirm(`Cancel stay booking ${booking.reference}?`)
    )
      return;
    setCancelling(true);
    try {
      const res = await fetch(
        `/api/stays/book/${encodeURIComponent(booking.id)}/cancel`,
        { method: "POST" },
      );
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? "Cancellation failed");
      setBooking(null);
      toast("success", `Stay booking ${booking.reference} cancelled.`);
    } catch (err) {
      toast(
        "error",
        err instanceof Error ? err.message : "Cancellation failed",
      );
    } finally {
      setCancelling(false);
    }
  };

  if (!booking) {
    return (
      <MobileShell>
        <div className="flex min-h-full flex-col items-center justify-center gap-3 px-10 text-center">
          <p className="text-[16px] font-bold text-foreground">
            Stay Confirmed
          </p>
          <p className="text-[13px] text-muted">
            No stay booking found on this device.
          </p>
          <button
            onClick={() => router.push("/stays")}
            className="flex h-10 items-center rounded-xl border border-accent-2 bg-accent px-4 text-[13px] font-bold text-accent-2"
          >
            Search Stays
          </button>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <div className="flex min-h-full flex-col justify-between">
        <div className="w-full">
          <div className="sticky top-0 z-30 flex h-[60px] items-center gap-3 bg-card px-4 py-3">
            <button
              onClick={() => router.push("/trips")}
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
              <h1 className="text-[16px] font-bold text-foreground">
                Stay Confirmed
              </h1>
              <p className="text-[12px] text-muted">{booking.reference}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 px-4 py-5">
            <div className="flex items-center gap-3 rounded-xl bg-[#10b981] px-4 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#10b981]">
                <Check size={16} strokeWidth={3} className="text-[#0f172a]" />
              </span>
              <div className="flex flex-col">
                <span className="text-[18px] font-extrabold text-white">
                  Stay Confirmed!
                </span>
                <span className="text-[12px] text-white/80">
                  Securely recorded on-chain · {booking.status}
                </span>
              </div>
            </div>

            <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between bg-card-2 px-4 py-3.5">
                <span className="text-[14px] font-bold text-foreground">
                  {booking.accommodationName}
                </span>
                <span className="text-[12px] font-semibold text-muted">
                  {booking.reference}
                </span>
              </div>

              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex flex-col">
                  <span className="text-[18px] font-extrabold text-foreground">
                    {booking.checkIn}
                  </span>
                  <span className="text-[12px] text-muted">
                    Check-In (3 PM)
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[11px] text-muted">Stay</span>
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-2" />
                    <span className="h-px w-20 bg-border" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[18px] font-extrabold text-foreground">
                    {booking.checkOut}
                  </span>
                  <span className="text-[12px] text-muted">
                    Check-Out (11 AM)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted">Booking Ref</span>
                  <span className="text-[13px] font-bold text-accent-fg">
                    {booking.reference}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[10px] text-muted">Total Paid</span>
                  <span className="text-[13px] font-bold text-foreground">
                    <UsdtAmount value={booking.totalAmount} />
                  </span>
                </div>
              </div>

              {booking.address ? (
                <div className="bg-card-2 px-4 py-3 text-[12px] text-foreground">
                  {booking.address}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    downloadIcs({
                      title: `Stay · ${booking.accommodationName || "Accommodation"}`,
                      location: booking.address,
                      description: `Booking ${booking.reference}`,
                      start: booking.checkIn,
                      end: booking.checkOut,
                    })
                  }
                  className="flex h-[43px] flex-1 items-center justify-center rounded-xl border border-border bg-card text-[14px] font-bold text-foreground"
                >
                  Add to Calendar
                </button>
                <a
                  href={directionsUrl(
                    booking.address || booking.accommodationName,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-[43px] flex-1 items-center justify-center rounded-xl border border-border bg-card text-[14px] font-bold text-foreground"
                >
                  Get Directions
                </a>
              </div>
              <ProgressButton
                onAction={shareBooking}
                busyLabel="Sharing…"
                className="flex h-[43px] w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[14px] font-bold text-accent-2"
              >
                Share Booking
              </ProgressButton>
              <ProgressButton
                onAction={cancelBooking}
                busy={cancelling}
                busyLabel="Cancelling…"
                className="flex h-[43px] w-full items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 text-[14px] font-bold text-red-500"
              >
                Cancel Booking
              </ProgressButton>
            </div>
          </div>
        </div>

        <BottomTabBar active="Bookings" />
      </div>
    </MobileShell>
  );
}
