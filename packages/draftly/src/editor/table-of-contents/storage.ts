import type { TocPanelState, TocStorageAdapter } from "./types";

function defaultStorage(): TocStorageAdapter | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function readTocPanelState(
  storageKey?: string,
  storage: TocStorageAdapter | null = defaultStorage()
): TocPanelState | null {
  if (!storageKey || !storage) return null;
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TocPanelState>;
    if (typeof parsed.expanded !== "boolean" || typeof parsed.width !== "number") return null;
    return { expanded: parsed.expanded, width: parsed.width };
  } catch {
    return null;
  }
}

export function writeTocPanelState(
  storageKey: string | undefined,
  state: TocPanelState,
  storage: TocStorageAdapter | null = defaultStorage()
): void {
  if (!storageKey || !storage) return;
  try {
    storage.setItem(storageKey, JSON.stringify({ expanded: state.expanded, width: state.width }));
  } catch {
    // Storage can fail in private mode or restricted host environments.
  }
}
