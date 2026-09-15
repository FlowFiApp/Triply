"use client";

import { authMessage } from "@/lib/auth-message";

export type Session = { authenticated: boolean; address: string | null };

export type NimiqSigner = (
  message: string,
) => Promise<{ publicKey: string; signature: string }>;

let cachedSession: Session | null = null;
let inflight: Promise<Session> | null = null;

export async function getSession(force = false): Promise<Session> {
  if (!force && cachedSession) return cachedSession;
  if (inflight) return inflight;
  inflight = fetch("/api/auth/session", { cache: "no-store" })
    .then((r) => r.json())
    .then(
      (d) =>
        (cachedSession = {
          authenticated: Boolean(d.authenticated),
          address: d.address ?? null,
        }),
    )
    .catch(
      () => (cachedSession = { authenticated: false, address: null }),
    )
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Signs the auth challenge and exchanges it for a JWT session cookie. */
export async function signInWithNimiq(
  address: string,
  sign: NimiqSigner,
): Promise<boolean> {
  try {
    const nonceRes = await fetch(
      `/api/auth/nonce?address=${encodeURIComponent(address)}`,
      { cache: "no-store" },
    );
    const { nonce } = (await nonceRes.json()) as { nonce?: string };
    if (!nonce) return false;

    const signed = await sign(authMessage(nonce));
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address,
        nonce,
        publicKey: signed.publicKey,
        signature: signed.signature,
      }),
    });
    const ok = res.ok && Boolean((await res.json()).ok);
    cachedSession = ok
      ? { authenticated: true, address }
      : { authenticated: false, address: null };
    return ok;
  } catch {
    cachedSession = { authenticated: false, address: null };
    return false;
  }
}

export async function signOut(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore
  }
  cachedSession = { authenticated: false, address: null };
}