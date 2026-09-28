"""Optional typography rebuild: pip install fonttools brotli; python scripts/outline-brand.py.

The committed outlines let the normal Node asset build run without Python.
"""
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

root = Path(__file__).resolve().parent.parent
font = TTFont(root / "node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2")
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
scale = 64 / font["head"].unitsPerEm
outlines = {}
for variant, text in [("full", "saveour.day"), ("short", "saveour")]:
    pen = SVGPathPen(glyphs, ntos=lambda value: f"{value:.2f}".rstrip("0").rstrip("."))
    cursor = 0
    for char in text:
        glyph = glyphs[cmap[ord(char)]]
        glyph.draw(TransformPen(pen, (scale, 0, 0, -scale, cursor, 82)))
        cursor += glyph.width * scale - 1.6
    outlines[variant] = {"path": pen.getCommands(), "width": round(cursor + 1.6, 2)}
(root / "packages/ui/src/brand-wordmarks.json").write_text(json.dumps(outlines, indent=2) + "\n", encoding="utf-8")
