import { dbErrorMessage, deleteMoment } from "@/lib/db";
import { destroyCloudinaryUrl } from "@/lib/cloudinary";
import { requireUser, unauthorized } from "@/lib/auth";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const result = await deleteMoment(id, user.key);
    if (!result.deleted) {
      return Response.json(
        { error: "You can only delete your own moment." },
        { status: 403 },
      );
    }

    // Best-effort cleanup of the Cloudinary assets; ignore failures.
    await Promise.allSettled(result.images.map((url) => destroyCloudinaryUrl(url)));

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: dbErrorMessage(err) }, { status: 502 });
  }
}