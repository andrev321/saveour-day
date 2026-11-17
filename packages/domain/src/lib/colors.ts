/** Relative luminance and contrast for opaque sRGB HEX colors. */
export function colorLuminance(color: string) {
  const [red, green, blue] = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
export function contrastRatio(first: string, second: string) {
  const a = colorLuminance(first),
    b = colorLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export function isDarkColor(color: string) {
  return colorLuminance(color) < 0.179;
}
export function textOnColor(background: string) {
  return isDarkColor(background) ? "#ffffff" : "#111111";
}
