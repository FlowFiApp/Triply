import { dbErrorMessage, earnMomentPoints, MOMENT_LIKE_REWARD, toggleMomentLike } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const key = String(body.key ?? "");
    if (!key) return Response.json({ error: "Missing identity." }, { status: 400 });
    const liked = await toggleMomentLike(id, key);

    // Reward the liker (0.1 NIM), idempotent per moment+user.
    if (liked) {
      try {
        await earnMomentPoints({
          userKey: key,
          idempotencyKey: `like:${id}:${key}`,
          bookingKind: "moment-like",
          amountNim: MOMENT_LIKE_REWARD,
        });
      } catch {
        // reward failure must not block the like
      }
    }

    return Response.json({ ok: true, liked });
  } catch (err) {
    return Response.json(
      { error: dbErrorMessage(err) },
      { status: 502 },
    );
  }
}