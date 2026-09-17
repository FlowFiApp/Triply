import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.DUFFEL_WEBHOOK_SECRET;

// X-Duffel-Signature format: t=<timestamp>,v1=<hex hmac-sha256>
// signed payload = `<timestamp>.<raw body>`
// The secret is only shown ONCE when the webhook is created in the Duffel
// dashboard — DUFFEL_WEBHOOK_SECRET must be that exact value.
function parseSignature(
  header: string,
): { t?: string; v1?: string } | null {
  const pairs = header
    .split(",")
    .map((p) => {
      const [k, ...rest] = p.trim().split("=");
      return [k.trim(), rest.join("=").trim()];
    })
    .filter((p) => p.length === 2 && p[0] && p[1]);
  if (!pairs.length) return null;
  // Duffel signs with `v<N>` where N matches the API version (v1, v2, …).
  const v = pairs.find(([k]) => /^v\d+$/.test(k))?.[1];
  return {
    t: pairs.find(([k]) => k === "t")?.[1],
    v1: v,
  };
}

function computeSignature(raw: string, t: string): string {
  return createHmac("sha256", SECRET as string)
    .update(`${t}.${raw}`)
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function verify(raw: string, header: string): boolean {
  if (!SECRET) return true;
  const sig = parseSignature(header);
  if (!sig?.t || !sig.v1) return false;
  return safeEqual(computeSignature(raw, sig.t), sig.v1);
}

// Events that mean a booking fell through — reverse any points already earned.
const REVERSE_EVENTS = new Set([
  "order.creation_failed",
  "air.payment.failed",
  "air.payment.cancelled",
  "order_cancellation.created",
  "order_cancellation.confirmed",
  "stays.booking_creation_failed",
  "stays.booking.cancelled",
  "cars.booking.cancelled",
]);

// Events that confirm a booking — points are credited synchronously at booking
// time, so these only act as an idempotent confirmation.
const SUCCESS_EVENTS = new Set([
  "order.created",
  "air.payment.succeeded",
  "air.payment.pending",
  "stays.booking.created",
  "cars.booking.created",
]);

/** Collects every string value for the given keys, recursively. */
function collectValues(
  obj: unknown,
  keys: string[],
  acc: string[] = [],
): string[] {
  if (Array.isArray(obj)) {
    obj.forEach((v) => collectValues(v, keys, acc));
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      if (keys.includes(k) && typeof v === "string") acc.push(v);
      if (v && typeof v === "object") collectValues(v, keys, acc);
    }
  }
  return acc;
}

/** Best-effort booking/order identifier from any webhook payload shape. */
function extractRef(event: Record<string, unknown>): string {
  const refs = collectValues(event, [
    "booking_reference",
    "booking_ref",
    "reference",
  ]);
  if (refs[0]) return refs[0];
  const ids = collectValues(event, ["order_id", "booking_id"]);
  if (ids[0]) return ids[0];
  const allIds = collectValues(event, ["id"]);
  return allIds.find((id) => /^(ord|bok)_/i.test(id)) ?? "";
}

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-duffel-signature") ?? "";

  if (!SECRET) {
    console.warn(
      "duffel webhook: DUFFEL_WEBHOOK_SECRET is not set — accepting unverified payload",
    );
  } else if (!signature) {
    console.error("duffel webhook: missing x-duffel-signature — rejecting payload");
    return Response.json({ success: false }, { status: 400 });
  } else if (!verify(raw, signature)) {
    const sig = parseSignature(signature);
    const local = sig?.t ? computeSignature(raw, sig.t) : "";
    console.error("duffel webhook: signature mismatch — rejecting payload", {
      secretSet: Boolean(SECRET),
      secretLength: SECRET?.length ?? 0,
      bodyLength: raw.length,
      headerLength: signature.length,
      rawSignature: signature,
      pairs: signature
        .split(",")
        .map((p) => p.trim().split("="))
        .map((p) => [p[0], `${(p[1] ?? "").slice(0, 8)}…`]),
      t: sig?.t,
      v1Prefix: sig?.v1?.slice(0, 8),
      localPrefix: local.slice(0, 8),
      matchLengths: sig?.v1 ? safeEqual(local, sig.v1) : undefined,
      hint: "DUFFEL_WEBHOOK_SECRET must be the secret Duffel returned when the webhook was created (shown only once). Re-create the webhook to get it, or compare a v1/local prefix mismatch.",
    });
    return Response.json({ success: false }, { status: 400 });
  }

  let event: Record<string, unknown> = {};
  try {
    event = JSON.parse(raw);
  } catch {
    // non-JSON payload — ignore
  }

  const type = typeof event?.type === "string" ? event.type : "unknown";
  const ref = extractRef(event);
  let reversed = false;

  if (REVERSE_EVENTS.has(type) && ref) {
    try {
      const { reversePoints } = await import("@/lib/db");
      reversed = await reversePoints(ref);
    } catch (err) {
      console.error(
        `duffel webhook: failed to reverse points for ${ref}`,
        err instanceof Error ? err.message : err,
      );
    }
  } else if (SUCCESS_EVENTS.has(type)) {
    // Points are credited synchronously at booking time; nothing to add here.
  }

  console.log(
    `duffel webhook: ${type} event=${String(event?.id ?? "")} ref=${ref} reversed=${reversed}`,
  );

  return Response.json({ success: true });
}