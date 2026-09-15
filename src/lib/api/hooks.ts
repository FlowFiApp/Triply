"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FeedMoment } from "@/lib/feed";
import type { FlightOffer, StayOffer, CarOffer } from "@/lib/types";
import { identityKey, loadDeviceId } from "@/lib/identity";

export type Profile = { username: string; avatar: string; onboarded: boolean };

export type SavedPassenger = {
  id: string;
  first: string;
  last: string;
  dob: string;
  gender: string;
  email: string;
  phone: string;
  dialCode?: string;
  passport?: string;
  createdAt?: string;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function sendJson<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`);
  return data;
}

/** Resolves the server-issued identity key before running a query. */
export async function ensureIdentity(): Promise<string> {
  await loadDeviceId();
  return identityKey();
}

// ---- Feed ----------------------------------------------------------------

export function useFeed() {
  return useQuery({
    queryKey: ["feed"],
    queryFn: async () => {
      const key = await ensureIdentity();
      const d = await getJson<{ moments: FeedMoment[]; live: boolean; error?: string }>(
        `/api/feed?key=${encodeURIComponent(key)}`,
      );
      if (!d.live) throw new Error(d.error ?? "Feed is unavailable right now.");
      return d.moments;
    },
  });
}

export function useCreateMoment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { caption: string; location?: string; images: string[] }) => {
      const key = await ensureIdentity();
      return sendJson<{ moment: FeedMoment }>("/api/feed", "POST", { key, ...input });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["points"] });
    },
  });
}

export function useLikeMoment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const key = await ensureIdentity();
      return sendJson<{ liked: boolean }>(`/api/feed/${id}/like`, "POST", { key });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["points"] });
    },
  });
}

export function useCommentMoment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const key = await ensureIdentity();
      return sendJson(`/api/feed/${id}/comment`, "POST", { key, text });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["points"] });
    },
  });
}

export function useDeleteMoment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const key = await ensureIdentity();
      return sendJson(`/api/feed/${id}?key=${encodeURIComponent(key)}`, "DELETE");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed"] }),
  });
}

export function useShareMoment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      sendJson(`/api/feed/${id}/share`, "POST"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed"] }),
  });
}

export function useUploadFeedImage() {
  return useMutation({
    mutationFn: async (image: string) =>
      sendJson<{ url: string }>("/api/feed/upload", "POST", { image }),
  });
}

// ---- Profile -------------------------------------------------------------

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const key = await ensureIdentity();
      return getJson<Profile>(`/api/profile?key=${encodeURIComponent(key)}`);
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { username?: string; avatar?: string; onboarded?: boolean }) => {
      const key = await ensureIdentity();
      return sendJson<{ profile: Profile }>("/api/profile", "PATCH", { key, ...patch });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useUploadAvatar() {
  return useMutation({
    mutationFn: async (image: string) =>
      sendJson<{ url: string }>("/api/profile/avatar", "POST", { image }),
  });
}

// ---- Bookings ------------------------------------------------------------

export function useBookings(email?: string) {
  return useQuery({
    queryKey: ["bookings", email ?? ""],
    queryFn: () =>
      getJson<{ bookings: unknown[] }>(
        `/api/bookings${email ? `?email=${encodeURIComponent(email)}` : ""}`,
      ),
  });
}

// ---- Sender / points ops -------------------------------------------------

export function useSender() {
  return useQuery({
    queryKey: ["sender"],
    queryFn: () => getJson<{ configured: boolean; sender: string }>("/api/points/sender"),
  });
}

// ---- Saved passengers ----------------------------------------------------

export function usePassengers() {
  return useQuery({
    queryKey: ["passengers"],
    queryFn: async () => {
      const key = await ensureIdentity();
      const d = await getJson<{ passengers: SavedPassenger[] }>(
        `/api/passengers?key=${encodeURIComponent(key)}`,
      );
      return d.passengers ?? [];
    },
  });
}

export function useSavePassenger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<SavedPassenger, "id" | "createdAt"> & { id?: string },
    ) => {
      const key = await ensureIdentity();
      const method = input.id ? "PATCH" : "POST";
      return sendJson("/api/passengers", method, { key, ...input });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passengers"] }),
  });
}

export function useDeletePassenger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const key = await ensureIdentity();
      return sendJson(
        `/api/passengers?key=${encodeURIComponent(key)}&id=${encodeURIComponent(id)}`,
        "DELETE",
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passengers"] }),
  });
}

// ---- Searches ------------------------------------------------------------

export type FlightSearchInput = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: string;
  slices?: { origin: string; destination: string; departureDate: string }[];
};

export function useFlightSearch() {
  return useMutation({
    mutationFn: (input: FlightSearchInput) =>
      sendJson<{ offers: FlightOffer[]; live: boolean; error?: string }>(
        "/api/flights/search",
        "POST",
        input,
      ),
  });
}

export type StaySearchInput = {
  destination?: string;
  latitude?: number;
  longitude?: number;
  checkInDate?: string;
  checkOutDate?: string;
  rooms?: number;
  guests?: number;
  test?: boolean;
};

export function useStaySearch() {
  return useMutation({
    mutationFn: (input: StaySearchInput) =>
      sendJson<{ stays: StayOffer[]; live: boolean; test: boolean }>(
        "/api/stays/search",
        "POST",
        input,
      ),
  });
}

export type CarSearchInput = {
  pickupLocation?: string;
  latitude?: number;
  longitude?: number;
  pickupDate?: string;
  pickupTime?: string;
  dropoffDate?: string;
  dropoffTime?: string;
  driverAge?: number;
  test?: boolean;
};

export function useCarSearch() {
  return useMutation({
    mutationFn: (input: CarSearchInput) =>
      sendJson<{ cars: CarOffer[]; live: boolean; test: boolean }>(
        "/api/cars/search",
        "POST",
        input,
      ),
  });
}