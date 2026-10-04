import type { SiteConfig } from "@invitations/domain";
export function mergeDraft(
  base: SiteConfig,
  local: SiteConfig,
  remote: SiteConfig,
) {
  const config = structuredClone(remote);
  const conflicts: (keyof SiteConfig)[] = [];
  for (const key of Object.keys(local) as (keyof SiteConfig)[]) {
    const same = (a: unknown, b: unknown) =>
      JSON.stringify(a) === JSON.stringify(b);
    if (same(local[key], base[key])) continue;
    if (!same(remote[key], base[key]) && !same(local[key], remote[key]))
      conflicts.push(key);
    Object.assign(config, { [key]: local[key] });
  }
  return { config, conflicts };
}
