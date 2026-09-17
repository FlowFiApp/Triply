// Test pricing: divide every real-world price by NEXT_PUBLIC_TEST_PRICING
// (defaults to 1 = real money). Set to e.g. 100 to play with 1/100 prices
// during testing. Applied at every point where a raw price enters the app so
// the whole pipeline (search → details → checkout → order → points) stays
// consistent.

const RAW_DIVISOR = Number(process.env.NEXT_PUBLIC_TEST_PRICING ?? "1");
export const TEST_PRICE_DIVISOR =
  Number.isFinite(RAW_DIVISOR) && RAW_DIVISOR > 0 ? RAW_DIVISOR : 1;

const RAW_MARKUP = Number(process.env.NEXT_PUBLIC_MARKUP_PERCENT ?? "0");
export const MARKUP_PERCENT =
  Number.isFinite(RAW_MARKUP) && RAW_MARKUP > 0 ? RAW_MARKUP : 0;

export function testPrice(value: number): number {
  if (TEST_PRICE_DIVISOR === 1) return value;
  return Math.round((value / TEST_PRICE_DIVISOR) * 100) / 100;
}

// Applies the configured markup (%) on top of the displayed price. The customer
// pays this marked-up amount on-chain; the Duffel order is paid at cost.
export function applyMarkup(value: number): number {
  if (MARKUP_PERCENT <= 0) return value;
  return Math.round(value * (1 + MARKUP_PERCENT / 100) * 100) / 100;
}

// Inverse of testPrice: converts a (already divided) amount back to the real
// price. Used where Duffel itself must see the exact fare (e.g. Balance
// payments).
export function realPrice(value: number): number {
  if (TEST_PRICE_DIVISOR === 1) return value;
  return value * TEST_PRICE_DIVISOR;
}