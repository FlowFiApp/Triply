import { cloudinary } from "@/lib/cloudinary";
import { requireUser, unauthorized } from "@/lib/auth";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB data URL

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const dataUri = String(body.image ?? "");

    if (!dataUri.startsWith("data:image/")) {
      return Response.json({ error: "Invalid image data." }, { status: 400 });
    }
    // Rough size guard: base64 ≈ 4/3 × raw bytes.
    const approxBytes = Math.round((dataUri.length - dataUri.indexOf(",") - 1) * 0.75);
    if (approxBytes > MAX_BYTES) {
      return Response.json({ error: "Image is too large." }, { status: 413 });
    }

    const result = await cloudinary().uploader.upload(dataUri, {
      folder: "triply/moments",
      transformation: [
        { width: 1280, crop: "limit", quality: "auto:good" },
        { fetch_format: "auto" },
      ],
    });
    return Response.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    if (/Cloudinary/.test(message)) {
      return Response.json(
        { error: "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET." },
        { status: 503 },
      );
    }
    return Response.json({ error: message }, { status: 502 });
  }
}