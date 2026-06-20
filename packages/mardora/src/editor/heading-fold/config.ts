import type {
  MardoraHeadingFoldConfig,
  MardoraHeadingFoldLevel,
  ResolvedMardoraHeadingFoldConfig,
} from "./types";

const minSupportedLevel = 2;
const maxSupportedLevel = 5;

function clampLevel(level: MardoraHeadingFoldLevel): MardoraHeadingFoldLevel {
  return Math.min(Math.max(level, minSupportedLevel), maxSupportedLevel) as MardoraHeadingFoldLevel;
}

export function resolveHeadingFoldConfig(config: MardoraHeadingFoldConfig = {}): ResolvedMardoraHeadingFoldConfig {
  const requestedMinLevel = clampLevel(config.minLevel ?? minSupportedLevel);
  const requestedMaxLevel = clampLevel(config.maxLevel ?? maxSupportedLevel);
  const minLevel = Math.min(requestedMinLevel, requestedMaxLevel) as MardoraHeadingFoldLevel;
  const maxLevel = Math.max(requestedMinLevel, requestedMaxLevel) as MardoraHeadingFoldLevel;

  return {
    enabled: config.enabled !== false,
    minLevel,
    maxLevel,
  };
}
