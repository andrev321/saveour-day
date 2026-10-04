import { siteConfigSchema, type SiteConfig } from "@invitations/domain";
/** Recover unfinished text fields while still validating the entire structure. */
export function recoverDraft(value: unknown): SiteConfig | null {
  const parsed = siteConfigSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  let repaired: unknown;
  try {
    repaired = structuredClone(value);
  } catch {
    return null;
  }
  const replacements: Record<string, string> = {
    displayName: "Draft",
    title: "Draft",
    eyebrow: "Draft",
    dateLabel: "Draft",
    name: "Draft",
    label: "Draft",
    address: "Draft",
    description: "",
    url: "",
    mapUrl: "",
    navigationUrl: "",
    phone: "+48111222333",
    date: "2030-01-01",
    time: "12:00",
  };
  for (const issue of parsed.error.issues) {
    const key = issue.path.at(-1);
    if (typeof key !== "string" || !(key in replacements)) return null;
    let node: unknown = repaired;
    for (const step of issue.path.slice(0, -1)) {
      if (!node || typeof node !== "object") return null;
      node = (node as Record<PropertyKey, unknown>)[step];
    }
    if (!node || typeof node !== "object") return null;
    const record = node as Record<string, unknown>;
    if (typeof record[key] !== "string" || record[key].length > 6000)
      return null;
    record[key] = replacements[key];
  }
  if (!siteConfigSchema.safeParse(repaired).success) return null;
  return structuredClone(value) as SiteConfig;
}
