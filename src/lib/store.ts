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

export type Flow = {
  passenger?: PassengerInfo;
  offer?: FlightOffer;
  offers?: FlightOffer[];
  amount?: number;
  order?: OrderRecord;
  orderId?: string;
  txHash?: string;
  chain?: string;
  stay?: StayOffer;
  stays?: StayOffer[];
  stayBooking?: StayBooking;
  car?: CarOffer;
  cars?: CarOffer[];
  carBooking?: CarBooking;
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
}

export function clearFlow() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
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