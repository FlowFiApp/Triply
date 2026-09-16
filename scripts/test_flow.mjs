#!/usr/bin/env node
/**
 * Debug script for the Duffel flight booking flow.
 * Mirrors src/lib/duffel.ts (searchFlights → getFlightOffer → createFlightOrder)
 * using raw API calls so it can run standalone and print FULL error bodies.
 *
 * Usage:
 *   node scripts/test_flow.mjs [origin] [destination] [date]
 *
 * Reads DUFFEL_ACCESS_TOKEN from the environment or .env.local.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

const [origin = "LAX", destination = "LHR", date = "2026-10-24"] =
  process.argv.slice(2);

// --- env ----------------------------------------------------------------
const env = { ...process.env };
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const TOKEN = env.DUFFEL_ACCESS_TOKEN;
if (!TOKEN) {
  console.error("DUFFEL_ACCESS_TOKEN not found (env or .env.local).");
  process.exit(1);
}

const BASE = "https://api.duffel.com/air";
const HEADERS = {
  Accept: "application/json",
  "Duffel-Version": "v2",
  Authorization: `Bearer ${TOKEN}`,
};

async function call(label, method, path, body) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: { ...HEADERS, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  console.log(`\n=== ${label} -> ${method} ${path} [${res.status}]`);
  if (res.ok) {
    console.log("OK:", JSON.stringify(json, null, 2).slice(0, 1600));
  } else {
    console.log("ERROR BODY:", JSON.stringify(json, null, 2));
  }
  return { ok: res.ok, json };
}

function summarizeError(json) {
  if (!json) return "no body";
  if (typeof json === "string") return json;
  const errs = json.errors ?? [];
  if (errs.length) {
    return errs
      .map(
        (e) =>
          `${e.title ?? ""}${e.message ? ` (${e.message})` : ""}${
            e.source ? ` @ ${JSON.stringify(e.source)}` : ""
          }`,
      )
      .join(" | ");
  }
  return json.error ?? JSON.stringify(json).slice(0, 500);
}

function paxFor(offerId) {
  return {
    id: offerId, // replaced by real offer passenger id below
    given_name: "Jane",
    family_name: "Doe",
    born_on: "1990-01-01",
    gender: "f",
    title: "ms",
    email: "jane.doe@example.com",
    phone_number: "+2348012345678",
  };
}

async function searchAndOffer(passengerCount = 1) {
  const search = await call(
    `Search offers (${passengerCount} pax)`,
    "POST",
    "/offer_requests",
    {
      data: {
        slices: [
          {
            origin,
            destination,
            departure_date: date,
            departure_time: null,
            arrival_time: null,
          },
        ],
        passengers: Array.from({ length: passengerCount }, () => ({ type: "adult" })),
        cabin_class: "economy",
        return_offers: true,
      },
    },
  );
  const offers = search.json?.data?.offers ?? search.json?.offers ?? [];
  if (!offers.length) {
    console.log("\nNo offers returned.");
    process.exit(1);
  }
  const offerId = offers[0].id;
  const offer = await call(
    "Get offer with services",
    "GET",
    `/offers/${offerId}?return_available_services=true`,
  );
  const passengerIds = (offer.json?.data?.passengers ?? [])
    .map((p) => p.id)
    .filter(Boolean);
  return { offerId, offer, passengerIds, total: Number(offers[0].total_amount ?? 0) };
}

async function createOrder(label, offerId, passengerId, total, extra = {}) {
  const pax = paxFor(offerId);
  pax.id = passengerId;
  const res = await call(`Create order (${label})`, "POST", "/orders", {
    data: {
      type: "instant",
      selected_offers: [offerId],
      passengers: [pax],
      payments: [{ type: "balance", currency: "USD", amount: total.toFixed(2) }],
      ...extra,
    },
  });
  return res;
}

// --- Scenario: app-like payload (2 adults, customer user, metadata) ---------
{
  const { offerId, passengerIds, total } = await searchAndOffer(2);
  const offer2 = await call(
    "Get offer (2 adults)",
    "GET",
    `/offers/${offerId}?return_available_services=true`,
  );
  const ids2 = (offer2.json?.data?.passengers ?? []).map((p) => p.id).filter(Boolean);
  console.log("\nOffer passenger ids (2 adults):", ids2);

  // Create a separate customer user per passenger (mirrors the app).
  const makeUser = async (email, given, family) => {
    const existing = await call(
      `List customer user (${email})`,
      "GET",
      `https://api.duffel.com/identity/customer/users?email=${encodeURIComponent(email)}`,
    );
    if (existing.ok && existing.json?.data?.length) {
      return existing.json.data[0].id;
    }
    const cu = await call(
      `Create customer user (${email})`,
      "POST",
      "https://api.duffel.com/identity/customer/users",
      {
        data: {
          email,
          given_name: given,
          family_name: family,
          phone_number: "+2348012345678",
        },
      },
    );
    return cu.ok ? cu.json?.data?.id : undefined;
  };
  const user1 = await makeUser("jane.doe@example.com", "Jane", "Doe");
  const user2 = await makeUser("jane.doe@example.com", "John", "Smith");
  console.log("Customer user ids (same email):", user1, user2);

  const pax1 = {
    id: ids2[0],
    ...(user1 ? { user_id: user1 } : {}),
    given_name: "Jane",
    family_name: "Doe",
    born_on: "1990-01-01",
    gender: "f",
    title: "mr",
    email: "jane.doe@example.com",
    phone_number: "+2348012345678",
  };
  const pax2 = {
    id: ids2[1],
    // Same email → same user id → the app only links the FIRST passenger.
    ...(user2 && user2 !== user1 ? { user_id: user2 } : {}),
    given_name: "John",
    family_name: "Smith",
    born_on: "1985-05-10",
    gender: "m",
    title: "mr",
    email: "jane.doe@example.com",
    phone_number: "+2348012345678",
  };
  const appLike = await call(
    "Create order (app-like payload)",
    "POST",
    "/orders",
    {
      data: {
        type: "instant",
        selected_offers: [offerId],
        passengers: [pax1, pax2],
        payments: [
          {
            type: "balance",
            currency: "USD",
            amount: (Math.round(total * 100) / 100).toFixed(2),
          },
        ],
        metadata: { onchain_payment_tx: "0xabc123", chain: "polygon" },
      },
    },
  );
  if (appLike.ok) {
    console.log(
      `\nApp-like order (2 adults, distinct user ids) SUCCEEDED - bookingRef ${appLike.json?.data?.booking_reference}`,
    );
  } else {
    console.log("\nApp-like order failed:", summarizeError(appLike.json));
  }
}

// --- Scenario: order change request -----------------------------------------
{
  const { offerId, passengerIds, total } = await searchAndOffer();
  const res = await createOrder("for change", offerId, passengerIds[0], total);
  if (res.ok) {
    const orderId = res.json?.data?.id;
    console.log("\nOrder available_actions:", res.json?.data?.available_actions);
    const change = await call(
      "Create order change request",
      "POST",
      "/order_change_requests",
      {
        data: {
          order_id: orderId,
          slices: {
            add: [
              {
                origin,
                destination,
                departure_date: "2026-10-25",
                departure_time: null,
                arrival_time: null,
              },
            ],
          },
        },
      },
    );
    if (change.ok) {
      console.log("\nOrder change request SUCCEEDED:", change.json?.data?.id);
      const offers = await call(
        "List order change offers",
        "GET",
        "/order_change_offers?limit=50",
      );
      if (offers.ok) {
        const relevant = (offers.json?.data ?? []).filter(
          (o) => o.order_change_request_id === change.json?.data?.id,
        );
        console.log("\nRelevant change offers:", relevant.length);
      }
    } else {
      console.log("\nOrder change request failed:", summarizeError(change.json));
    }
  }
}

// --- Scenario: order detail + available services + update metadata ----------
{
  const { offerId, passengerIds, total } = await searchAndOffer();
  const res = await createOrder("for management", offerId, passengerIds[0], total);
  if (res.ok) {
    const orderId = res.json?.data?.id;
    if (orderId) {
      const detail = await call("Get order", "GET", `/orders/${orderId}`);
      if (detail.ok) {
        const status = detail.json?.data?.cancelled_at
          ? "cancelled"
          : detail.json?.data?.payment_status?.awaiting_payment
            ? "awaiting_payment"
            : "confirmed";
        console.log(
          `\nOrder detail loaded - status ${status} · booking_reference ${detail.json?.data?.booking_reference} · slices ${detail.json?.data?.slices?.length} · passengers ${detail.json?.data?.passengers?.length}`,
        );
      } else {
        console.log("\nGet order failed:", summarizeError(detail.json));
      }

      const avail = await call(
        "Get order available services",
        "GET",
        `/orders/${orderId}/available_services`,
      );
      if (avail.ok) {
        const list = avail.json?.data ?? [];
        console.log(`\nAvailable services: ${list.length}`);
        if (list.length) {
          const added = await call(
            "Add services to order",
            "POST",
            `/orders/${orderId}/services`,
            { data: { services: [{ id: list[0].id, quantity: 1 }] } },
          );
          if (added.ok) {
            console.log("\nAdded service to order");
          } else {
            console.log("\nAdd services failed:", summarizeError(added.json));
          }
        }
      } else {
        console.log("\nAvailable services failed:", summarizeError(avail.json));
      }

      const patched = await call(
        "Update order metadata",
        "PATCH",
        `/orders/${orderId}`,
        {
          data: {
            metadata: {
              contactEmail: "jane.doe@example.com",
              contactPhone: "+2348012345678",
            },
          },
        },
      );
      if (patched.ok) {
        console.log(
          `\nOrder metadata updated - ${JSON.stringify(patched.json?.data?.metadata)}`,
        );
      } else {
        console.log("\nUpdate order metadata failed:", summarizeError(patched.json));
      }
    }
  } else {
    console.log("\nManagement order failed:", summarizeError(res.json));
  }
}

// --- Scenario: no services + two-step cancellation --------------------------
{
  const { offerId, passengerIds, total } = await searchAndOffer();
  const res = await createOrder("no services", offerId, passengerIds[0], total);
  if (res.ok) {
    console.log(
      `\nNo-services order SUCCEEDED (${total.toFixed(2)} USD) - bookingRef ${res.json?.data?.booking_reference}`,
    );
    const orderId = res.json?.data?.id;
    if (orderId) {
      const pending = await call(
        "Create pending cancellation",
        "POST",
        "/order_cancellations",
        { data: { order_id: orderId } },
      );
      if (pending.ok) {
        const c = pending.json?.data;
        console.log(
          `\nCancellation quote: refund ${c?.refund_amount} ${c?.refund_currency} -> ${c?.refund_to}`,
        );
        const confirmed = await call(
          "Confirm cancellation",
          "POST",
          `/order_cancellations/${c?.id}/actions/confirm`,
        );
        if (confirmed.ok) {
          console.log(
            `\nCancellation confirmed - refund ${confirmed.json?.data?.refund_amount} ${confirmed.json?.data?.refund_currency}`,
          );
        } else {
          console.log(
            "\nConfirm cancellation failed:",
            summarizeError(confirmed.json),
          );
        }
      } else {
        console.log(
          "\nCreate pending cancellation failed:",
          summarizeError(pending.json),
        );
      }
    }
  } else {
    console.log("\nNo-services order failed:", summarizeError(res.json));
  }
}

// --- Scenario: with baggage / seat services (fresh offer each) -------------
{
  const { offerId, offer, passengerIds, total } = await searchAndOffer();
  const services = offer.json?.data?.available_services ?? [];
  const baggage = services.filter((s) => s.type === "baggage");
  const seats = services.filter((s) => s.type === "seat");
  console.log(
    `\nServices on this offer: ${services.length} total · ${baggage.length} baggage · ${seats.length} seats`,
  );

  if (baggage.length) {
    const bag = baggage[0];
    const svcTotal = total + Number(bag.total_amount ?? 0);
    const pax = paxFor(offerId);
    pax.id = passengerIds[0];
    const res = await call(
      `Create order (top-level baggage ${bag.id})`,
      "POST",
      "/orders",
      {
        data: {
          type: "instant",
          selected_offers: [offerId],
          services: [{ id: bag.id, quantity: 1 }],
          passengers: [pax],
          payments: [
            { type: "balance", currency: "USD", amount: svcTotal.toFixed(2) },
          ],
        },
      },
    );
    if (res.ok) {
      console.log("\nBaggage order SUCCEEDED");
    } else {
      console.log("\nBaggage order failed:", summarizeError(res.json));
    }
  } else {
    console.log("\nNo baggage services available on this offer; skipping.");
  }

  if (seats.length) {
    const seat = seats[0];
    const svcTotal = total + Number(seat.total_amount ?? 0);
    const pax = paxFor(offerId);
    pax.id = passengerIds[0];
    const top = await call(
      `Create order (top-level seat ${seat.id})`,
      "POST",
      "/orders",
      {
        data: {
          type: "instant",
          selected_offers: [offerId],
          services: [{ id: seat.id, quantity: 1 }],
          passengers: [pax],
          payments: [
            { type: "balance", currency: "USD", amount: svcTotal.toFixed(2) },
          ],
        },
      },
    );
    if (top.ok) {
      console.log("\nSeat order (top-level services) SUCCEEDED");
    } else {
      console.log("\nSeat order (top-level) failed:", summarizeError(top.json));
    }
  } else {
    console.log("\nNo seat services available on this offer; skipping.");
  }
}

console.log("\nDone.");