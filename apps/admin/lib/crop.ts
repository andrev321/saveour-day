export function cropFrame(imageRatio: number, cropRatio: number) {
  return {
    width: Math.min(100, (cropRatio / imageRatio) * 100),
    height: Math.min(100, (imageRatio / cropRatio) * 100),
  };
}

export function cropPosition(center: number, size: number) {
  if (size >= 100) return 50;
  return Math.round(
    Math.max(0, Math.min(100, ((center - size / 2) / (100 - size)) * 100)),
  );
}
