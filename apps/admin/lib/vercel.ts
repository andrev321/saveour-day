import "server-only";
import { HttpError, required } from "./server";
export async function vercel(path: string, init: RequestInit = {}) {
  const url = new URL(`https://api.vercel.com${path}`);
  url.searchParams.set("teamId", required("VERCEL_TEAM_ID"));
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${required("VERCEL_TOKEN")}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new HttpError(
      502,
      "Vercel odrzucił operację. Sprawdź integrację i status w panelu operatora.",
    );
  return response.json();
}
export async function createProject(siteId: string) {
  return vercel("/v10/projects", {
    method: "POST",
    body: JSON.stringify({
      name: `invitation-${siteId}`,
      framework: "vite",
      buildCommand: "npm run build",
      outputDirectory: "apps/site/dist",
      installCommand: "npm ci",
    }),
  });
}
