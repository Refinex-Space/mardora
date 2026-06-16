export type MarkoraTocLevel = 2 | 3 | 4 | 5 | 6;

export interface MarkoraTocItem {
  id: string;
  level: MarkoraTocLevel;
  text: string;
  from?: number;
  to?: number;
  active: boolean;
}

export interface MarkoraTocConfig {
  enabled?: boolean;
  onTocChange?: (items: MarkoraTocItem[]) => void;
  minLevel?: MarkoraTocLevel;
  maxLevel?: MarkoraTocLevel;
  defaultExpanded?: boolean;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
}

export interface ResolvedMarkoraTocConfig {
  enabled: boolean;
  onTocChange?: (items: MarkoraTocItem[]) => void;
  minLevel: MarkoraTocLevel;
  maxLevel: MarkoraTocLevel;
  defaultExpanded: boolean;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  storageKey?: string;
}

export interface TocPanelState {
  expanded: boolean;
  width: number;
}

export interface TocStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
}
