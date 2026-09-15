"use client";

import { normalizeNimiqAddress } from "@/lib/nimiq";

export type UserIdentity = {
  nimiqAddress?: string;
  evmAddress?: string;
  deviceId?: string;
};

// Server-issued anonymous id (httpOnly cookie), cached in memory for the tab.
let cachedDeviceId = "";
let identityPromise: Promise<string> | null = null;

export function setDeviceId(id: string) {
  cachedDeviceId = id;
}

export function getDeviceId(): string {
  return cachedDeviceId;
}

/** Fetches (once) the server-issued anonymous id. */
export function loadDeviceId(): Promise<string> {
  if (cachedDeviceId) return Promise.resolve(cachedDeviceId);
  if (identityPromise) return identityPromise;
  identityPromise = fetch("/api/identity")
    .then((r) => r.json())
    .then((d) => {
      cachedDeviceId = String(d.deviceId ?? "");
      return cachedDeviceId;
    })
    .catch(() => {
      identityPromise = null;
      return "";
    });
  return identityPromise;
}

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
  return { nimiqAddress, evmAddress, deviceId: cachedDeviceId };
}

export function identityKey(): string {
  const id = getStoredIdentity();
  return id.nimiqAddress ?? id.deviceId ?? "anonymous";
}
