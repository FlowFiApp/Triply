import { dbErrorMessage, incrementMomentShare, isValidObjectId } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return Response.json({ error: "Invalid moment id." }, { status: 400 });
  }
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