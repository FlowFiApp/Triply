import { dbErrorMessage, deleteMoment } from "@/lib/db";
import { destroyCloudinaryUrl } from "@/lib/cloudinary";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const key = new URL(request.url).searchParams.get("key") ?? "";
    if (!key) return Response.json({ error: "Missing identity." }, { status: 400 });

    const result = await deleteMoment(id, key);
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