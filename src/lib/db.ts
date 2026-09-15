import "server-only";

import { MongoClient, ObjectId } from "mongodb";

const URI = process.env.MONGODB_URI;

let client: MongoClient | null = null;

async function getDb() {
  if (!URI) throw new Error("MONGODB_URI is not configured");
  if (!client) {
    client = new MongoClient(URI, { serverSelectionTimeoutMS: 8000 });
  }
  await client.connect();
  return client.db("triply");
}

/** Maps low-level driver/network failures to a friendly, actionable message. */
export function dbErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (
    /ssl|tlsv1|mongoserverselection|mongonetwork|econnrefused|enotfound|timed out|server selection/i.test(
      message,
    )
  ) {
    return "Storage is unavailable right now — check the MongoDB connection and Atlas IP allowlist.";
  }
  return message || "Database error";
}

export type UserDoc = {
  key: string; // nimiqAddress (preferred) or deviceId fallback
  nimiqAddress?: string;
  evmAddress?: string;
  deviceId?: string;
  customerUserId?: string;
  name?: string;
  email?: string;
  username?: string;
  avatar?: string;
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
  recipient?: string;
  error?: string;
  status: "pending" | "sent" | "failed";
  createdAt: Date;
  updatedAt?: Date;
};

export async function getUser(key: string): Promise<UserDoc | null> {
  const db = await getDb();
  const doc = await db.collection<UserDoc>("users").findOne({ key });
  return doc ?? null;
}

export async function getUserProfile(key: string) {
  const user = await getUser(key);
  return user
    ? { username: user.username ?? "", avatar: user.avatar ?? "" }
    : { username: "", avatar: "" };
}

export async function updateProfile(
  key: string,
  patch: { username?: string; avatar?: string },
): Promise<{ username: string; avatar: string }> {
  await ensureUserByKey(key);
  const db = await getDb();
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.username !== undefined) set.username = patch.username;
  if (patch.avatar !== undefined) set.avatar = patch.avatar;
  await db.collection<UserDoc>("users").updateOne({ key }, { $set: set });
  return getUserProfile(key);
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
}): Promise<{ ok: boolean; recordId?: string; error?: string }> {
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
  return { ok: true, recordId: inserted.insertedId.toHexString() };
}

export async function updateRewardStatus(
  recordId: string,
  patch: {
    status: "pending" | "sent" | "failed";
    txHash?: string;
    error?: string;
    recipient?: string;
  },
): Promise<void> {
  const db = await getDb();
  await db
    .collection<RewardDoc>("rewards")
    .updateOne({ _id: new ObjectId(recordId) }, { $set: { ...patch, updatedAt: new Date() } });
}

// ---- Travel feed (moments) ----------------------------------------------

export type MomentComment = {
  id: string;
  userKey: string;
  text: string;
  createdAt: Date;
};

export type MomentDoc = {
  _id: ObjectId;
  userId: string; // identity key (nimiqAddress or deviceId)
  authorName?: string;
  caption: string;
  location?: string;
  images: string[]; // Cloudinary URLs (1-2)
  likes: string[]; // identity keys
  comments: MomentComment[];
  shareCount: number;
  createdAt: Date;
};

