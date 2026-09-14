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

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-duffel-signature") ?? "";

  if (signature && !verify(raw, signature)) {
    console.error("duffel webhook: signature mismatch — rejecting payload");
    return Response.json({ success: false }, { status: 400 });
  }

  let event: { type?: string; id?: string; idempotency_key?: string } = {};
  try {
    event = JSON.parse(raw);
  } catch {
    // non-JSON payload — ignore
  }

  const type = event?.type ?? "unknown";
  console.log(
    `duffel webhook: ${type} event=${event?.id ?? ""} idempotency=${event?.idempotency_key ?? ""}`,
  );

  return Response.json({ success: true });
}