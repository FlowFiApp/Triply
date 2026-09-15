import { dbErrorMessage, incrementMomentShare } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    await incrementMomentShare(id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: dbErrorMessage(err) },
      { status: 502 },
    );
  }
}