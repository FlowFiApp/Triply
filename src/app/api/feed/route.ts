import {
  createMoment,
  dbErrorMessage,
  earnMomentPoints,
  getUserProfile,
  listMoments,
  MOMENT_POST_REWARD,
} from "@/lib/db";
import { serializeMoment, type FeedMoment } from "@/lib/feed";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  try {
    const moments = await listMoments(50);
    return Response.json({
      moments: moments.map((m) => serializeMoment(m, key)),
      live: true,
    });
  } catch (err) {
    return Response.json(
      { error: dbErrorMessage(err), moments: [], live: false },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = String(body.key ?? "");
    const caption = String(body.caption ?? "").trim();
    const location = body.location ? String(body.location).trim() : undefined;
    const images: string[] = Array.isArray(body.images)
      ? body.images.filter((u: unknown): u is string => typeof u === "string" && Boolean(u))
      : [];

    if (!userId) return Response.json({ error: "Missing identity." }, { status: 400 });
    if (images.length < 1) {
      return Response.json({ error: "Add at least one photo." }, { status: 400 });
    }
    if (images.length > 2) {
      return Response.json({ error: "Up to 2 photos allowed." }, { status: 400 });
    }
    if (caption.length > 400) {
      return Response.json({ error: "Caption is too long." }, { status: 400 });
    }

    // Snapshot the author's live profile (users → moments relationship).
    const profile = await getUserProfile(userId);
    const created = await createMoment({
      userId,
      authorName: profile.username || (body.authorName ? String(body.authorName).slice(0, 40) : undefined),
      authorAvatar: profile.avatar || (body.avatar ? String(body.avatar) : undefined),
      caption,
      location,
      images,
    });

    // Reward the poster (2 NIM), idempotent per moment.
    try {
      await earnMomentPoints({
        userKey: userId,
        idempotencyKey: `moment:${created._id.toHexString()}`,
        bookingKind: "moment",
        amountNim: MOMENT_POST_REWARD,
      });
    } catch {
      // reward failure must not block posting
    }

    const moment: FeedMoment = serializeMoment(created, userId);
    return Response.json({ moment, live: true, rewardNim: MOMENT_POST_REWARD });
  } catch (err) {
    return Response.json(
      { error: dbErrorMessage(err) },
      { status: 502 },
    );
  }
}