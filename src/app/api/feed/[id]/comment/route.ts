import {
  addMomentComment,
  dbErrorMessage,
  earnMomentPoints,
  isValidObjectId,
  MOMENT_COMMENT_REWARD,
} from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(request);
  if (!user) return unauthorized();
  if (!isValidObjectId(id)) {
    return Response.json({ error: "Invalid moment id." }, { status: 400 });
  }
  try {
    const body = await request.json();
    const key = user.key;
    const text = String(body.text ?? "").trim();
    if (!text || text.length > 200) {
      return Response.json({ error: "Comment must be 1-200 characters." }, { status: 400 });
    }
    const comment = await addMomentComment(id, { userKey: key, text });

    // Reward the commenter (0.1 NIM), idempotent per comment.
    try {
      await earnMomentPoints({
        userKey: key,
        idempotencyKey: `comment:${comment.id}`,
        bookingKind: "moment-comment",
        amountNim: MOMENT_COMMENT_REWARD,
      });
    } catch {
      // reward failure must not block the comment
    }

    return Response.json({
      ok: true,
      comment: {
        id: comment.id,
        userKey: comment.userKey,
        text: comment.text,
        createdAt: comment.createdAt.toISOString(),
      },
    });
  } catch (err) {
    return Response.json(
      { error: dbErrorMessage(err) },
      { status: 502 },
    );
  }
}