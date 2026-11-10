import fs from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";
import { importLegacy } from "../packages/domain/src/legacy.ts";
const [firstName, secondName, imagePath] = process.argv.slice(2);
if (!firstName || !secondName || !imagePath)
  throw new Error(
    'Usage: npm run import:legacy -- "Name 1" "Name 2" ".local/legacy-source/hero.jpg"',
  );
const config = importLegacy(parseEnv(await fs.readFile(".env.local", "utf8")), {
  firstName,
  secondName,
});
const sharp = (await import("sharp")).default;
const image = await sharp(imagePath)
  .rotate()
  .webp({ quality: 85 })
  .toBuffer({ resolveWithObject: true });
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
const localDir = path.resolve(".local");
const dir = path.join(localDir, "legacy");
await fs.mkdir(localDir, { recursive: true });
await fs.mkdir(dir);
try {
  await fs.mkdir(path.join(dir, "media"));
  await fs.writeFile(path.join(dir, "media", "hero.webp"), image.data);
  await fs.writeFile(
    path.join(dir, "site.json"),
    JSON.stringify(config, null, 2),
  );
} catch (error) {
  await fs.rm(dir, { recursive: true, force: true });
  throw error;
}
console.log("Wrote .local/legacy/site.json and .local/legacy/media/hero.webp.");
