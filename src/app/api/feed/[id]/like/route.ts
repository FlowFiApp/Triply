import { toggleMomentLike } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const key = String(body.key ?? "");
    if (!key) return Response.json({ error: "Missing identity." }, { status: 400 });
    const liked = await toggleMomentLike(id, key);
    return Response.json({ ok: true, liked });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Like failed" },
      { status: 502 },
    );
  }
}