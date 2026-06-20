export type MarkoraHeadingFoldLevel = 2 | 3 | 4 | 5;

export interface MarkoraHeadingFoldConfig {
  enabled?: boolean;
  minLevel?: MarkoraHeadingFoldLevel;
  maxLevel?: MarkoraHeadingFoldLevel;
}

export interface ResolvedMarkoraHeadingFoldConfig {
  enabled: boolean;
  minLevel: MarkoraHeadingFoldLevel;
  maxLevel: MarkoraHeadingFoldLevel;
}

export interface MarkoraHeadingFoldRange {
  level: MarkoraHeadingFoldLevel;
  text: string;
  headingFrom: number;
  headingTo: number;
  headingLineFrom: number;
  headingLineTo: number;
  foldFrom: number;
  foldTo: number;
}
