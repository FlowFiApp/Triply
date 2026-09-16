"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Calendar,
  Check,
  Map as MapIcon,
  MapPin,
  Minus,
  Plus,
  Settings,
  Users,
  Fuel,
  AirVent,
} from "lucide-react";
import {
  Avatar,
  BottomTabBar,
  BrandHeader,
  MobileShell,
} from "@/components/shell";
import { directionsUrl } from "@/components/MapEmbed";
import GoogleMap from "@/components/GoogleMap";
import ExploreTabs from "@/components/ui/explore-tabs";
import PointsChip from "@/components/ui/points-chip";
import LocationMapSheet from "@/components/ui/location-map-sheet";
import { EmptyState, Price, SkeletonRows } from "@/components/ui/feedback";
import { AuthActionButton } from "@/components/ui/auth-action";
import { ProgressButton } from "@/components/ui/progress-button";
import { UsdtAmount } from "@/components/ui/Usdt";
import ImageCarousel from "@/components/ui/image-carousel";
import DateRangePicker, {
  formatDateLabel,
} from "@/components/ui/date-range-picker";
import PlacesCombobox, {
  type PlaceSelection,
} from "@/components/ui/places-combobox";
import { readFlow, writeFlow } from "@/lib/store";
import { useFlow } from "@/lib/flow-context";
import { useCarSearch } from "@/lib/api/hooks";
import { useToast } from "@/lib/toast";
import { getStoredIdentity } from "@/lib/identity";
import { share } from "@/lib/share";
import { downloadIcs } from "@/lib/calendar";
import { copyText } from "@/lib/nimiq";
import { haptic } from "@/lib/haptics";
import type { CarOffer, CarBooking } from "@/lib/types";

