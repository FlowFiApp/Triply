"use client";

import type {
  FlightOffer,
  PassengerInfo,
  OrderRecord,
  StayOffer,
  StayBooking,
  CarOffer,
  CarBooking,
} from "@/lib/types";

const KEY = "triply-flow";

// Dispatched whenever the flow is written, so the FlowProvider context stays
// in sync with raw writeFlow/readFlow usage (store.ts) used by stays/cars.
export const FLOW_EVENT = "triply-flow-change";

export type SearchIntent = {
  origin: string;
  destination: string;
  date: string;
  returnDate?: string;
  passengers: number;
  cabin: string;
  slices?: { origin: string; destination: string; departureDate: string }[];
  multiCity?: boolean;
};

export type Flow = {
  passenger?: PassengerInfo;
  passengersList?: PassengerInfo[];
  offer?: FlightOffer;
  offers?: FlightOffer[];
  passengers?: number;
  selectedServiceIds?: string[];
  serviceQuantities?: Record<string, number>;
  seat?: string;
  amount?: number;
  order?: OrderRecord;
  orderId?: string;
  txHash?: string;
  chain?: string;
  hold?: boolean;
  stay?: StayOffer;
  stays?: StayOffer[];
  stayBooking?: StayBooking;
  stayGuests?: number;
  car?: CarOffer;
  cars?: CarOffer[];
  carBooking?: CarBooking;
  search?: SearchIntent;
  next?: string;
};

export function readFlow(): Partial<Flow> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as Partial<Flow>;
  } catch {
    return {};
  }
}

export function writeFlow(patch: Partial<Flow>) {
  if (typeof window === "undefined") return;
  const cur = readFlow();
  sessionStorage.setItem(KEY, JSON.stringify({ ...cur, ...patch }));
  window.dispatchEvent(new CustomEvent(FLOW_EVENT));
}

export function clearFlow() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(FLOW_EVENT));
}

const RECENT_KEY = "triply-recent";

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function addRecentSearch(value: string) {
  if (typeof window === "undefined") return;
  const cur = getRecentSearches().filter((v) => v !== value);
  sessionStorage.setItem(RECENT_KEY, JSON.stringify([value, ...cur].slice(0, 5)));
}