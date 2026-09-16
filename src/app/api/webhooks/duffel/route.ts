import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.DUFFEL_WEBHOOK_SECRET;

// X-Duffel-Signature format: t=<timestamp>,v1=<hex hmac-sha256>
// signed payload = `<timestamp>.<raw body>`
function verify(raw: string, header: string): boolean {
  if (!SECRET) return true;
  const pairs = header
    .split(",")
    .map((p) => p.split("="))
    .filter((p) => p.length === 2);
  const t = pairs.find(([k]) => k === "t")?.[1];
  const v1 = pairs.find(([k]) => k === "v1")?.[1];
  if (!t || !v1) return false;
  const local = createHmac("sha256", SECRET)
    .update(`${t}.${raw}`)
    .digest("hex");
  const a = Buffer.from(local, "utf8");
  const b = Buffer.from(v1, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
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
  const refs = collectValues(event, ["booking_ref", "reference"]);
  if (refs[0]) return refs[0];
  const ids = collectValues(event, ["order_id", "booking_id"]);
  if (ids[0]) return ids[0];
  const allIds = collectValues(event, ["id"]);
  return allIds.find((id) => /^(ord|bok)_/i.test(id)) ?? "";
}

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-duffel-signature") ?? "";

  if (signature && !verify(raw, signature)) {
    console.error("duffel webhook: signature mismatch — rejecting payload");
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