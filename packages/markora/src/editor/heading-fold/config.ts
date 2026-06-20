import type {
  MarkoraHeadingFoldConfig,
  MarkoraHeadingFoldLevel,
  ResolvedMarkoraHeadingFoldConfig,
} from "./types";

const minSupportedLevel = 2;
const maxSupportedLevel = 5;

function clampLevel(level: MarkoraHeadingFoldLevel): MarkoraHeadingFoldLevel {
  return Math.min(Math.max(level, minSupportedLevel), maxSupportedLevel) as MarkoraHeadingFoldLevel;
}

export function resolveHeadingFoldConfig(config: MarkoraHeadingFoldConfig = {}): ResolvedMarkoraHeadingFoldConfig {
  const requestedMinLevel = clampLevel(config.minLevel ?? minSupportedLevel);
  const requestedMaxLevel = clampLevel(config.maxLevel ?? maxSupportedLevel);
  const minLevel = Math.min(requestedMinLevel, requestedMaxLevel) as MarkoraHeadingFoldLevel;
  const maxLevel = Math.max(requestedMinLevel, requestedMaxLevel) as MarkoraHeadingFoldLevel;

  return {
    enabled: config.enabled !== false,
    minLevel,
    maxLevel,
  };
}
