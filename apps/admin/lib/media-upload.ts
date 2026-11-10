import { HttpError } from "./server";
import {
  formatByteLimitError,
  isSupportedMediaMime,
  maxImageBytes,
} from "./media-limits";

export { maxImageBytes } from "./media-limits";

export async function readImage(request: Request) {
  if (!isSupportedMediaMime(request.headers.get("content-type")))
    throw new HttpError(400, "Wymagane zdjęcie JPEG, PNG lub WebP");
  if (Number(request.headers.get("content-length")) > maxImageBytes)
    throw new HttpError(413, formatByteLimitError(maxImageBytes));
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Brak zdjęcia");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxImageBytes) {
        await reader.cancel();
        throw new HttpError(413, formatByteLimitError(maxImageBytes));
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!size) throw new HttpError(400, "Brak zdjęcia");
  return Buffer.concat(chunks, size);
}
