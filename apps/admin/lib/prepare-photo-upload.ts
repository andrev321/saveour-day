import { maxImageBytes } from "./media-limits";

export const maxPhotoFileBytes = 10 * 1024 * 1024;

export async function preparePhotoUpload(file: File): Promise<Blob | null> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return null;

  const bitmap = await createImageBitmap(file);
  try {
    const pixels = bitmap.width * bitmap.height;
    if (pixels <= 20_000_000 && file.size <= maxImageBytes) return file;

    // Keep the prepared image within the server's pixel budget.
    const initialScale = Math.min(1, Math.sqrt(19_900_000 / pixels));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;

    for (const scale of [1, 0.8, 0.64, 0.5]) {
      canvas.width = Math.max(1, Math.round(bitmap.width * initialScale * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * initialScale * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.9, 0.8, 0.65]) {
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
