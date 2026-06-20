export type MardoraTocLevel = 2 | 3 | 4 | 5 | 6;

export interface MardoraTocItem {
  id: string;
  level: MardoraTocLevel;
  text: string;
  from?: number;
  to?: number;
  active: boolean;
}

export interface MardoraTocConfig {
  enabled?: boolean;
  onTocChange?: (items: MardoraTocItem[]) => void;
  minLevel?: MardoraTocLevel;
  maxLevel?: MardoraTocLevel;
  defaultExpanded?: boolean;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
}

export interface ResolvedMardoraTocConfig {
  enabled: boolean;
  onTocChange?: (items: MardoraTocItem[]) => void;
  minLevel: MardoraTocLevel;
  maxLevel: MardoraTocLevel;
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