const TIMES = [
  "08:00",
  "09:00",
  "10:00",
  "10:30",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

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

export function CarSearch() {
  const router = useRouter();
  const [cars, setCars] = useState<CarOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [testMode, setTestMode] = useState(false);
  const [pickupLocation, setPickupLocation] = useState("London Heathrow (LHR)");
  const [pickupPlace, setPickupPlace] = useState<PlaceSelection | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [range, setRange] = useState({
    start: "2026-10-24",
    end: "2026-10-29",
  });
  const [dateOpen, setDateOpen] = useState(false);
  const [pickupTime, setPickupTime] = useState("10:30");
  const [returnTime, setReturnTime] = useState("15:00");
  const [age, setAge] = useState(25);

  const carSearch = useCarSearch();
  const runSearch = (test = testMode) => {
    carSearch
      .mutateAsync({
        pickupLocation,
        latitude: pickupPlace?.latitude,
        longitude: pickupPlace?.longitude,
        pickupDate: range.start,
        pickupTime,
        dropoffDate: range.end,
        dropoffTime: returnTime,
        driverAge: age,
        test,
      })
      .then((d) => {
        if (!d.live) throw new Error("No cars available at this location.");
        setCars(d.cars);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to search cars."),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (c: CarOffer) => {
    writeFlow({ car: c });
    router.push("/car");
  };

  return (
    <MobileShell header={<BrandHeader right={<div className="flex items-center gap-2"><PointsChip /><Avatar /></div>} />}>
      <div className="flex min-h-full flex-col justify-between">
        <div className="w-full">
          <ExploreTabs active="cars" />

          <div className="px-4 py-3">
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-[18px]">
              <h2 className="text-[18px] font-extrabold text-foreground">
                Rent a Car
              </h2>
              <SearchField
                icon={<MapPin size={20} className="text-accent-fg" />}
                label="Pickup Location"
                right={
                  <button
                    onClick={() => setMapOpen(true)}
                    aria-label="Pick on map"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground"
                  >
                    <MapIcon size={15} className="text-accent-fg" />
                  </button>
                }
              >
                <PlacesCombobox
                  value={pickupLocation}
                  onChange={setPickupLocation}
                  onSelect={(p) => {
                    setPickupLocation(p.name);
                    setPickupPlace(p);
                  }}
                />
              </SearchField>
              <button
                onClick={() => setDateOpen(true)}
                className="flex h-[60px] w-full items-center gap-3 rounded-xl border border-border bg-card-2 px-3 text-left"
              >
                <Calendar size={20} className="text-accent-fg" />
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-muted">
                    Pickup / Return Date
                  </span>
                  <span className="text-[14px] font-semibold text-foreground">
                    {formatDateLabel(range.start)} —{" "}
                    {formatDateLabel(range.end)}
                  </span>
                </span>
              </button>
              <div className="flex gap-2">
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-muted">
                    Pickup Time
                  </span>
                  <select
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="h-[43px] rounded-[10px] border border-border bg-card px-3 text-[14px] font-semibold text-foreground outline-none"
                  >
                    {TIMES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-muted">
                    Return Time
                  </span>
                  <select
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="h-[43px] rounded-[10px] border border-border bg-card px-3 text-[14px] font-semibold text-foreground outline-none"
                  >
                    {TIMES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <SearchField
                icon={<Users size={20} className="text-accent-fg" />}
                label="Driver's Age"
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => setAge((a) => Math.max(18, a - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card-2 text-muted"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center text-[14px] font-semibold text-foreground">
                    {age} yrs
                  </span>
                  <button
                    onClick={() => setAge((a) => Math.min(75, a + 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-2"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </SearchField>
              <button
                onClick={() => {
                  setLoading(true);
                  setError("");
                  haptic();
                  runSearch();
                }}
                className="tap flex h-[49px] w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[16px] font-bold text-accent-2"
              >
                Search Cars
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
            {["Automatic", "Manual", "SUV", "Electric"].map((f, i) => (
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
                runSearch(next);
              }}
              className={`flex h-[33px] shrink-0 items-center rounded-full border px-3 text-[13px] font-semibold ${
                testMode
                  ? "border-accent-2 bg-accent text-accent-2"
                  : "border-border bg-card text-muted"
              }`}
            >
              Test Cars
            </button>
          </div>

          <section className="flex flex-col gap-3 px-4 py-5">
            <h2 className="text-[16px] font-bold text-foreground">
              {loading
                ? "Searching cars…"
                : testMode
                  ? "Duffel Test Drive"
                  : "Results"}
            </h2>

            {loading ? <SkeletonRows rows={3} height={84} /> : null}

            {!loading && error ? (
              <EmptyState
                title="No cars available"
                message={error}
                icon={<MapPin size={24} />}
              />
            ) : null}

            <div className="flex flex-col gap-3">
              {!loading &&
                !error &&
                cars.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => select(c)}
                    className="animate-fade-up flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left"
                    style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                  >
                    <div className="relative h-[60px] w-20 shrink-0 overflow-hidden rounded-lg bg-card-2">
                      {c.image ? (
                        <Image
                          src={c.image}
                          alt={c.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="text-[14px] font-bold text-foreground">
                        {c.name}
                      </span>
                      <span className="text-[12px] text-muted">
                        {c.category || "Car"} • {c.transmission || "—"}
                        {c.supplier ? ` • ${c.supplier}` : ""}
                      </span>
                      <span className="flex flex-wrap gap-1 text-[10px] text-muted">
                        {c.seats ? <span>• {c.seats} seats</span> : null}
                        {c.doors ? <span>• {c.doors} doors</span> : null}
                        {c.luggage ? <span>• {c.luggage} bags</span> : null}
                        {c.fuel ? <span>• {c.fuel}</span> : null}
                        {c.airCon ? <span>• A/C</span> : null}
                      </span>
                      <span className="text-[13px] font-semibold text-accent-fg">
                        <UsdtAmount value={c.pricePerDay} /> / day
                      </span>
                    </div>
                    <span className="text-[14px] font-bold text-accent-fg">
                      <UsdtAmount value={c.totalAmount} />
                    </span>
                  </button>
                ))}
            </div>
          </section>
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

      <LocationMapSheet
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        initial={{
          name: pickupLocation,
          latitude: pickupPlace?.latitude ?? 51.47,
          longitude: pickupPlace?.longitude ?? -0.4543,
        }}
        onSelect={(p) => {
          setPickupPlace(p);
          setPickupLocation(p.name);
        }}
      />
    </MobileShell>
  );
}

export function CarDetails() {
  const router = useRouter();
  const { setFlow } = useFlow();
  const [car] = useState<CarOffer | null>(() => readFlow().car ?? null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");

  if (!car) {
    return (
      <MobileShell>
        <div className="flex min-h-full flex-col items-center justify-center gap-3 px-10 text-center">
          <p className="text-[16px] font-bold text-foreground">Car Rental</p>
          <p className="text-[13px] text-muted">Select a car first.</p>
          <button
            onClick={() => router.push("/cars")}
            className="flex h-10 items-center rounded-xl border border-accent-2 bg-accent px-4 text-[13px] font-bold text-accent-2"
          >
            Search Cars
          </button>
        </div>
      </MobileShell>
    );
  }

  const book = async () => {
    const flow = readFlow();
    const passenger = flow.passenger;
    if (!passenger?.first || !passenger?.email) {
      setFlow({ next: "/car" });
      router.push("/passengers");
      return;
    }
    setBooking(true);
    setError("");
    try {
      const res = await fetch("/api/cars/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rateId: car.id,
          driver: {
            given_name: passenger.first,
            family_name: passenger.last,
            email: passenger.email,
            phone_number: `${passenger.dialCode ?? "+234"}${passenger.phone}`,
            date_of_birth: passenger.dob,
          },
          ...getStoredIdentity(),
        }),
      });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? "Booking failed");
      writeFlow({ carBooking: d.booking as CarBooking });
      router.push("/car/confirmed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
      setBooking(false);
    }
  };

  return (
    <MobileShell header={<><div className="flex h-[60px] items-center gap-3 bg-card px-4 py-3">
            <button
              onClick={() => router.push("/cars")}
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
                {car.name}
              </h1>
              <p className="text-[12px] text-muted">
                {car.category || "Car"} • {car.transmission || "Automatic"}
              </p>
            </div>
          </div></>}>
      <div className="flex min-h-full flex-col justify-between">
        <div className="w-full">
                 <ImageCarousel
            images={car.image ? [car.image] : []}
            alt={car.name}
            className="h-[180px] w-full"
          />

          <div className="flex flex-col gap-4 px-4 py-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[22px] font-extrabold text-foreground">
                {car.name}
              </h2>
              <span className="flex h-[23px] items-center rounded-md bg-card-2 px-2 text-[11px] font-bold text-accent-fg">
                {car.category || "Car"}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {car.seats ? (
                <span className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-card-2 px-2.5 text-[12px] font-medium text-foreground">
                  <Users size={14} /> {car.seats} Passengers
                </span>
              ) : null}
              {car.doors ? (
                <span className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-card-2 px-2.5 text-[12px] font-medium text-foreground">
                  <Settings size={14} className="text-accent-fg" /> {car.doors} doors
                </span>
              ) : null}
              {car.luggage ? (
                <span className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-card-2 px-2.5 text-[12px] font-medium text-foreground">
                  🧳 {car.luggage} bags
                </span>
              ) : null}
              <span className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-card-2 px-2.5 text-[12px] font-medium text-foreground">
                <Settings size={14} className="text-accent-fg" />{" "}
                {car.transmission || "Automatic"}
              </span>
              {car.fuel ? (
                <span className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-card-2 px-2.5 text-[12px] font-medium text-foreground">
                  <Fuel size={14} className="text-accent-fg" /> {car.fuel}
                </span>
              ) : null}
              {car.airCon ? (
                <span className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-card-2 px-2.5 text-[12px] font-medium text-foreground">
                  <AirVent size={14} /> A/C
                </span>
              ) : null}
              {car.gps ? (
                <span className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-card-2 px-2.5 text-[12px] font-medium text-foreground">
                  GPS
                </span>
              ) : null}
              {car.bluetooth ? (
                <span className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-card-2 px-2.5 text-[12px] font-medium text-foreground">
                  Bluetooth
                </span>
              ) : null}
              {car.usb ? (
                <span className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-card-2 px-2.5 text-[12px] font-medium text-foreground">
                  USB
                </span>
              ) : null}
            </div>

            {(car.mileage || car.fuelPolicy || car.insuranceIncluded || car.additionalDriver) ? (
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
                <h3 className="text-[14px] font-bold text-foreground">
                  Rental terms
                </h3>
                <div className="flex flex-col gap-1.5 text-[12px] text-foreground">
                  {car.mileage ? <span>• Mileage: {car.mileage}</span> : null}
                  {car.fuelPolicy ? <span>• Fuel: {car.fuelPolicy}</span> : null}
                  {car.insuranceIncluded ? <span>• Insurance included</span> : null}
                  {car.additionalDriver ? <span>• Additional driver included</span> : null}
                </div>
              </div>
            ) : null}

            <div className="h-px w-full bg-border" />

            <div className="flex flex-col gap-3">
              <h3 className="text-[14px] font-bold text-foreground">
                Pickup &amp; Dropoff Details
              </h3>
              <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
                <span className="text-[12px] font-bold text-accent-fg">
                  PICKUP: {car.pickup}
                </span>
                <span className="text-[13px] text-foreground">
                  {car.pickupTime}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
                <span className="text-[12px] font-bold text-accent-fg">
                  RETURN: {car.dropoff}
                </span>
                <span className="text-[13px] text-foreground">
                  {car.dropoffTime}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-[14px] font-bold text-foreground">
                Pickup Location
              </h3>
              <GoogleMap
                center={{
                  lat: car.pickupLatitude || 51.47,
                  lng: car.pickupLongitude || -0.4543,
                }}
                query={car.pickup}
                markers={[
                  {
                    lat: car.pickupLatitude || 51.47,
                    lng: car.pickupLongitude || -0.4543,
                  },
                  {
                    lat: car.dropoffLatitude || car.pickupLatitude || 51.47,
                    lng: car.dropoffLongitude || car.pickupLongitude || -0.4543,
                  },
                ]}
              />
            </div>

            <div className="h-px w-full bg-border" />

            <div className="flex flex-col gap-2">
              <h3 className="text-[14px] font-bold text-foreground">
                Price Breakdown
              </h3>
              <div className="flex justify-between">
                <span className="text-[13px] text-muted">
                  Rental ({car.pricePerDay.toFixed(2)}/day)
                </span>
                <span className="text-[13px] text-foreground">
                  <UsdtAmount value={car.totalAmount} />
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[13px] text-muted">Supplier</span>
                <span className="text-[13px] text-foreground">
                  {car.supplier || "—"}
                </span>
              </div>
            </div>

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
                usd={car.totalAmount}
                showUsdt={false}
                className="text-[20px] text-foreground"
                bold
              />
            </div>
            <span className="flex h-6 items-center rounded bg-accent px-2 text-[12px] font-bold text-accent-2">
              <UsdtAmount value={car.totalAmount} />
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
            Book This Car
          </AuthActionButton>
        </div>
      </div>
    </MobileShell>
  );
}

export function CarConfirmed() {
  const router = useRouter();
  const [booking, setBooking] = useState<CarBooking | null>(
    () => readFlow().carBooking ?? null,
  );
  const [cancelling, setCancelling] = useState(false);
  const { toast } = useToast();

  const shareBooking = async () => {
    const result = await share({
      title: `Triply · ${booking?.reference ?? "Car"}`,
      text: `Car rental ${booking?.reference ?? ""} — ${booking?.carName ?? ""}`,
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
    if (!booking || !window.confirm(`Cancel car booking ${booking.reference}?`))
      return;
    setCancelling(true);
    try {
      const res = await fetch(
        `/api/cars/book/${encodeURIComponent(booking.id)}/cancel`,
        { method: "POST" },
      );
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? "Cancellation failed");
      setBooking(null);
      toast("success", `Car booking ${booking.reference} cancelled.`);
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
            Rental Confirmed
          </p>
          <p className="text-[13px] text-muted">
            No car booking found on this device.
          </p>
          <button
            onClick={() => router.push("/cars")}
            className="flex h-10 items-center rounded-xl border border-accent-2 bg-accent px-4 text-[13px] font-bold text-accent-2"
          >
            Search Cars
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
                Rental Confirmed
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
                  Car Rental Confirmed!
                </span>
                <span className="text-[12px] text-white/80">
                  Your reservation is mint-verified on-chain · {booking.status}
                </span>
              </div>
            </div>

            <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between bg-card-2 px-4 py-3.5">
                <span className="text-[14px] font-bold text-foreground">
                  {booking.carName}
                </span>
                <span className="text-[12px] font-semibold text-muted">
                  {booking.reference}
                </span>
              </div>

              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex flex-col">
                  <span className="text-[18px] font-extrabold text-foreground">
                    {booking.pickupDate}
                  </span>
                  <span className="text-[11px] text-muted">Pickup</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[11px] text-muted">Rental</span>
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-2" />
                    <span className="h-px w-20 bg-border" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[18px] font-extrabold text-foreground">
                    {booking.dropoffDate}
                  </span>
                  <span className="text-[11px] text-muted">Return</span>
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
                  <span className="text-[10px] text-muted">Amount Paid</span>
                  <span className="text-[13px] font-bold text-foreground">
                    <UsdtAmount value={booking.totalAmount} />
                  </span>
                </div>
              </div>

              <div className="bg-card-2 px-4 py-4 text-[12px] text-foreground">
                Pickup Location: {booking.pickupLocation}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    downloadIcs({
                      title: `Car · ${booking.carName || "Rental"}`,
                      location: booking.pickupLocation,
                      description: `Booking ${booking.reference}`,
                      start: booking.pickupDate,
                      end: booking.dropoffDate,
                    })
                  }
                  className="flex h-[43px] flex-1 items-center justify-center rounded-xl border border-border bg-card text-[14px] font-bold text-foreground"
                >
                  Add to Calendar
                </button>
                <a
                  href={directionsUrl(booking.pickupLocation)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-[43px] flex-1 items-center justify-center rounded-xl border border-border bg-card text-[14px] font-bold text-foreground"
                >
                  Get Directions
                </a>
              </div>
              <button
                onClick={() => {
                  const ok = copyText(`Triply booking ${booking.reference} · ${booking.carName}`);
                  toast(
                    ok ? "success" : "error",
                    ok
                      ? "Booking reference copied — quote it to the supplier."
                      : "Copy failed.",
                  );
                }}
                className="flex h-[43px] w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[14px] font-bold text-accent-2"
              >
                Contact Supplier
              </button>
              <ProgressButton
                onAction={shareBooking}
                busyLabel="Sharing…"
                className="flex h-[43px] w-full items-center justify-center rounded-xl border border-border bg-card text-[14px] font-bold text-foreground"
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
