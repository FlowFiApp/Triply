import "server-only";

import { MongoClient } from "mongodb";

const URI = process.env.MONGODB_URI;

let client: MongoClient | null = null;

async function getDb() {
  if (!URI) throw new Error("MONGODB_URI is not configured");
  if (!client) client = new MongoClient(URI);
  await client.connect();
  return client.db("triply");
}

export type UserDoc = {
  key: string; // nimiqAddress (preferred) or deviceId fallback
  nimiqAddress?: string;
  evmAddress?: string;
  deviceId?: string;
  customerUserId?: string;
  name?: string;
  email?: string;
  points: { earned: number; available: number };
  createdAt: Date;
  updatedAt: Date;
};

export type RewardDoc = {
  userId: string;
  type: "earn" | "redeem";
  amountNim: number;
  bookingRef?: string;
  bookingKind?: string;
  orderId?: string;
  txHash?: string;
  status: "pending" | "sent" | "failed";
  createdAt: Date;
};

export async function getUser(key: string): Promise<UserDoc | null> {
  const db = await getDb();
  const doc = await db.collection<UserDoc>("users").findOne({ key });
  return doc ?? null;
}

export async function getOrCreateUser(
  identity: { nimiqAddress?: string; evmAddress?: string; deviceId?: string },
): Promise<UserDoc> {
  const db = await getDb();
  const key = identity.nimiqAddress ?? identity.deviceId ?? "anonymous";
  const now = new Date();
  const doc = await db.collection<UserDoc>("users").findOneAndUpdate(
    { key },
    {
      $setOnInsert: {
        key,
        nimiqAddress: identity.nimiqAddress,
        evmAddress: identity.evmAddress,
        deviceId: identity.deviceId,
        points: { earned: 0, available: 0 },
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  return doc ?? { key, points: { earned: 0, available: 0 }, createdAt: now, updatedAt: now };
}

export async function updateUser(
  key: string,
  patch: Partial<Pick<UserDoc, "customerUserId" | "name" | "email" | "nimiqAddress" | "evmAddress">>,
) {
  const db = await getDb();
  await db
    .collection<UserDoc>("users")
    .updateOne({ key }, { $set: { ...patch, updatedAt: new Date() } });
}

export async function earnPoints({
  userKey,
  amountUsd,
  bookingRef,
  bookingKind,
  orderId,
}: {
  userKey: string;
  amountUsd: number;
  bookingRef: string;
  bookingKind: string;
  orderId?: string;
}): Promise<number> {
  const db = await getDb();
  // 2 NIM per 1 USDT, awarded once per booking.
  const nim = Math.round(amountUsd * 2);
  const existing = await db.collection<RewardDoc>("rewards").findOne({
    type: "earn",
    bookingRef,
  });
  if (existing) return 0;

  await db.collection<RewardDoc>("rewards").insertOne({
    userId: userKey,
    type: "earn",
    amountNim: nim,
    bookingRef,
    bookingKind,
    orderId,
    status: "sent",
    createdAt: new Date(),
  });
  await db.collection<UserDoc>("users").updateOne(
    { key: userKey },
    {
      $inc: { "points.earned": nim, "points.available": nim },
      $set: { updatedAt: new Date() },
    },
  );
  return nim;
}

export async function redeemPoints({
  userKey,
  amount,
}: {
  userKey: string;
  amount: number;
}): Promise<{ ok: boolean; txHash?: string; error?: string }> {
  const db = await getDb();
  const user = await getUser(userKey);
  if (!user || user.points.available < amount) {
    return { ok: false, error: "Not enough points available." };
  }
  await db.collection<UserDoc>("users").updateOne(
    { key: userKey },
    {
      $inc: { "points.available": -amount },
      $set: { updatedAt: new Date() },
    },
  );
  const inserted = await db.collection<RewardDoc>("rewards").insertOne({
    userId: userKey,
    type: "redeem",
    amountNim: amount,
    status: "pending",
    createdAt: new Date(),
  });
  return { ok: true, txHash: inserted.insertedId.toHexString() };
}

export async function getPoints(userKey: string) {
  const user = await getUser(userKey);
  return user
    ? { earned: user.points.earned, available: user.points.available }
    : { earned: 0, available: 0 };
}