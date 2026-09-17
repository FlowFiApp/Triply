"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FeedMoment } from "@/lib/feed";
import type { FlightOffer, StayOffer, CarOffer } from "@/lib/types";
import { useWalletState } from "@/lib/wallet-state";

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

/**
 * Reactive identity key: the authenticated Nimiq address. Query keys are scoped
 * to it so switching accounts refetches the right user. Identity-scoped queries
 * are gated on a verified session (the API returns 401 otherwise).
 */
export function useIdentityKey(): string {
  const { state, authState } = useWalletState();
  return authState === "authenticated" ? (state.nimiqAddress ?? "") : "";
}

// ---- Feed ----------------------------------------------------------------

export function useFeed() {
  const { state } = useWalletState();
  const key = state.nimiqAddress ?? "";
  return useQuery({
    queryKey: ["feed", key],
    enabled: true,
    queryFn: async () => {
      const d = await getJson<{ moments: FeedMoment[]; live: boolean; error?: string }>(
        `/api/feed`,
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
      return sendJson<{ moment: FeedMoment }>("/api/feed", "POST", input);
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
      return sendJson<{ liked: boolean }>(`/api/feed/${id}/like`, "POST");
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
      return sendJson(`/api/feed/${id}/comment`, "POST", { text });
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
      return sendJson(`/api/feed/${id}`, "DELETE");
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

// ---- Loyalty Programmes --------------------------------------------------

export type LoyaltyProgramme = {
  id: string;
  name: string;
  alliance: string | null;
  logoUrl: string | null;
  ownerAirlineId: string;
};

export function useLoyaltyProgrammes() {
  const { state } = useWalletState();
  const key = state.nimiqAddress ?? "";
  return useQuery({
    queryKey: ["loyalty-programmes", key],
    enabled: true,
    queryFn: async () => {
      const d = await getJson<{
        programmes: LoyaltyProgramme[];
        live: boolean;
        error?: string;
      }>(`/api/loyalty-programmes`);
      if (d.error) throw new Error(d.error);
      return d.programmes ?? [];
    },
  });
}

// ---- Profile -------------------------------------------------------------

export function useProfile() {
  const key = useIdentityKey();
  return useQuery({
    queryKey: ["profile", key],
    enabled: Boolean(key),
    queryFn: () => getJson<Profile>(`/api/profile`),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { username?: string; avatar?: string; onboarded?: boolean }) => {
      return sendJson<{ profile: Profile }>("/api/profile", "PATCH", patch);
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

// ---- Saved passengers ----------------------------------------------------

export function usePassengers() {
  const key = useIdentityKey();
  return useQuery({
    queryKey: ["passengers", key],
    enabled: Boolean(key),
    queryFn: async () => {
      const d = await getJson<{ passengers: SavedPassenger[] }>(
        `/api/passengers`,
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
      const method = input.id ? "PATCH" : "POST";
      return sendJson("/api/passengers", method, input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passengers"] }),
  });
}

export function useDeletePassenger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return sendJson(`/api/passengers?id=${encodeURIComponent(id)}`, "DELETE");
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