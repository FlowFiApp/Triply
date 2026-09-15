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