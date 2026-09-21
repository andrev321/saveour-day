import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseSiteConfig,
  type SiteConfig,
} from "../../packages/domain/src/index.ts";
import { createDemo } from "../../packages/domain/src/demo.ts";

const root = fileURLToPath(new URL("../..", import.meta.url));
const maxMediaBytes = 8 * 1024 * 1024;

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );

const mediaSources = (config: SiteConfig) => [
  ...new Set(
    config.media.flatMap((media) => [
      media.src,
      ...media.variants.map((variant) => variant.src),
    ]),
  ),
];

async function inBatches<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  size = 6,
) {
  for (let start = 0; start < items.length; start += size) {
    await Promise.all(items.slice(start, start + size).map(worker));
  }
}

function ensureMediaSize(bytes: Uint8Array) {
  if (bytes.byteLength > maxMediaBytes)
    throw new Error("Zdjęcie przekracza limit");
}

export default defineConfig(async ({ command, mode }) => {
  const env = { ...loadEnv(mode, root, ""), ...process.env };
  const files = new Map<string, Uint8Array>();
  let config: SiteConfig;

  if (env.RELEASE_MANIFEST_URL) {
    const url = new URL(env.RELEASE_MANIFEST_URL);
    if (url.protocol !== "https:" || !env.RELEASE_TOKEN)
      throw new Error("Nieprawidłowy dostęp do wydania");

    const headers = { Authorization: `Bearer ${env.RELEASE_TOKEN}` };
    const response = await fetch(url, {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error("Nie można pobrać wydania");

    config = parseSiteConfig(await response.json());
    await inBatches(mediaSources(config), async (source) => {
      const mediaUrl = new URL(url);
      mediaUrl.searchParams.set("asset", source);
      const response = await fetch(mediaUrl, {
        headers,
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
      });
      if (
        !response.ok ||
        Number(response.headers.get("content-length")) > maxMediaBytes
      ) {
        throw new Error("Nie można pobrać zdjęcia wydania");
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      ensureMediaSize(bytes);
      files.set(source.slice(1), bytes);
    });
  } else if (env.SITE_CONFIG) {
    const configPath = path.resolve(root, env.SITE_CONFIG);
    config = parseSiteConfig(JSON.parse(await fs.readFile(configPath, "utf8")));
    const mediaRoot = path.resolve(path.dirname(configPath), "media");

    await inBatches(mediaSources(config), async (source) => {
      const mediaPath = path.resolve(mediaRoot, source.slice("/media/".length));
      if (!mediaPath.startsWith(`${mediaRoot}${path.sep}`))
        throw new Error("Nieprawidłowa ścieżka zdjęcia");
      const bytes = await fs.readFile(mediaPath);
      ensureMediaSize(bytes);
      files.set(source.slice(1), bytes);
    });
  } else if (
    env.CLIENT_ID === "demo-ivory" ||
    env.CLIENT_ID === "demo-sage" ||
    command === "serve"
  ) {
    config = createDemo(
      env.CLIENT_ID === "demo-sage" ? "demo-sage" : "demo-ivory",
    );
  } else {
    throw new Error(
      "Brak konfiguracji. Ustaw SITE_CONFIG, RELEASE_MANIFEST_URL lub jawnie CLIENT_ID=demo-ivory dla demonstracji.",
    );
  }

  const contentPlugin: Plugin = {
    name: "validated-site-config",
    resolveId(id) {
      return id === "virtual:site-config" ? "\0site-config" : undefined;
    },
    load(id) {
      return id === "\0site-config"
        ? `export default ${JSON.stringify(config)}`
        : undefined;
    },
    transformIndexHtml(html) {
      const { description, indexing, title } = config.metadata;
      return html.replace(
        "<title>Zaproszenie</title>",
        `<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}">${indexing ? "" : '<meta name="robots" content="noindex,nofollow">'}`,
      );
    },
    generateBundle() {
      for (const [fileName, source] of files)
        this.emitFile({ type: "asset", fileName, source });
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const key = request.url?.split("?")[0]?.slice(1);
        if (!key || !files.has(key)) return next();

        const contentType = key.endsWith(".png")
          ? "image/png"
          : key.endsWith(".jpg") || key.endsWith(".jpeg")
            ? "image/jpeg"
            : key.endsWith(".avif")
              ? "image/avif"
              : "image/webp";
        response.setHeader("Content-Type", contentType);
        response.end(files.get(key));
      });
    },
  };

  return {
    plugins: [react(), contentPlugin],
    publicDir: false as const,
    build: { sourcemap: false },
    server: { fs: { allow: [root] } },
  };
});
