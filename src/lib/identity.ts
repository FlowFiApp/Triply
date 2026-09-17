"use client";

import { normalizeNimiqAddress } from "@/lib/nimiq";

export type UserIdentity = {
  nimiqAddress?: string;
  evmAddress?: string;
};

// In-memory only — wallet addresses are never written to localStorage.
let memoryIdentity: UserIdentity = {};

export function setStoredIdentity(id: UserIdentity) {
  memoryIdentity = {
    nimiqAddress: normalizeNimiqAddress(id.nimiqAddress),
    evmAddress: id.evmAddress,
  };
}

export function getStoredIdentity(): UserIdentity {
  return memoryIdentity;
}

/** The user key is the Nimiq address — nothing else. */
export function identityKey(): string {
  return memoryIdentity.nimiqAddress ?? "";
}