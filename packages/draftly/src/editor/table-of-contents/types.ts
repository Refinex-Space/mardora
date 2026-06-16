export type DraftlyTocLevel = 2 | 3 | 4 | 5 | 6;

export interface DraftlyTocItem {
  id: string;
  level: DraftlyTocLevel;
  text: string;
  from?: number;
  to?: number;
  active: boolean;
}

export interface DraftlyTocConfig {
  enabled?: boolean;
  onTocChange?: (items: DraftlyTocItem[]) => void;
  minLevel?: DraftlyTocLevel;
  maxLevel?: DraftlyTocLevel;
  defaultExpanded?: boolean;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
}

export interface ResolvedDraftlyTocConfig {
  enabled: boolean;
  onTocChange?: (items: DraftlyTocItem[]) => void;
  minLevel: DraftlyTocLevel;
  maxLevel: DraftlyTocLevel;
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