export async function listMoments(limit = 50): Promise<MomentDoc[]> {
  const db = await getDb();
  return db
    .collection<MomentDoc>("moments")
    .find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function createMoment(input: {
  userId: string;
  authorName?: string;
  caption: string;
  location?: string;
  images: string[];
}): Promise<MomentDoc> {
  const db = await getDb();
  const doc: MomentDoc = {
    _id: new ObjectId(),
    userId: input.userId,
    authorName: input.authorName,
    caption: input.caption,
    location: input.location,
    images: input.images,
    likes: [],
    comments: [],
    shareCount: 0,
    createdAt: new Date(),
  };
  await db.collection<MomentDoc>("moments").insertOne(doc);
  return doc;
}

export async function toggleMomentLike(momentId: string, userKey: string): Promise<boolean> {
  const db = await getDb();
  const existing = await db
    .collection<MomentDoc>("moments")
    .findOne({ _id: new ObjectId(momentId) });
  if (!existing) throw new Error("Moment not found");
  const liked = (existing.likes ?? []).includes(userKey);
  if (liked) {
    await db
      .collection<MomentDoc>("moments")
      .updateOne({ _id: new ObjectId(momentId) }, { $pull: { likes: userKey } });
    return false;
  }
  await db
    .collection<MomentDoc>("moments")
    .updateOne({ _id: new ObjectId(momentId) }, { $addToSet: { likes: userKey } });
  return true;
}

export async function addMomentComment(
  momentId: string,
  input: { userKey: string; text: string },
): Promise<MomentComment> {
  const db = await getDb();
  const comment: MomentComment = {
    id: new ObjectId().toHexString(),
    userKey: input.userKey,
    text: input.text,
    createdAt: new Date(),
  };
  await db
    .collection<MomentDoc>("moments")
    .updateOne({ _id: new ObjectId(momentId) }, { $push: { comments: comment } });
  return comment;
}

export async function incrementMomentShare(momentId: string): Promise<void> {
  const db = await getDb();
  await db
    .collection<MomentDoc>("moments")
    .updateOne({ _id: new ObjectId(momentId) }, { $inc: { shareCount: 1 } });
}

/** Deletes a moment only when the requester owns it. Returns the deleted images. */
export async function deleteMoment(
  momentId: string,
  userKey: string,
): Promise<{ deleted: boolean; images: string[] }> {
  const db = await getDb();
  const doc = await db
    .collection<MomentDoc>("moments")
    .findOne({ _id: new ObjectId(momentId), userId: userKey });
  if (!doc) return { deleted: false, images: [] };
  await db.collection<MomentDoc>("moments").deleteOne({ _id: new ObjectId(momentId) });
  return { deleted: true, images: doc.images ?? [] };
}

// Feed reward amounts (NIM points).
export const MOMENT_POST_REWARD = 2;
export const MOMENT_LIKE_REWARD = 0.1;
export const MOMENT_COMMENT_REWARD = 0.1;

/**
 * Credits feed engagement points. `idempotencyKey` makes each reward unique
 * (e.g. `moment:<id>`, `like:<id>:<user>`, `comment:<id>`), so repeat actions
 * never double-credit. Returns the NIM credited (0 when already rewarded).
 */
/** Ensures a user row exists so point balances can be credited (upsert). */
export async function ensureUserByKey(key: string): Promise<void> {
  const db = await getDb();
  await db.collection<UserDoc>("users").updateOne(
    { key },
    {
      $setOnInsert: {
        key,
        points: { earned: 0, available: 0 },
        createdAt: new Date(),
      },
      $set: { updatedAt: new Date() },
    },
    { upsert: true },
  );
}

export async function earnMomentPoints({
  userKey,
  idempotencyKey,
  bookingKind,
  amountNim,
}: {
  userKey: string;
  idempotencyKey: string;
  bookingKind: string;
  amountNim: number;
}): Promise<number> {
  const db = await getDb();
  const existing = await db
    .collection<RewardDoc>("rewards")
    .findOne({ type: "earn", bookingRef: idempotencyKey });
  if (existing) return 0;

  // The poster may never have a user row yet — create it so $inc lands.
  await ensureUserByKey(userKey);

  await db.collection<RewardDoc>("rewards").insertOne({
    userId: userKey,
    type: "earn",
    amountNim,
    bookingRef: idempotencyKey,
    bookingKind,
    status: "sent",
    createdAt: new Date(),
  });
  await db.collection<UserDoc>("users").updateOne(
    { key: userKey },
    {
      $inc: { "points.earned": amountNim, "points.available": amountNim },
      $set: { updatedAt: new Date() },
    },
  );
  return amountNim;
}

export async function getPoints(userKey: string) {
  const user = await getUser(userKey);
  return user
    ? { earned: user.points.earned, available: user.points.available }
    : { earned: 0, available: 0 };
}