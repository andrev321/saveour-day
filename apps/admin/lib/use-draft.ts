"use client";
import { useRef, useState, type SetStateAction } from "react";
import { siteConfigSchema, type SiteConfig } from "@invitations/domain";

/** Canonical Draft history, tab-cache TTL, and structural repair policy. */
export const DRAFT_POLICY = Object.freeze({
  /** Rapid edits within this window coalesce onto the same undo checkpoint. */
  undoCoalesceMs: 500,
  /** Maximum undo stack depth retained in memory. */
  maxUndoDepth: 50,
  /** Tab sessionStorage recovery TTL (7 days in milliseconds). */
  tabRecoveryTtlMs: 7 * 86_400_000,
  /** Maximum string length eligible for placeholder repair during tab recovery. */
  maxRecoverableFieldLength: 6000,
});

const RECOVERY_REPLACEMENTS: Readonly<Record<string, string>> = Object.freeze({
  displayName: "Draft",
  title: "Draft",
  eyebrow: "Draft",
  dateLabel: "Draft",
  name: "Draft",
  label: "Draft",
  address: "Draft",
  description: "",
  url: "",
  phone: "+48111222333",
  date: "2030-01-01",
  time: "12:00",
});

/**
 * Three-way field-level Draft merge. Preserves non-overlapping remote and local
 * edits while reporting top-level SiteConfig keys where both diverged from base.
 */
export function mergeDraft(
  base: SiteConfig,
  local: SiteConfig,
  remote: SiteConfig,
) {
  const config = structuredClone(remote);
  const conflicts: (keyof SiteConfig)[] = [];
  const same = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);

  for (const key of Object.keys(local) as (keyof SiteConfig)[]) {
    if (same(local[key], base[key])) continue;
    if (!same(remote[key], base[key]) && !same(local[key], remote[key])) {
      conflicts.push(key);
    }
    Object.assign(config, { [key]: local[key] });
  }
  return { config, conflicts };
}

/**
 * Recovers a Draft with unfinished text or URL fields while still validating
 * the entire schema v3 structure.
 */
export function recoverDraft(value: unknown): SiteConfig | null {
  const parsed = siteConfigSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  let repaired: unknown;
  try {
    repaired = structuredClone(value);
  } catch {
    return null;
  }
  for (const issue of parsed.error.issues) {
    const key = issue.path.at(-1);
    if (typeof key !== "string" || !(key in RECOVERY_REPLACEMENTS)) return null;
    let node: unknown = repaired;
    for (const step of issue.path.slice(0, -1)) {
      if (!node || typeof node !== "object") return null;
      node = (node as Record<PropertyKey, unknown>)[step];
    }
    if (!node || typeof node !== "object") return null;
    const record = node as Record<string, unknown>;
    if (
      typeof record[key] !== "string" ||
      record[key].length > DRAFT_POLICY.maxRecoverableFieldLength
    )
      return null;
    record[key] = RECOVERY_REPLACEMENTS[key];
  }
  if (!siteConfigSchema.safeParse(repaired).success) return null;
  return structuredClone(value) as SiteConfig;
}

/**
 * Serializes an unsaved Draft into a bounded tab-storage snapshot envelope.
 */
export function createDraftTabSnapshot(
  config: SiteConfig,
  now = Date.now(),
): string {
  return JSON.stringify({
    config,
    expires: now + DRAFT_POLICY.tabRecoveryTtlMs,
  });
}

/**
 * Parses, validates, and repairs a tab-storage Draft snapshot. Returns the
 * recovered SiteConfig only when it belongs to `siteId`, has not expired,
 * passes structural repair, and differs from `persistedConfig`.
 */
export function parseDraftTabSnapshot(
  raw: string | null | undefined,
  siteId: string,
  persistedConfig: SiteConfig,
  now = Date.now(),
): SiteConfig | null {
  if (!raw) return null;
  try {
    const cache = JSON.parse(raw) as { config?: unknown; expires?: unknown };
    if (typeof cache?.expires !== "number" || cache.expires <= now) return null;
    const recovered = recoverDraft(cache.config);
    if (!recovered || recovered.id !== siteId) return null;
    if (JSON.stringify(recovered) === JSON.stringify(persistedConfig))
      return null;
    return recovered;
  } catch {
    return null;
  }
}

/**
 * Pure, deterministic undo/redo state machine for a SiteConfig Draft.
 */
export class DraftHistory {
  current: SiteConfig;
  private past: SiteConfig[] = [];
  private future: SiteConfig[] = [];
  private lastEdit = 0;

  constructor(initial: SiteConfig) {
    this.current = initial;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  set(next: SiteConfig, now = Date.now()): boolean {
    if (JSON.stringify(next) === JSON.stringify(this.current)) return false;
    if (now - this.lastEdit > DRAFT_POLICY.undoCoalesceMs) {
      this.past = [
        ...this.past.slice(-(DRAFT_POLICY.maxUndoDepth - 1)),
        this.current,
      ];
    }
    this.lastEdit = now;
    this.future = [];
    this.current = next;
    return true;
  }

  reset(next: SiteConfig): void {
    this.past = [];
    this.future = [];
    this.lastEdit = 0;
    this.current = next;
  }

  undo(): SiteConfig | null {
    const previous = this.past.pop();
    if (!previous) return null;
    this.future.push(this.current);
    this.current = previous;
    this.lastEdit = 0;
    return previous;
  }

  redo(): SiteConfig | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(this.current);
    this.current = next;
    this.lastEdit = 0;
    return next;
  }
}

/** The ref changes synchronously, so late network replies cannot replace new edits. */
export function useDraft(initial: SiteConfig) {
  const [config, update] = useState(initial);
  const [available, setAvailable] = useState({
    canUndo: false,
    canRedo: false,
  });
  const history = useRef<DraftHistory | null>(null);
  if (history.current == null) {
    history.current = new DraftHistory(initial);
  }
  const current = useRef(initial);

  function sync() {
    const h = history.current!;
    current.current = h.current;
    setAvailable({
      canUndo: h.canUndo,
      canRedo: h.canRedo,
    });
  }

  function setConfig(value: SetStateAction<SiteConfig>) {
    const h = history.current!;
    const next = typeof value === "function" ? value(h.current) : value;
    if (!h.set(next)) return;
    update(h.current);
    sync();
  }

  function reset(next: SiteConfig) {
    const h = history.current!;
    h.reset(next);
    update(next);
    sync();
  }

  function undo() {
    const previous = history.current!.undo();
    if (!previous) return;
    update(previous);
    sync();
  }

  function redo() {
    const next = history.current!.redo();
    if (!next) return;
    update(next);
    sync();
  }

  return { config, setConfig, reset, current, undo, redo, ...available };
}
