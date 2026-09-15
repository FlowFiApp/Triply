"use client";

/**
 * Compresses a user-selected image client-side before upload:
 * downscales to maxDim on the longest side and re-encodes as JPEG.
 * Returns a data URL ready for the upload API.
 */
export async function compressImage(
  file: File,
  maxDim = 1280,
  quality = 0.8,
): Promise<string> {
  let source: ImageBitmap | HTMLImageElement;
  let width: number;
  let height: number;

  if (typeof createImageBitmap === "function") {
    source = await createImageBitmap(file);
    width = source.width;
    height = source.height;
  } else {
    source = await loadImageElement(file);
    width = source.naturalWidth;
    height = source.naturalHeight;
  }

  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  ctx.drawImage(source, 0, 0, w, h);
  if ("close" in source && typeof source.close === "function") source.close();

  return canvas.toDataURL("image/jpeg", quality);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}