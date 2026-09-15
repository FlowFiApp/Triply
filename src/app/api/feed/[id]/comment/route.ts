import { addMomentComment } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const key = String(body.key ?? "");
    const text = String(body.text ?? "").trim();
    if (!key) return Response.json({ error: "Missing identity." }, { status: 400 });
    if (!text || text.length > 200) {
      return Response.json({ error: "Comment must be 1-200 characters." }, { status: 400 });
    }
    const comment = await addMomentComment(id, { userKey: key, text });
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
      { error: err instanceof Error ? err.message : "Comment failed" },
      { status: 502 },
    );
  }
}