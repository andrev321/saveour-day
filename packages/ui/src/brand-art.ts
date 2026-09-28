import wordmarks from "./brand-wordmarks.json";

// Two paper elements: a folded back sheet (two faces) and a front flap.
export const brandArt = {
  backTop: "M28 13 Q28 8 33 10 L100 33 Q105 35 100 38 L57 60 L28 45 Z",
  backSide:
    "M66 63 L107 43 Q112 41 112 47 L112 99 Q112 104 107 102 L75 90 L75 73 Q75 69 71 67 Z",
  front:
    "M12 43 Q8 41 8 47 L8 88 Q8 93 13 95 L63 113 Q68 115 68 109 L68 76 Q68 71 63 68 Z",
} as const;
export const brandPalette = {
  light: { ink: "#242B59", back: "#3D518B", side: "#304176", front: "#24485C" },
  dark: { ink: "#F5F3FF", back: "#B2C0FF", side: "#8E9FE5", front: "#90CDDA" },
} as const;
export const brandWordmarks = wordmarks;
export const brandWidths = {
  full: Math.ceil(140 + wordmarks.full.width + 8),
  short: Math.ceil(140 + wordmarks.short.width + 8),
  mark: 120,
};
export const brandMotion = `
@keyframes sod-back-in { from { transform: translate(10px, -9px); opacity: 0; } to { transform: translate(0, 0); opacity: 1; } }
@keyframes sod-front-in { from { transform: translate(-10px, 9px); opacity: 0; } to { transform: translate(0, 0); opacity: 1; } }
.sod-animated .sod-back { animation: sod-back-in 800ms cubic-bezier(.22,1,.36,1) both; }
.sod-animated .sod-front { animation: sod-front-in 800ms cubic-bezier(.22,1,.36,1) 100ms both; }
@media (prefers-reduced-motion: reduce) {
  .sod-animated .sod-back, .sod-animated .sod-front { animation: none; }
}`;
