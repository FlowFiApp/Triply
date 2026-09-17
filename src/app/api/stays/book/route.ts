/* eslint-disable @typescript-eslint/no-explicit-any */
import { duffelErrorMessage } from "@/lib/duffel";
import type { StayBooking } from "@/lib/types";
import { seedPrice } from "@/lib/pricing";
import { requireUser, unauthorized } from "@/lib/auth";
import { upsertBooking, getOrCreateUser, earnPoints } from "@/lib/db";
import { verifyUsdtPayment } from "@/lib/payments-verify";
import mockData from "@/lib/data.json";

// NOTE: Stays are served from the bundled local dataset (Duffel Stays is not
// enabled on this token). Bookings require a verified on-chain USDT payment,
// are persisted to Mongo so they appear in My Trips and can be cancelled; the
// live Duffel call is kept out until access is granted.

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const email = String(body.guest?.email ?? "").toLowerCase();
    const checkIn = String(body.checkInDate ?? "2026-10-24");
    const checkOut = String(body.checkOutDate ?? "2026-11-08");

    const resultId = String(body.rateId ?? "").replace("rat_local_", "");
    const stay = (mockData.accommodations as unknown as any[]).find(
      (r: any) => r.id === resultId,
    );
    const totalAmount = seedPrice(Number(stay?.cheapest_rate_total_amount ?? 0));
    const currency = stay?.cheapest_rate_currency ?? "USD";
    const name = stay?.accommodation?.name ?? "Local Stay";
    const image = stay?.accommodation?.images?.[0]?.url ?? "";
    const address = stay?.accommodation?.address
      ? `${stay.accommodation.address?.line_one ?? ""}, ${stay.accommodation.address?.city_name ?? ""}`
      : "";

    // Require a verified on-chain USDT payment (replay-protected) before a
    // stay can be confirmed.
    const txHash = String(body.txHash ?? "");
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      return Response.json(
        { error: "Payment is required before booking a stay." },
        { status: 400 },
      );
    }
    const treasury = process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS;
    if (!treasury) {
      return Response.json(
        { error: "Treasury address is not configured." },
        { status: 400 },
      );
    }
    let verified = false;
    try {
      verified = await verifyUsdtPayment(txHash, totalAmount, treasury);
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
      totalAmount,
      user.address,
    );
    if (!consumed) {
      return Response.json(
        { error: "This payment has already been used for a booking." },
        { status: 400 },
      );
    }
    const payment = {
      txHash,
      chain: String(body.chain ?? "polygon"),
      amountUsd: totalAmount,
    };

    // Stable id so re-booking the same stay + dates under the same email
    // updates the same record and never double-earns points.
    const id = `stay:${resultId}:${checkIn}:${checkOut}:${email}`;
    const reference = `STAY-${resultId.slice(0, 6).toUpperCase()}-${checkIn.replace(/-/g, "")}`;

    try {
      await upsertBooking({
        kind: "stay",
        id,
        reference,
        email,
        status: "confirmed",
        accommodationName: name,
        checkIn,
        checkOut,
        address,
        image,
        totalAmount,
        currency,
        payment,
      });
      const created = await getOrCreateUser({ nimiqAddress: user.address });
      await earnPoints({
        userKey: created.key,
        amountUsd: totalAmount,
        bookingRef: id,
        bookingKind: "stay",
        orderId: id,
      });
      if (email) {
        const { sendEmail, bookingEmailHtml } = await import("@/lib/resend");
        await sendEmail({
          to: email,
          subject: `Triply — stay booked (${reference})`,
          html: bookingEmailHtml({
            brand: "Triply",
            reference,
            title: "Stay",
            subtitle: `${name} · ${checkIn} → ${checkOut}`,
            amount: String(totalAmount),
            currency,
          }),
        });
      }
    } catch {
      // ledger/persistence failure must not block the booking
    }

    const result: StayBooking = {
      id,
      reference,
      status: "confirmed",
      checkIn,
      checkOut,
      accommodationName: name,
      totalAmount,
      currency,
      address,
      image,
      payment,
    };
    return Response.json({ live: true, booking: result });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Booking failed") },
      { status: 502 },
    );
  }
}