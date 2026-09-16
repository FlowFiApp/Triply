/* eslint-disable @typescript-eslint/no-explicit-any */
import { listOrders } from "@/lib/duffel";
import { formatAMPM, formatDuration } from "@/lib/format";
import { testPrice } from "@/lib/pricing";
import type { OrderRecord } from "@/lib/types";
import { requireUser, unauthorized } from "@/lib/auth";

function orderStatus(o: any): string {
  if (o.cancelled_at || o.cancellation) return "cancelled";
  if (o.payment_status?.awaiting_payment === true) return "awaiting_payment";
  return "confirmed";
}

function normalizeOrder(o: any): OrderRecord {
  const seg = o.slices?.[0]?.segments?.[0] ?? {};
  const p = o.passengers?.[0] ?? {};
  const dep = seg.origin ?? {};
  const arr = seg.destination ?? {};
  const slice = o.slices?.[0] ?? {};
  return {
    id: o.id,
    bookingRef: o.booking_reference ?? o.booking_ref ?? "",
    airline: seg.marketing_carrier?.name ?? "",
    airlineCode: seg.marketing_carrier?.iata_code ?? "",
    airlineLogo:
      seg.marketing_carrier?.logo_symbol_url ??
      seg.marketing_carrier?.logo_lockup_url ??
      undefined,
    flightNumber: seg.marketing_carrier_flight_number ?? "",
    cabin: p.cabin_class_marketing ?? "Economy",
    status: orderStatus(o),
    passengerName: `${p.given_name ?? ""} ${p.family_name ?? ""}`.trim(),
    depTime: formatAMPM(seg.departing_at),
    arrTime: formatAMPM(seg.arriving_at),
    depCode: dep.iata_code ?? "",
    depCity: dep.city_name ?? "",
    depAirport: dep.name ?? undefined,
    arrCode: arr.iata_code ?? "",
    arrCity: arr.city_name ?? "",
    arrAirport: arr.name ?? undefined,
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
    const allPassengers: any[] = Array.isArray(body.passengers) ? body.passengers : [];
    const p = allPassengers[0];

    // Create a separate customer user for every passenger with an email —
    // Duffel rejects duplicate user ids across passengers. Passengers who
    // share an email resolve to the same customer user, so only the first
    // keeps the link and later duplicates get no user_id.
    const usedUserIds = new Set<string>();
    const userIds = (
      await Promise.all(
        allPassengers.map(async (pg: any) => {
          if (!pg?.email) return undefined;
          try {
            return await ensureCustomerUser({
              email: pg.email,
              given_name: pg.given_name ?? "",
              family_name: pg.family_name ?? "",
              phone_number: pg.phone_number,
            });
          } catch {
            return undefined;
          }
        }),
      )
    ).map((id) => {
      if (!id) return undefined;
      if (usedUserIds.has(id)) return undefined;
      usedUserIds.add(id);
      return id;
    });
    const customerUserId = userIds.find(Boolean) as string | undefined;

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
      passengers: allPassengers,
      amount: body.amount ?? 885,
      currency: body.currency ?? "USD",
      txHash: body.txHash,
      chain: body.chain,
      userIds,
      services: Array.isArray(body.selectedServiceIds) ? body.selectedServiceIds : [],
      passengerIds: Array.isArray(body.passengerIds) ? body.passengerIds : [],
    });
    console.log("POST /api/orders created", {
      offerId: body.offerId,
      passengers: body.passengers?.length,
      passengerIds: (Array.isArray(body.passengerIds) ? body.passengerIds : []).length,
      services: Array.isArray(body.selectedServiceIds) ? body.selectedServiceIds : [],
      bookingRef: order?.booking_ref,
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
    const e = err as {
      message?: string;
      errors?: Array<{ title?: string; detail?: string; source?: unknown }>;
      status?: number;
      meta?: unknown;
    };
    console.error("POST /api/orders failed", {
      message: e?.message,
      status: e?.status,
      errors: e?.errors,
      meta: e?.meta,
    });
    return Response.json(
      { error: e?.message || "order failed" },
      { status: 500 },
    );
  }
}
