"use client";

import { normalizeNimiqAddress } from "@/lib/nimiq";

export type UserIdentity = {
  nimiqAddress?: string;
  evmAddress?: string;
};

export function getStoredIdentity(): UserIdentity {
  if (typeof window === "undefined") return {};
  let nimiqAddress: string | undefined;
  let evmAddress: string | undefined;
  try {
    const wallet = JSON.parse(localStorage.getItem("triply-wallet") ?? "null");
    if (wallet && typeof wallet === "object") {
      nimiqAddress = normalizeNimiqAddress(wallet.nimiqAddress);
      evmAddress = wallet.evmAddress;
    }
  } catch {
    // ignore
  }
  return { nimiqAddress, evmAddress };
}

/** The user key is the Nimiq address — nothing else. */
export function identityKey(): string {
  return getStoredIdentity().nimiqAddress ?? "";
}