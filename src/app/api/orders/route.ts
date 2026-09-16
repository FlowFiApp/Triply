/* eslint-disable @typescript-eslint/no-explicit-any */
import { listOrders } from "@/lib/duffel";
import { formatAMPM, formatDuration } from "@/lib/format";
import { testPrice } from "@/lib/pricing";
import type { OrderRecord } from "@/lib/types";
import { requireUser, unauthorized } from "@/lib/auth";

function normalizeOrder(o: any): OrderRecord {
  const seg = o.slices?.[0]?.segments?.[0] ?? {};
  const p = o.passengers?.[0] ?? {};
  const dep = seg.origin ?? {};
  const arr = seg.destination ?? {};
  const slice = o.slices?.[0] ?? {};
  return {
    id: o.id,
    bookingRef: o.booking_ref ?? "",
    airline: seg.marketing_carrier?.name ?? "",
    airlineCode: seg.marketing_carrier?.iata_code ?? "",
    flightNumber: seg.marketing_carrier_flight_number ?? "",
    cabin: p.cabin_class_marketing ?? "Economy",
    status: o.state ?? "confirmed",
    passengerName: `${p.given_name ?? ""} ${p.family_name ?? ""}`.trim(),
    depTime: formatAMPM(seg.departing_at),
    arrTime: formatAMPM(seg.arriving_at),
    depCode: dep.iata_code ?? "",
    depCity: dep.city_name ?? "",
    arrCode: arr.iata_code ?? "",
    arrCity: arr.city_name ?? "",
    duration: formatDuration(slice.duration),
    seat: p.seat ?? "—",
    gate: seg.gate ?? "—",
    terminal: seg.departing_terminal ?? "—",
    departureDate: (seg.departing_at ?? "").slice(0, 10),
    amountUsd: testPrice(Number(o.total_amount ?? 0)),
  };
}

export async function GET() {
  try {
    const orders = await listOrders();
    return Response.json({ orders: orders.map(normalizeOrder), live: true });
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : "failed",
        orders: [],
        live: false,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const { createFlightOrder, ensureCustomerUser } = await import("@/lib/duffel");
    const { getOrCreateUser, updateUser, earnPoints } = await import("@/lib/db");
    const p = body.passengers?.[0];
    const customerUserId = p?.email
      ? await ensureCustomerUser({
          email: p.email,
          given_name: p.given_name ?? "",
          family_name: p.family_name ?? "",
          phone_number: p.phone_number,
        })
      : undefined;

    const identity = {
      nimiqAddress: user.address,
      evmAddress: body.from,
    };
    let userKey: string | undefined;
    if (identity.nimiqAddress) {
      try {
        const created = await getOrCreateUser(identity);
        userKey = created.key;
        await updateUser(created.key, {
          ...(customerUserId ? { customerUserId } : {}),
          ...(p?.email ? { email: p.email } : {}),
          ...(p ? { name: `${p.given_name ?? ""} ${p.family_name ?? ""}`.trim() } : {}),
        });
      } catch {
        // points persistence is optional; booking still proceeds
      }
    }

    const order = await createFlightOrder({
      offerId: body.offerId,
      passengers: body.passengers,
      amount: body.amount ?? 885,
      currency: body.currency ?? "USD",
      txHash: body.txHash,
      chain: body.chain,
      customerUserId: customerUserId ?? undefined,
      services: Array.isArray(body.selectedServiceIds) ? body.selectedServiceIds : [],
    });
    if (!order) {
      return Response.json({
        live: false,
        error: "Duffel is not configured. Set DUFFEL_ACCESS_TOKEN to create orders.",
      });
    }

    // 2 NIM per 1 USDT, credited once per booking.
    if (userKey && order.booking_ref) {
      try {
        await earnPoints({
          userKey,
          amountUsd: body.amount ?? 0,
          bookingRef: order.booking_ref,
          bookingKind: "flight",
          orderId: order.id,
        });
      } catch {
        // ledger write failure must not block the booking
      }
    }

    return Response.json({ live: true, order: normalizeOrder(order) });
  } catch (err) {
    console.error(
      "POST /api/orders failed",
      err instanceof Error ? err.stack ?? err.message : err,
    );
    return Response.json(
      { error: err instanceof Error ? err.message : "order failed" },
      { status: 500 },
    );
  }
}
