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
  console.error("✗ DUFFEL_ACCESS_TOKEN not found (env or .env.local).");
  process.exit(1);
}

const BASE = "https://api.duffel.com/air";
const HEADERS = {
  Accept: "application/json",
  "Duffel-Version": "v2",
  Authorization: `Bearer ${TOKEN}`,
};

async function call(label, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
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
  console.log(`\n=== ${label} → ${method} ${path} [${res.status}]`);
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

async function searchAndOffer() {
  const search = await call(
    "Search offers",
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
        passengers: [{ type: "adult" }],
        cabin_class: "economy",
        return_offers: true,
      },
    },
  );
  const offers = search.json?.data?.offers ?? search.json?.offers ?? [];
  if (!offers.length) {
    console.log("\n✗ No offers returned.");
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
      payments: [
        { type: "balance", currency: "USD", amount: total.toFixed(2) },
      ],
      ...extra,
    },
  });
  return res;
}

// --- Scenario: no services (the app's plain flight booking) ----------------
{
  const { offerId, passengerIds, total } = await searchAndOffer();
  const res = await createOrder("no services", offerId, passengerIds[0], total);
  if (res.ok) {
    console.log(
      `\n✓ No-services order SUCCEEDED (${total.toFixed(2)} USD) — bookingRef ${res.json?.data?.booking_ref}`,
    );
  } else {
    console.log("\n✗ No-services order failed:", summarizeError(res.json));
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
      console.log("\n✓ Baggage order SUCCEEDED");
    } else {
      console.log("\n✗ Baggage order failed:", summarizeError(res.json));
    }
  } else {
    console.log("\n– No baggage services available on this offer; skipping.");
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
      console.log("\n✓ Seat order (top-level services) SUCCEEDED");
    } else {
      console.log(
        "\n✗ Seat order (top-level) failed:",
        summarizeError(top.json),
      );
    }
  } else {
    console.log("\n– No seat services available on this offer; skipping.");
  }
}

console.log("\nDone.");