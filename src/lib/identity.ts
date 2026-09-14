"use client";

export type UserIdentity = {
  nimiqAddress?: string;
  evmAddress?: string;
  deviceId?: string;
};

export function getStoredIdentity(): UserIdentity {
  if (typeof window === "undefined") return {};
  let nimiqAddress: string | undefined;
  let evmAddress: string | undefined;
  try {
    const wallet = JSON.parse(localStorage.getItem("triply-wallet") ?? "null");
    if (wallet && typeof wallet === "object") {
      nimiqAddress = wallet.nimiqAddress;
      evmAddress = wallet.evmAddress;
    }
  } catch {
    // ignore
  }
  return { nimiqAddress, evmAddress, deviceId: ensureDeviceId() };
}

export function ensureDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("triply-device");
  if (!id) {
    id =
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev-${Math.random().toString(36).slice(2)}`) as string;
    localStorage.setItem("triply-device", id);
  }
  return id;
}

export function identityKey(): string {
  const id = getStoredIdentity();
  return id.nimiqAddress ?? id.deviceId ?? "anonymous";
}