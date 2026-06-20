export type MardoraHeadingFoldLevel = 2 | 3 | 4 | 5;

export interface MardoraHeadingFoldConfig {
  enabled?: boolean;
  minLevel?: MardoraHeadingFoldLevel;
  maxLevel?: MardoraHeadingFoldLevel;
}

export interface ResolvedMardoraHeadingFoldConfig {
  enabled: boolean;
  minLevel: MardoraHeadingFoldLevel;
  maxLevel: MardoraHeadingFoldLevel;
}

export interface MardoraHeadingFoldRange {
  level: MardoraHeadingFoldLevel;
  text: string;
  headingFrom: number;
  headingTo: number;
  headingLineFrom: number;
  headingLineTo: number;
  foldFrom: number;
  foldTo: number;
}
