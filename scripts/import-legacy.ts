import fs from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";
import { importLegacy } from "../packages/domain/src/legacy.ts";
const [firstName, secondName] = process.argv.slice(2);
if (!firstName || !secondName)
  throw new Error("Użycie: npm run import:legacy -- Imię1 Imię2");
const config = importLegacy(parseEnv(await fs.readFile(".env.local", "utf8")), {
  firstName,
  secondName,
});
const dir = path.resolve(".local/legacy");
await fs.mkdir(path.join(dir, "media"), { recursive: true });
const sharp = (await import("sharp")).default;
const image = await sharp("scripts/assets/legacy-wedding-bg.jpg")
  .rotate()
  .webp({ quality: 85 })
  .toBuffer({ resolveWithObject: true });
await fs.writeFile(path.join(dir, "media", "hero.webp"), image.data);
config.media = [
  {
    id: "hero",
    src: "/media/hero.webp",
    alt: "",
    width: image.info.width,
    height: image.info.height,
    variants: [],
  },
];
config.hero.mediaId = "hero";
await fs.writeFile(
  path.join(dir, "site.json"),
  JSON.stringify(config, null, 2),
  { flag: "wx" },
);
console.log(
  "Zapisano .local/legacy/site.json. Ustaw SITE_CONFIG=.local/legacy/site.json. Oryginalne .env.local nie zostało zmienione.",
);

