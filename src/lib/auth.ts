import "server-only";
import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE = "triply-auth";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const NONCE_TTL_MS = 5 * 60 * 1000;

const JWT_SECRET =
  process.env.JWT_SECRET ??
  (process.env.NODE_ENV === "production" ? "" : "triply-dev-secret-do-not-use-in-prod");

function secretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

// Short-lived, address-bound sign-in nonces (single instance, in-memory).
const nonces = new Map<string, { nonce: string; exp: number }>();

export function createNonce(address: string): string {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  nonces.set(address, { nonce, exp: Date.now() + NONCE_TTL_MS });
  return nonce;
}

export function consumeNonce(address: string, nonce: string): boolean {
  const entry = nonces.get(address);
  if (!entry) return false;
  nonces.delete(address);
  if (Date.now() > entry.exp) return false;
  return entry.nonce === nonce;
}

export async function issueToken(address: string): Promise<string> {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return new SignJWT({ addr: address })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(address)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifyToken(token: string): Promise<string | null> {
  if (!JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const addr = typeof payload.sub === "string" ? payload.sub : "";
    return addr || null;
  } catch {
    return null;
  }
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

export function readAuthToken(request: Request): string | null {
  return parseCookie(request.headers.get("cookie"), AUTH_COOKIE);
}

export type AuthUser = { address: string; key: string };

/** Returns the authenticated user derived from the JWT cookie, or null. */
export async function requireUser(request: Request): Promise<AuthUser | null> {
  const token = readAuthToken(request);
  const address = token ? await verifyToken(token) : null;
  return address ? { address, key: address } : null;
}

export function unauthorized(): Response {
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}

export function authCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${AUTH_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS};${secure}`;
}

export function clearAuthCookieHeader(): string {
  return `${AUTH_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0;`;
}
