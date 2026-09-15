import "server-only";

import { v2 as cloudinaryV2 } from "cloudinary";

export function cloudinary() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET.",
    );
  }
  cloudinaryV2.config({ cloud_name, api_key, api_secret });
  return cloudinaryV2;
}

/** Best-effort removal of an uploaded asset given its delivery URL. */
export async function destroyCloudinaryUrl(url: string): Promise<void> {
  const marker = "/image/upload/";
  const index = url.indexOf(marker);
  if (index === -1) return;
  let rest = url.slice(index + marker.length).split("?")[0];
  rest = rest.replace(/^v\d+\//, "");
  const publicId = rest.replace(/\.[a-z0-9]+$/i, "");
  if (!publicId) return;
  await cloudinary().uploader.destroy(publicId);
}