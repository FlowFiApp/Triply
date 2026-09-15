import { incrementMomentShare } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await incrementMomentShare(id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Share failed" },
      { status: 502 },
    );
  }
}