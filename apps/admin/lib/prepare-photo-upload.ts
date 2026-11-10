import {
  MEDIA_POLICY,
  computeInitialDownscale,
  isSupportedMediaMime,
  maxImageBytes,
  maxPhotoFileBytes,
} from "./media-limits";

export { maxPhotoFileBytes };

export async function preparePhotoUpload(file: File): Promise<Blob | null> {
  if (!isSupportedMediaMime(file.type)) return null;

  const bitmap = await createImageBitmap(file);
  try {
    const pixels = bitmap.width * bitmap.height;
    if (pixels <= MEDIA_POLICY.maxInputPixels && file.size <= maxImageBytes)
      return file;

    // Keep the prepared image within the server's pixel budget.
    const initialScale = computeInitialDownscale(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;

    for (const scale of MEDIA_POLICY.clientDownscaleSteps) {
      canvas.width = Math.max(
        1,
        Math.round(bitmap.width * initialScale * scale),
      );
      canvas.height = Math.max(
        1,
        Math.round(bitmap.height * initialScale * scale),
      );
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of MEDIA_POLICY.clientWebpQualities) {
        const image = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/webp", quality),
        );
        if (image?.size && image.size <= maxImageBytes) return image;
      }
    }
    return null;
  } finally {
    bitmap.close();
  }
}
