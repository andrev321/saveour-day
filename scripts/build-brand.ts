import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import {
  brandArt,
  brandPalette,
  brandWidths,
  brandWordmarks,
  brandMotion,
} from "../packages/ui/src/brand-art";

const output = resolve("assets/brand");
await mkdir(output, { recursive: true });
for (const tone of ["light", "dark"] as const) {
  const p = brandPalette[tone];
  for (const variant of ["full", "mark"] as const) {
    for (const animated of [false, true]) {
      const name = `saveour-day-${variant}-on-${tone}${animated ? "-animated" : ""}`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${brandWidths[variant]} 124" width="${brandWidths[variant]}" height="124" role="img" aria-label="saveour.day"${animated ? ' class="sod-animated"' : ""}>
<title>saveour.day</title>${animated ? `<style>${brandMotion}</style>` : ""}
<g class="sod-back"><path d="${brandArt.backTop}" fill="${p.back}"/><path d="${brandArt.backSide}" fill="${p.side}"/></g>
<path class="sod-front" d="${brandArt.front}" fill="${p.front}"/>
${variant === "mark" ? "" : `<path transform="translate(140 0)" d="${brandWordmarks[variant].path}" fill="${p.ink}"/>`}</svg>`;
      await writeFile(resolve(output, `${name}.svg`), svg + "\n");
      if (!animated)
        await sharp(Buffer.from(svg))
          .resize({ height: variant === "mark" ? 1024 : 384 })
          .png()
          .toFile(resolve(output, `${name}.png`));
    }
  }
}
const p = brandPalette.light;
const tile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144"><rect width="144" height="144" rx="30" fill="#F8F7FC"/><g transform="translate(12 10)"><path d="${brandArt.backTop}" fill="${p.back}"/><path d="${brandArt.backSide}" fill="${p.side}"/><path d="${brandArt.front}" fill="${p.front}"/></g></svg>`;
await writeFile(resolve(output, "saveour-day-icon.svg"), tile + "\n");
for (const app of ["admin", "site"]) {
  await copyFile(
    resolve(output, "saveour-day-icon.svg"),
    resolve(`apps/${app}/app/icon.svg`),
  );
  await sharp(Buffer.from(tile))
    .resize(180, 180)
    .png()
    .toFile(resolve(`apps/${app}/app/apple-icon.png`));
}
await copyFile(
  resolve("node_modules/@fontsource/inter/LICENSE"),
  resolve(output, "FONT-LICENSE.txt"),
);
const rows = ["full", "mark"]
  .map(
    (variant) =>
      `<section><h2>${variant === "full" ? "Pełny napis" : "Sam znak"}</h2><div class="pair">${["light", "dark"].map((tone) => `<div class="tile ${tone}"><img src="saveour-day-${variant}-on-${tone}.svg" alt="saveour.day — ${variant}" style="height:${variant === "mark" ? 100 : 72}px"/><small>Na ${tone === "light" ? "jasne" : "ciemne"} tło</small></div>`).join("")}</div></section>`,
  )
  .join("");
await writeFile(
  resolve(output, "index.html"),
  `<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>saveour.day — zestaw marki</title><style>*{box-sizing:border-box}body{margin:0;padding:40px;font-family:system-ui,sans-serif;background:#efedf4;color:#242b59}main{max-width:1100px;margin:auto}h1{font-size:28px;margin-bottom:8px}p,small{color:#686c82}h2{font-size:14px;margin:28px 0 12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}.tile{min-height:180px;border-radius:16px;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:24px;gap:20px}.light{background:#fff}.dark{background:#171c36}.dark small{color:#b5bbd6}img{max-width:100%;object-fit:contain}button{margin:24px 0;padding:12px 20px;border:0;border-radius:8px;background:#242b59;color:white;cursor:pointer}button:focus-visible{outline:3px solid #758de5;outline-offset:3px}@media(max-width:700px){body{padding:20px}.pair{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.motion-note{display:block}}</style><main><h1>saveour.day</h1><p>Dwa elementy. Jedno zaproszenie. Warianty wektorowe i PNG z przezroczystym tłem.</p>${rows}<section><h2>Animacja · połączenie elementów</h2><div class="pair">${["light", "dark"].map((tone) => `<div class="tile ${tone}"><img data-animation src="saveour-day-full-on-${tone}-animated.svg" alt="saveour.day — animowane logo" style="height:80px"/><small>Jedno złożenie · 900 ms · respektuje ograniczenie ruchu</small></div>`).join("")}</div><button id="replay">Odtwórz ponownie</button></section></main><script>document.getElementById('replay').onclick=()=>document.querySelectorAll('[data-animation]').forEach(img=>{const url=img.src.split('?')[0];img.src=url+'?replay='+Date.now()})</script></html>`,
);
console.log(
  "Brand assets generated in assets/brand; application icons synchronized.",
);
