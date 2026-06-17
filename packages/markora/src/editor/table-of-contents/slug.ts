import type { MarkoraTocConfig, ResolvedMarkoraTocConfig } from "./types";

const defaultMinWidth = 180;
const defaultMaxWidth = 360;
const defaultWidth = 240;

export function clampTocWidth(width: number, config: Pick<ResolvedMarkoraTocConfig, "minWidth" | "maxWidth">): number {
  return Math.min(Math.max(width, config.minWidth), config.maxWidth);
}

export function resolveTocConfig(config: MarkoraTocConfig = {}): ResolvedMarkoraTocConfig {
  const minWidth = Math.max(120, config.minWidth ?? defaultMinWidth);
  const maxWidth = Math.max(minWidth, config.maxWidth ?? defaultMaxWidth);
  const requestedMinLevel = config.minLevel ?? 2;
  const requestedMaxLevel = config.maxLevel ?? 6;
  const minLevel = requestedMinLevel <= requestedMaxLevel ? requestedMinLevel : requestedMaxLevel;
  const maxLevel = requestedMaxLevel >= requestedMinLevel ? requestedMaxLevel : requestedMinLevel;
  const resolved: ResolvedMarkoraTocConfig = {
    enabled: config.enabled !== false,
    minLevel,
    maxLevel,
    defaultExpanded: config.defaultExpanded !== false,
    defaultWidth,
    minWidth,
    maxWidth,
  };

  if (config.onTocChange) resolved.onTocChange = config.onTocChange;
  if (config.storageKey) resolved.storageKey = config.storageKey;
  resolved.defaultWidth = clampTocWidth(config.defaultWidth ?? defaultWidth, resolved);
  return resolved;
}

function normalizeHeadingText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function createTocSlugger(): (text: string) => string {
  const seen = new Map<string, number>();
  return (text: string) => {
    const base = normalizeHeadingText(text) || "heading";
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  };
}
