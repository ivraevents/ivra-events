/**
 * Client-side resize/re-encode so a phone photo (often several MB) doesn't
 * get uploaded as-is — shrinks anything wider/taller than `maxDimension`
 * (preserving aspect ratio, never upscaling) and re-encodes as JPEG at
 * `quality`. Runs entirely in the browser via a canvas; no server work,
 * no extra dependency. Falls back to the original file untouched if the
 * browser can't decode it as an image for any reason (better to upload
 * the original than to fail the whole upload over an optimization step).
 */
export async function compressImage(
  file: File,
  { maxDimension = 1600, quality = 0.82 }: { maxDimension?: number; quality?: number } = {}
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;

    // Only use the compressed version if it's actually smaller — a tiny
    // already-optimized source image can re-encode larger than it started.
    if (blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
