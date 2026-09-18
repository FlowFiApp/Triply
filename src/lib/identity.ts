"use client";

import { normalizeNimiqAddress } from "@/lib/nimiq";

export type UserIdentity = {
  nimiqAddress?: string;
  evmAddress?: string;
};

// In-memory cache (set by the wallet provider) with a fallback to the persisted
// wallet state so identityKey()/feedKey() work before hydration completes.
let memoryIdentity: UserIdentity = {};

export function setStoredIdentity(id: UserIdentity) {
  memoryIdentity = {
    nimiqAddress: normalizeNimiqAddress(id.nimiqAddress),
    evmAddress: id.evmAddress,
  };
}

export function getStoredIdentity(): UserIdentity {
  if (memoryIdentity.nimiqAddress) return memoryIdentity;
  if (typeof window === "undefined") return {};
  try {
    const stored = JSON.parse(localStorage.getItem("triply-wallet") ?? "null");
    if (stored && typeof stored === "object") {
      return {
        nimiqAddress: normalizeNimiqAddress(stored.nimiqAddress),
        evmAddress: stored.evmAddress,
      };
    }
  } catch {
    // ignore
  }
  return {};
}

/** The user key is the Nimiq address — nothing else. */
export function identityKey(): string {
  return getStoredIdentity().nimiqAddress ?? "";
}