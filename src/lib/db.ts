import "server-only";

import { MongoClient, ObjectId, type Db } from "mongodb";

const URI = process.env.MONGODB_URI;

let client: MongoClient | null = null;
let indexesEnsured = false;

/**
 * Collection relationships:
 *   users.key  ←  rewards.userId        (point ledger belongs to a user)
 *   users.key  ←  moments.userId        (feed posts belong to a user)
 *   users.key  ←  moments.comments[].userKey  (comments belong to a user)
 *   users.key  ←  moments.likes[]       (likes are user keys)
 * Indexes enforce uniqueness (users.key, rewards.bookingRef) and speed the
 * lookups used by the feed join and points queries.
 */
async function ensureIndexes(db: Db): Promise<void> {
  if (indexesEnsured) return;
  await Promise.all([
    db.collection("users").createIndex({ key: 1 }, { unique: true }),
    db.collection("rewards").createIndex({ bookingRef: 1 }, { unique: true }),
    db.collection("rewards").createIndex({ userId: 1 }),
    db.collection("moments").createIndex({ userId: 1 }),
    db.collection("moments").createIndex({ createdAt: -1 }),
    db.collection("moments").createIndex({ likes: 1 }),
    db.collection("passengers").createIndex({ key: 1 }, { unique: true }),
  ]);
  indexesEnsured = true;
}

async function getDb() {
  if (!URI) throw new Error("MONGODB_URI is not configured");
  if (!client) {
    client = new MongoClient(URI, { serverSelectionTimeoutMS: 8000 });
  }
  await client.connect();
  const db = client.db("triply");
  await ensureIndexes(db);
  return db;
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
  onboarded?: boolean;
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
    ? {
        username: user.username ?? "",
        avatar: user.avatar ?? "",
        onboarded: Boolean(user.onboarded),
      }
    : { username: "", avatar: "", onboarded: false };
}

export async function updateProfile(
  key: string,
  patch: { username?: string; avatar?: string; onboarded?: boolean },
): Promise<{ username: string; avatar: string; onboarded: boolean }> {
  await ensureUserByKey(key);
  const db = await getDb();
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.username !== undefined) set.username = patch.username;
  if (patch.avatar !== undefined) set.avatar = patch.avatar;
  if (patch.onboarded !== undefined) set.onboarded = patch.onboarded;
  await db.collection<UserDoc>("users").updateOne({ key }, { $set: set });
  return getUserProfile(key);
}

// ---- Saved passengers ----------------------------------------------------

export type SavedPassenger = {
  id: string;
  first: string;
  last: string;
  dob: string;
  gender: string;
  email: string;
  phone: string;
  dialCode?: string;
  passport?: string;
  createdAt: Date;
};

export type PassengerDoc = {
  key: string; // users.key relationship
  passengers: SavedPassenger[];
  updatedAt: Date;
};

export async function listPassengers(key: string): Promise<SavedPassenger[]> {
  const db = await getDb();
  const doc = await db.collection<PassengerDoc>("passengers").findOne({ key });
  return doc?.passengers ?? [];
}

export async function addPassenger(
  key: string,
  input: Omit<SavedPassenger, "id" | "createdAt">,
): Promise<SavedPassenger> {
  await ensureUserByKey(key);
  const db = await getDb();
  const passenger: SavedPassenger = {
    ...input,
    id: new ObjectId().toHexString(),
    createdAt: new Date(),
  };
  await db.collection<PassengerDoc>("passengers").updateOne(
    { key },
    {
      $push: { passengers: passenger },
      $set: { updatedAt: new Date() },
      $setOnInsert: { key },
    },
    { upsert: true },
  );
  return passenger;
}

export async function updatePassenger(
  key: string,
  id: string,
  patch: Partial<Omit<SavedPassenger, "id" | "createdAt">>,
): Promise<void> {
  const db = await getDb();
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    set[`passengers.$.${k}`] = v;
  }
  await db
    .collection<PassengerDoc>("passengers")
    .updateOne({ key, "passengers.id": id }, { $set: set });
}

export async function deletePassenger(key: string, id: string): Promise<void> {
  const db = await getDb();
  await db
    .collection<PassengerDoc>("passengers")
    .updateOne({ key }, { $pull: { passengers: { id } }, $set: { updatedAt: new Date() } });
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
  userId: string; // identity key (nimiqAddress or deviceId) → users.key
  authorName?: string;
  authorAvatar?: string;
  caption: string;
  location?: string;
  images: string[]; // Cloudinary URLs (1-2)
  likes: string[]; // identity keys → users.key
  comments: MomentComment[]; // comments[].userKey → users.key
  shareCount: number;
  createdAt: Date;
  author?: Array<{ username?: string; avatar?: string }>; // joined from users ($lookup)
};

export async function listMoments(limit = 50): Promise<MomentDoc[]> {
  const db = await getDb();
  const rows = await db
    .collection("moments")
    .aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "key",
          as: "author",
        },
      },
    ])
    .toArray();
  return rows as unknown as MomentDoc[];
}

export async function createMoment(input: {
  userId: string;
  authorName?: string;
  authorAvatar?: string;
  caption: string;
  location?: string;
  images: string[];
}): Promise<MomentDoc> {
  const db = await getDb();
  const doc: MomentDoc = {
    _id: new ObjectId(),
    userId: input.userId,
    authorName: input.authorName,
    authorAvatar: input.authorAvatar,
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