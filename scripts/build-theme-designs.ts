import { mkdir, copyFile, writeFile } from "node:fs/promises";
import sharp, { type OverlayOptions } from "sharp";
import {
  themes,
  themeNames,
  themePalettes,
} from "../packages/domain/src/index.ts";

// Package real renderer screenshots after running design-examples.spec.ts.
const output = "assets/theme-designs";
await mkdir(output, { recursive: true });
const escape = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const cards: string[] = [];
const layers: OverlayOptions[] = [];
for (const [index, theme] of themeNames.entries()) {
  for (const width of [1440, 390]) {
    await copyFile(
      `test-results/redesign-${theme}-${width}.png`,
      `${output}/${theme}-${width}.png`,
    );
  }
  const thumbnail = await sharp(`${output}/${theme}-1440.png`)
    .extract({ left: 0, top: 0, width: 1440, height: 960 })
    .resize(560, 373)
    .png()
    .toBuffer();
  const left = 30 + (index % 3) * 590;
  const top = 130 + Math.floor(index / 3) * 490;
  layers.push({ input: thumbnail, left, top });
  const caption = `<svg width="560" height="95"><text x="0" y="25" font-family="Arial" font-size="21" fill="#252b28">${escape(themes[theme].name)}</text>${themePalettes[
    theme
  ]
    .map((palette, p) =>
      Object.values(palette.design)
        .map(
          (color, c) =>
            `<rect x="${p * 140 + c * 30}" y="43" width="30" height="20" fill="${color}"/>`,
        )
        .join(""),
    )
    .join("")}</svg>`;
  layers.push({ input: Buffer.from(caption), left, top: top + 373 });
  cards.push(
    `<article><h2>${escape(themes[theme].name)}</h2><p>${escape(themes[theme].description.pl)}</p><div class="screens"><a href="${theme}-1440.png"><img src="${theme}-1440.png" alt="${escape(themes[theme].name)} — komputer"></a><a href="${theme}-390.png"><img src="${theme}-390.png" alt="${escape(themes[theme].name)} — telefon"></a></div><div class="palettes">${themePalettes[
      theme
    ]
      .map(
        (palette) =>
          `<div class="palette"><div class="swatches">${Object.values(
            palette.design,
          )
            .map(
              (color) =>
                `<span style="background:${color}" title="${color}"></span>`,
            )
            .join("")}</div><span>${escape(palette.labels.pl)}</span></div>`,
      )
      .join("")}</div></article>`,
  );
}
layers.push({
  input: Buffer.from(
    '<svg width="1770" height="105"><text x="30" y="48" font-family="Arial" font-size="32" fill="#252b28">5 designów · 20 palet · wiele okazji</text><text x="30" y="82" font-family="Arial" font-size="17" fill="#52615b">Podglądy działającej aplikacji — jubileusz, warsztaty, spotkanie firmowe i urodziny</text></svg>',
  ),
  left: 0,
  top: 0,
});
await sharp({
  create: { width: 1800, height: 1110, channels: 3, background: "#eeefea" },
})
  .composite(layers)
  .png()
  .toFile(`${output}/overview.png`);
await writeFile(
  `${output}/index.html`,
  `<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nowe designy i palety</title><style>*{box-sizing:border-box}body{margin:0;padding:48px 5%;background:#f2f2ed;color:#25322d;font:16px/1.65 system-ui}header{max-width:1000px;margin-bottom:48px}h1{font-size:clamp(32px,5vw,64px);letter-spacing:-.045em;line-height:1.1}h2{font-size:30px;font-weight:500}a{color:inherit}article{background:white;padding:28px;margin:0 0 36px;border:1px solid #dde1d7}.screens{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr);gap:24px;height:650px;overflow:hidden}.screens a{display:block;overflow:auto;border:1px solid #eee}.screens img{width:100%;display:block}.palettes{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:28px}.swatches{display:flex;height:34px;margin-bottom:8px;border:1px solid #ddd}.swatches span{flex:1}.palette{font-size:14px}@media(max-width:650px){body{padding:24px 16px}article{padding:16px}.screens{height:450px;gap:12px;grid-template-columns:1fr 1fr}.palettes{grid-template-columns:repeat(2,1fr)}}</style><header><p>WYBRANE KIERUNKI · WERSJA W APLIKACJI</p><h1>Eleganckie zaproszenia.<br>Na różne okazje.</h1><p>Pięć wdrożonych lokalnie projektów i cztery palety dla każdego. Poniżej rzeczywiste zrzuty z renderera na komputerze i telefonie. Kliknij obraz, żeby otworzyć pełny rozmiar.</p><p>Palety wybierzesz w edytorze: <strong>Wygląd → Wersja kolorystyczna</strong>. Możesz także ustawić własne kolory. Przykłady i zdjęcia służą prezentacji.</p><a href="http://127.0.0.1:3000/demo">Otwórz edytor demonstracyjny ↗</a></header>${cards.join("")}<footer>Zdjęcie stołu: wygenerowane narzędziem imagegen. Wszystkie napisy i układy pochodzą z działającej aplikacji, a nie z makiety graficznej.</footer></html>`,
  "utf8",
);
console.log(`Saved ${output}/index.html and overview.png`);
