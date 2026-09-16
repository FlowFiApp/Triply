export type ConfigStatus = { key: string; label: string; ok: boolean; required: boolean };

// Server-side env (never exposed to the client).
export function serverConfig(): ConfigStatus[] {
  const list: ConfigStatus[] = [
    { key: "DUFFEL_ACCESS_TOKEN", label: "Duffel API token", ok: Boolean(process.env.DUFFEL_ACCESS_TOKEN), required: true },
    { key: "NEXT_PUBLIC_TREASURY_WALLET_ADDRESS", label: "USDT treasury address", ok: Boolean(process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS), required: true },
  ];
  if (process.env.DUFFEL_CARD_ID) {
    list.push({ key: "DUFFEL_CARD_ID", label: "Agency card", ok: true, required: false });
  } else {
    list.push({ key: "DUFFEL_CARD_ID", label: "Agency card (falls back to Duffel Balance)", ok: false, required: false });
  }
  list.push(
    { key: "MONGODB_URI", label: "MongoDB (points ledger)", ok: Boolean(process.env.MONGODB_URI), required: false },
    { key: "DUFFEL_WEBHOOK_SECRET", label: "Webhook secret", ok: Boolean(process.env.DUFFEL_WEBHOOK_SECRET), required: false },
    { key: "NIMIQ_REWARD_MNEMONIC", label: "NIM reward mnemonic", ok: Boolean(process.env.NIMIQ_REWARD_MNEMONIC), required: false },
    { key: "NIMIQ_RPC_URL", label: "Nimiq RPC", ok: Boolean(process.env.NIMIQ_RPC_URL), required: false },
    { key: "CLOUDINARY_CLOUD_NAME", label: "Cloudinary (feed images)", ok: Boolean(process.env.CLOUDINARY_CLOUD_NAME), required: false },
    { key: "CLOUDINARY_API_KEY", label: "Cloudinary API key", ok: Boolean(process.env.CLOUDINARY_API_KEY), required: false },
    { key: "CLOUDINARY_API_SECRET", label: "Cloudinary API secret", ok: Boolean(process.env.CLOUDINARY_API_SECRET), required: false },
  );
  return list;
}

export function serverReady() {
  const required = serverConfig().filter((c) => c.required);
  return required.every((c) => c.ok);
}

export function paymentsReady() {
  return Boolean(
    process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS &&
      process.env.DUFFEL_ACCESS_TOKEN,
  );
}

// Client-side env.
export function clientConfig(): ConfigStatus[] {
  return [
    { key: "NEXT_PUBLIC_TREASURY_WALLET_ADDRESS", label: "USDT treasury address", ok: Boolean(process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS), required: true },
  ];
}

export function treasuryAddress(): string {
  const addr = process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS;
  if (!addr) throw new Error("NEXT_PUBLIC_TREASURY_WALLET_ADDRESS is not set");
  return addr;
}