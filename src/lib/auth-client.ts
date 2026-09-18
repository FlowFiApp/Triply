"use client";

import { authMessage } from "@/lib/auth-message";

export type Session = { authenticated: boolean; address: string | null };

export type NimiqSigner = (
  message: string,
) => Promise<{ publicKey: string; signature: string }>;

// Persisted locally so the app can auto-reconnect: the address + JWT survive
// reloads even when the session cookie is cleared (common in embedded webviews).
const SESSION_KEY = "triply-session";
const JWT_KEY = "triply-auth-jwt";

let cachedSession: Session | null = null;
let inflight: Promise<Session> | null = null;

function readLocalSession(): Session {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return { authenticated: false, address: null };
    const parsed = JSON.parse(raw) as { address?: string };
    if (parsed.address) return { authenticated: true, address: parsed.address };
  } catch {}
  return { authenticated: false, address: null };
}

function writeLocalSession(address: string | null, token?: string | null) {
  try {
    if (address) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ address }));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
    if (token) {
      localStorage.setItem(JWT_KEY, token);
    } else {
      localStorage.removeItem(JWT_KEY);
    }
  } catch {}
}

export function getStoredSession(): Session {
  if (cachedSession) return cachedSession;
  return readLocalSession();
}

/** The JWT persisted for auto-reconnect, or "" when none. */
export function getStoredToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(JWT_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Auto-reconnect helper: if a JWT is stored locally, re-establish the session
 * cookie from it (no signature prompt), then verify the session against the
 * server. Invalid/expired JWTs are cleared so we never hold a fake session.
 * Safe to call on app load.
 */
export async function restoreStoredSession(): Promise<Session> {
  const token = getStoredToken();
  if (token) {
    try {
      const res = await fetch("/api/auth/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
      });
      if (!res.ok) {
        // The stored JWT is invalid or expired — drop the local session so we
        // stop pretending we're signed in (profile/points would just 401).
        cachedSession = { authenticated: false, address: null };
        writeLocalSession(null, null);
        return cachedSession;
      }
    } catch {
      // Network hiccup — keep the stored session; the server check below
      // still applies (and falls back to it if the check itself fails).
    }
  }
  return getSession(true);
}

export async function getSession(force = false): Promise<Session> {
  if (!force && cachedSession) return cachedSession;
  if (inflight) return inflight;
  inflight = fetch("/api/auth/session", { cache: "no-store" })
    .then((r) => r.json())
    .then((d) => {
      const s: Session = {
        authenticated: Boolean(d.authenticated),
        address: d.address ?? null,
      };
      cachedSession = s;
      if (s.authenticated && s.address) writeLocalSession(s.address);
      return s;
    })
    .catch(() => {
      const fallback = readLocalSession();
      cachedSession = fallback;
      return fallback;
    })
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
    const data = (await res.json()) as { ok?: boolean; token?: string };
    const ok = res.ok && Boolean(data.ok);
    cachedSession = ok
      ? { authenticated: true, address }
      : { authenticated: false, address: null };
    writeLocalSession(ok ? address : null, ok ? data.token : null);
    return ok;
  } catch {
    cachedSession = { authenticated: false, address: null };
    writeLocalSession(null, null);
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
  writeLocalSession(null, null);
}
