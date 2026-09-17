/* eslint-disable @typescript-eslint/no-explicit-any */
import { listOrders } from "@/lib/duffel";
import { requireUser, unauthorized } from "@/lib/auth";
import { normalizeOrderRecord } from "@/lib/order-normalize";
import { verifyUsdtPayment } from "@/lib/payments-verify";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const orders = await listOrders();
    return Response.json({
      orders: orders.map(normalizeOrderRecord),
      live: true,
    });
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
    const txHash = String(body.txHash ?? "");

    // Server-side payment verification + replay protection: the client must
    // have actually paid USDT to the treasury, and the hash can only be used
    // for one order.
    if (txHash) {
      const treasury = process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS;
      if (!treasury) {
        return Response.json(
          { error: "Treasury address is not configured." },
          { status: 400 },
        );
      }
      let verified = false;
      try {
        verified = await verifyUsdtPayment(
          txHash,
          Number(body.amount ?? 0),
          treasury,
        );
      } catch {
        verified = false;
      }
      if (!verified) {
        return Response.json(
          { error: "Payment not verified on-chain." },
          { status: 400 },
        );
      }
      const { consumeVerifiedPayment } = await import("@/lib/db");
      const consumed = await consumeVerifiedPayment(
        txHash,
        Number(body.amount ?? 0),
        user.address,
      );
      if (!consumed) {
        return Response.json(
          { error: "This payment has already been used for an order." },
          { status: 400 },
        );
      }
    }

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
      type: body.type === "hold" ? "hold" : "instant",
      services: (Array.isArray(body.selectedServiceIds) ? body.selectedServiceIds : []).map(
        (id: string) => ({
          id,
          quantity: Number(body.serviceQuantities?.[id] ?? 1) || 1,
        }),
      ),
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
    const bookingRef = order.booking_reference ?? order.booking_ref ?? order.id;
    if (userKey && bookingRef) {
      try {
        await earnPoints({
          userKey,
          amountUsd: body.amount ?? 0,
          bookingRef,
          bookingKind: "flight",
          orderId: order.id,
        });
      } catch {
        // ledger write failure must not block the booking
      }
    }

    // Best-effort booking confirmation email to the lead passenger.
    try {
      const p0 = body.passengers?.[0];
      if (p0?.email) {
        const { sendEmail, bookingEmailHtml } = await import("@/lib/resend");
        await sendEmail({
          to: p0.email,
          subject: `Triply — flight booked (${order.booking_reference ?? order.booking_ref ?? ""})`,
          html: bookingEmailHtml({
            brand: "Triply",
            reference: order.booking_reference ?? order.booking_ref ?? "",
            title: "Flight",
            subtitle: `${order.slices?.[0]?.segments?.[0]?.origin?.iata_code ?? ""} → ${order.slices?.[0]?.segments?.[0]?.destination?.iata_code ?? ""}`,
            amount: String(order.total_amount ?? 0),
            currency: order.total_currency ?? "USD",
          }),
        });
      }
    } catch {
      // email is best-effort
    }

    return Response.json({ live: true, order: normalizeOrderRecord(order) });
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
